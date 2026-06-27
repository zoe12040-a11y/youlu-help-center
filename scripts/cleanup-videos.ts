/**
 * Clean up Video table:
 * 1. Delete duplicate / broken-old-URL records
 * 2. Fix Supabase Storage URLs for Chinese-path files (never uploaded) → static /videos/ paths
 * Run: cd project && npx tsx scripts/cleanup-videos.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// IDs to delete — duplicates or old /videos/encoded URLs superseded by better records
const DELETE_IDS = [
  23,  // duplicate fileUrl of id 2 (video_emergency_stop.mp4)
  25,  // old /videos/encoded URL → superseded by id 49
  26,  // duplicate fileUrl of id 5 (video_manual_clean.mp4)
  27,  // old /videos/encoded URL → superseded by id 51
  30,  // old /videos/encoded URL → superseded by id 52
  31,  // old /videos/encoded URL → superseded by id 53
  32,  // duplicate fileUrl of id 12 (video_task_send.mp4)
  33,  // old /videos/encoded URL → superseded by id 55
  34,  // old /videos/encoded URL → superseded by id 56
  35,  // old /videos/encoded URL → superseded by id 57
  36,  // old /videos/encoded URL → superseded by id 58
  40,  // 05APP配置变更/APP配置变更.mp4 — 0-byte file, never uploaded
  41,  // 05APP配置变更/尊享版.mp4 — 0-byte file, never uploaded
  45,  // 06APP登录及管理/子账户管理.mp4 — 0-byte, never uploaded
  46,  // 06APP登录及管理/所有反馈工单查看.mp4 — 0-byte, never uploaded
  47,  // 06APP登录及管理/账户通知配置.mp4 — 0-byte, never uploaded
];

// IDs whose Supabase Storage URL is broken (Chinese path → never uploaded)
// but the file IS served as a Vercel static asset at /videos/...
const FIX_URLS: [number, string][] = [
  // Root-level large files (skipped by migration due to size)
  [4,  "/videos/video_gear_2.mp4"],
  [6,  "/videos/video_reverse.mp4"],
  // 01拆箱及确认 — Chinese path, Invalid key in Storage, but in git
  [19, "/videos/01拆箱及确认/充电1.mp4"],
  [20, "/videos/01拆箱及确认/加水1.mp4"],
  [21, "/videos/01拆箱及确认/倾倒垃圾.mp4"],
  [22, "/videos/01拆箱及确认/垃圾车复位.mp4"],
  [23, "/videos/01拆箱及确认/急停按钮使用.mp4"],  // won't apply (23 is deleted)
  [24, "/videos/01拆箱及确认/刷卡关机.mp4"],
  [48, "/videos/01拆箱及确认/急停按钮使用.mp4"],
  // 02开机部署 — in git, not in Storage
  [28, "/videos/02开机部署/切换前进2挡.mp4"],
  [29, "/videos/02开机部署/切换前进挡位.mp4"],
  [49, "/videos/02开机部署/开机.mp4"],
  [50, "/videos/02开机部署/人工清扫模式.mp4"],
  [51, "/videos/02开机部署/倒车.mp4"],
  // 03任务下发及查看 — in git, not in Storage (Chinese path rejected)
  [52, "/videos/03任务下发及查看/APP任务管理.mp4"],
  [53, "/videos/03任务下发及查看/APP切换任务、暂停、返航.mp4"],
  [54, "/videos/03任务下发及查看/下发任务.mp4"],
  [55, "/videos/03任务下发及查看/待机状态 - 任务下发.mp4"],
  [56, "/videos/03任务下发及查看/暂停.mp4"],
  [57, "/videos/03任务下发及查看/自动充电状态 - 任务下发.mp4"],
  [58, "/videos/03任务下发及查看/返航.mp4"],
  // 04APP业务视图 — in git, not in Storage
  [37, "/videos/04APP业务视图/APP业务视图.mp4"],
  [38, "/videos/04APP业务视图/养成计划.mp4"],
  [39, "/videos/04APP业务视图/问题反馈.mp4"],
];

async function main() {
  console.log("=== Video DB Cleanup ===\n");

  // 1. Delete bad records
  console.log(`Deleting ${DELETE_IDS.length} records...`);
  for (const id of DELETE_IDS) {
    try {
      await prisma.video.delete({ where: { id } });
      console.log(`  ✓ Deleted id ${id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("not found") || msg.includes("does not exist")) {
        console.log(`  - Skip id ${id} (not found)`);
      } else {
        console.log(`  ✗ Error deleting id ${id}: ${msg}`);
      }
    }
  }

  // 2. Fix broken Supabase Storage URLs → static paths
  console.log(`\nFixing ${FIX_URLS.length} URLs...`);
  for (const [id, fileUrl] of FIX_URLS) {
    if (DELETE_IDS.includes(id)) continue; // already deleted
    try {
      await prisma.video.update({ where: { id }, data: { fileUrl } });
      console.log(`  ✓ id ${id} → ${fileUrl}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("not found") || msg.includes("does not exist")) {
        console.log(`  - Skip id ${id} (not found)`);
      } else {
        console.log(`  ✗ Error updating id ${id}: ${msg}`);
      }
    }
  }

  // 3. Final count
  const remaining = await prisma.video.groupBy({
    by: ["category"],
    _count: { id: true },
    orderBy: { category: "asc" },
  });
  console.log("\n=== Final DB state ===");
  for (const r of remaining) {
    console.log(`  ${r.category}: ${r._count.id} videos`);
  }
  const total = remaining.reduce((s, r) => s + r._count.id, 0);
  console.log(`  Total: ${total} videos`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
