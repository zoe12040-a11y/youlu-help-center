/**
 * Upload public/videos/video_*.mp4 to Supabase Storage and update DB.
 * Constraints: ASCII paths only, ≤50 MB per file (free tier limit).
 * Run: node scripts/migrate-to-storage.js
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "videos";
const VIDEOS_DIR = path.join(process.cwd(), "public", "videos");
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB free-tier limit

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Only ASCII-safe filename (no Chinese characters)
function isAsciiSafe(s) {
  return /^[\x20-\x7E]+$/.test(s);
}

async function main() {
  // 1. Ensure bucket exists
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (bucketErr && !bucketErr.message.toLowerCase().includes("already exist")) {
    console.log(`  bucket note: ${bucketErr.message}`);
  }
  console.log(`✓ bucket "${BUCKET}" ready\n`);

  // 2. Read current DB records
  const { data: dbVideos, error: dbErr } = await supabase.from("Video").select("id, fileUrl, title");
  if (dbErr) { console.error("DB error:", dbErr.message); process.exit(1); }
  console.log(`Found ${dbVideos.length} DB records`);

  const urlToId = {};
  for (const v of dbVideos) urlToId[v.fileUrl] = v.id;

  // 3. Collect root-level ASCII .mp4 files only
  const files = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".mp4") && isAsciiSafe(e.name))
    .map((e) => ({
      fullPath: path.join(VIDEOS_DIR, e.name),
      relPath: e.name,
    }));

  console.log(`Found ${files.length} ASCII root-level mp4 files\n`);

  let uploaded = 0, skipped = 0, dbUpdated = 0, errors = 0;

  for (const { fullPath, relPath } of files) {
    const stat = fs.statSync(fullPath);
    if (stat.size === 0) { console.log(`  SKIP (0 bytes): ${relPath}`); skipped++; continue; }
    if (stat.size > MAX_BYTES) {
      console.log(`  SKIP (${(stat.size / 1024 / 1024).toFixed(0)} MB > 50 MB): ${relPath}`);
      skipped++;
      continue;
    }

    // Upload
    const buffer = fs.readFileSync(fullPath);
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(relPath, buffer, { contentType: "video/mp4", upsert: true });

    if (upErr) { console.error(`  ✗ ${relPath}: ${upErr.message}`); errors++; continue; }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(relPath);
    uploaded++;

    // Match DB record: old URL was /videos/filename or possibly existing Storage URL
    const oldSimple = `/videos/${relPath}`;
    const id = urlToId[oldSimple] ?? urlToId[publicUrl];

    if (id !== undefined) {
      const { error: updErr } = await supabase.from("Video").update({ fileUrl: publicUrl }).eq("id", id);
      if (updErr) { console.error(`  ✗ DB update ${relPath}: ${updErr.message}`); }
      else { dbUpdated++; console.log(`  ✓ ${relPath}  →  ${publicUrl.split("/").pop()}`); }
    } else {
      console.log(`  ↑ uploaded (no DB match): ${relPath}`);
    }
  }

  // Also list which Chinese-path files are skipped
  const chineseFiles = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".mp4") && !isAsciiSafe(e.name));
  if (chineseFiles.length > 0) {
    console.log(`\n  NOTE: ${chineseFiles.length} Chinese-named root files skipped (Storage doesn't support non-ASCII keys):`);
    chineseFiles.forEach((e) => console.log(`    - ${e.name}`));
  }

  console.log(`
════════════════════════════════════
  Uploaded  : ${uploaded}
  DB updated: ${dbUpdated}
  Skipped   : ${skipped}
  Errors    : ${errors}
════════════════════════════════════`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
