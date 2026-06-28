/**
 * Batch upload local videos from public/videos/ to Aliyun OSS,
 * then upsert Video records in the database.
 *
 * Run: npx tsx scripts/upload-videos.ts
 * Requires: .env with OSS_REGION, OSS_BUCKET, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET
 *           and DATABASE_URL pointing to Supabase (port 6543 must be accessible)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import OSS from "ali-oss";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// ── Category rules — checked in order, first match wins ──────────────────────
// Key = substring to look for in the full relative path (case-insensitive)
const CATEGORY_RULES: [string, string][] = [
  // Folder-based rules first
  ["01拆箱及确认/开机",      "开机部署"],
  ["01拆箱及确认/充电",      "充电操作"],
  ["01拆箱及确认/加水",      "加水操作"],
  ["01拆箱及确认/倾倒垃圾",  "倾倒垃圾"],
  ["01拆箱及确认/垃圾",      "倾倒垃圾"],
  ["01拆箱及确认/刷卡",      "开机部署"],
  ["01拆箱及确认/急停",      "开机部署"],
  ["02开机部署",             "开机部署"],
  ["03任务下发及查看/返航",  "返航操作"],
  ["03任务下发及查看/app切换", "返航操作"],
  ["03任务下发及查看",       "任务下发"],
  ["04app业务视图",          "APP业务视图"],
  ["05app配置变更",          "APP配置变更"],
  ["06app登录及管理",        "APP登录及管理"],
  // Filename patterns (root-level video_ files)
  ["video_start",            "开机部署"],
  ["video_emergency",        "开机部署"],
  ["video_gear",             "开机部署"],
  ["video_manual",           "开机部署"],
  ["video_reverse",          "开机部署"],
  ["video_charging",         "充电操作"],
  ["video_water",            "加水操作"],
  ["video_dump_trash",       "倾倒垃圾"],
  ["video_trash",            "倾倒垃圾"],
  ["video_task",             "任务下发"],
  ["video_pause",            "任务下发"],
  ["video_return",           "返航操作"],
  ["video_app_switch",       "返航操作"],
];

function categoryFor(relPath: string): string {
  const lower = relPath.toLowerCase().replace(/\\/g, "/");
  for (const [key, cat] of CATEGORY_RULES) {
    if (lower.includes(key.toLowerCase())) return cat;
  }
  return "其他";
}

/** Human-readable title from a filename */
function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.mp4$/i, "")
    .replace(/^video_/, "")
    .replace(/[_-]+/g, " ")
    .trim() || filename;
}

/** Recursively collect .mp4 files */
function collectMp4(dir: string, base = ""): { fullPath: string; relPath: string }[] {
  const results: { fullPath: string; relPath: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMp4(full, rel));
    } else if (entry.name.toLowerCase().endsWith(".mp4")) {
      const stat = fs.statSync(full);
      if (stat.size > 0) results.push({ fullPath: full, relPath: rel });
      else console.log(`  SKIP (0 bytes): ${rel}`);
    }
  }
  return results;
}

async function main() {
  const BUCKET = process.env.OSS_BUCKET!;
  const REGION = process.env.OSS_REGION!;
  const VIDEOS_DIR = path.join(process.cwd(), "public", "videos");

  if (!BUCKET || !REGION || !process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_ACCESS_KEY_SECRET) {
    console.error("Missing OSS env vars. Check .env for OSS_REGION, OSS_BUCKET, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET");
    process.exit(1);
  }

  const oss = new OSS({
    region: REGION.startsWith("oss-") ? REGION : `oss-${REGION}`,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
    bucket: BUCKET,
  });

  const normalizedRegion = REGION.startsWith("oss-") ? REGION : `oss-${REGION}`;

  function ossPublicUrl(objectKey: string) {
    return `https://${BUCKET}.${normalizedRegion}.aliyuncs.com/${objectKey}`;
  }

  // ── 1. Get existing video URLs from DB ──────────────────────────────────
  const existingVideos = await prisma.video.findMany({ select: { id: true, fileUrl: true, title: true } });
  const existingUrls   = new Set(existingVideos.map((v) => v.fileUrl));
  const existingTitles = new Set(existingVideos.map((v) => v.title));
  console.log(`\nDB has ${existingVideos.length} video records.`);

  // ── 2. Detect and clean duplicate DB records ────────────────────────────
  const urlCount: Record<string, number[]> = {};
  for (const v of existingVideos) {
    if (!urlCount[v.fileUrl]) urlCount[v.fileUrl] = [];
    urlCount[v.fileUrl].push(v.id);
  }
  let deletedDups = 0;
  for (const [, ids] of Object.entries(urlCount)) {
    if (ids.length > 1) {
      // Keep the highest id (most recent), delete the rest
      const toDelete = ids.slice(0, -1);
      await prisma.video.deleteMany({ where: { id: { in: toDelete } } });
      deletedDups += toDelete.length;
      console.log(`  Deleted ${toDelete.length} duplicate(s) for url shared by ids [${ids.join(",")}]`);
    }
  }
  if (deletedDups > 0) console.log(`✓ Cleaned ${deletedDups} duplicate DB records`);

  // ── 3. Scan local files ─────────────────────────────────────────────────
  if (!fs.existsSync(VIDEOS_DIR)) {
    console.log(`\npublic/videos/ not found — skipping local file scan`);
    console.log("Script complete (only ran DB cleanup).");
    await prisma.$disconnect();
    return;
  }

  const files = collectMp4(VIDEOS_DIR);
  console.log(`\nFound ${files.length} local .mp4 files to process.\n`);

  let uploaded = 0;
  let skipped  = 0;
  let dbAdded  = 0;
  let errors   = 0;

  for (const { fullPath, relPath } of files) {
    const objectKey  = `tutorials/${relPath}`;
    const publicUrl  = ossPublicUrl(objectKey);
    const category   = categoryFor(relPath);
    const filename   = path.basename(relPath);
    const title      = titleFromFilename(filename);

    // Skip if this exact URL is already in DB
    if (existingUrls.has(publicUrl)) {
      console.log(`  SKIP (already in DB): ${relPath}`);
      skipped++;
      continue;
    }

    // Upload to OSS
    try {
      const buffer = fs.readFileSync(fullPath);
      await oss.put(objectKey, buffer, {
        mime: "video/mp4",
        headers: { "Content-Type": "video/mp4" },
      });
      uploaded++;
      console.log(`  ✓ Uploaded [${category}] ${relPath}`);
    } catch (ossErr) {
      const msg = ossErr instanceof Error ? ossErr.message : String(ossErr);
      console.error(`  ✗ OSS upload failed: ${relPath} — ${msg}`);
      errors++;
      continue;
    }

    // Write to DB
    try {
      await prisma.video.create({
        data: { title, category, fileUrl: publicUrl, description: "" },
      });
      existingUrls.add(publicUrl); // prevent re-insert if duplicate file found
      dbAdded++;
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error(`  ✗ DB insert failed for ${relPath} — ${msg}`);
    }
  }

  console.log(`
════════════════════════════════════
  Duplicate DB records deleted : ${deletedDups}
  OSS uploads succeeded        : ${uploaded}
  OSS uploads skipped (in DB)  : ${skipped}
  DB records added             : ${dbAdded}
  Errors                       : ${errors}
════════════════════════════════════`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
