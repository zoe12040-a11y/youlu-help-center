/**
 * Clean up Video table: keep only records pointing to Aliyun OSS
 * (youlu-service-videos.oss-cn-hangzhou.aliyuncs.com).
 * Delete everything else (old Supabase Storage URLs, duplicates).
 *
 * Run: npx tsx scripts/cleanup-db.ts
 *      Add --dry-run to preview without deleting
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry-run");

async function main() {
  const all = await prisma.video.findMany({ orderBy: { id: "asc" } });
  console.log(`\nTotal records: ${all.length}`);

  const OSS_DOMAIN = "oss-cn-hangzhou.aliyuncs.com";

  const keep   = all.filter((v) => v.fileUrl.includes(OSS_DOMAIN));
  const remove = all.filter((v) => !v.fileUrl.includes(OSS_DOMAIN));

  console.log(`Keep  (valid OSS):   ${keep.length}  — ids: ${keep.map((v) => v.id).join(", ")}`);
  console.log(`Delete (other URLs): ${remove.length} — ids: ${remove.map((v) => v.id).join(", ")}`);

  if (remove.length === 0) {
    console.log("\n✅ Nothing to delete — DB is already clean.");
    return;
  }

  if (DRY) {
    console.log("\n[DRY RUN] No changes made. Remove --dry-run to apply.");
    return;
  }

  // Delete non-OSS records
  const result = await prisma.video.deleteMany({
    where: {
      id: { in: remove.map((v) => v.id) },
    },
  });

  console.log(`\n✅ Deleted ${result.count} records.`);
  console.log(`✅ Remaining: ${keep.length} valid OSS records.`);

  // Show remaining by category
  const cats: Record<string, number> = {};
  for (const v of keep) {
    cats[v.category] = (cats[v.category] ?? 0) + 1;
  }
  console.log("\nRemaining by category:");
  for (const [cat, n] of Object.entries(cats).sort()) {
    console.log(`  ${cat}: ${n}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
