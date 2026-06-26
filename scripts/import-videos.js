/**
 * Scans public/videos/ and upserts all .mp4 files into the Video table.
 * Run with: node scripts/import-videos.js
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// ── Root-level video_ files: category + display title ─────────────────────
const ROOT_VIDEO_MAP = {
  video_start_1:           { category: "开机部署",  title: "开机操作" },
  video_emergency_stop:    { category: "开机部署",  title: "急停按钮使用" },
  video_gear_1:            { category: "开机部署",  title: "切换前进挡位（一挡）" },
  video_gear_2:            { category: "开机部署",  title: "切换前进挡位（二挡）" },
  video_manual_clean:      { category: "开机部署",  title: "人工清扫模式" },
  video_reverse:           { category: "开机部署",  title: "倒车操作" },
  video_charging:          { category: "充电操作",  title: "充电操作演示" },
  video_water:             { category: "加水操作",  title: "加水操作演示" },
  video_dump_trash:        { category: "倾倒垃圾",  title: "倾倒垃圾操作" },
  video_trash_reset:       { category: "倾倒垃圾",  title: "垃圾车复位操作" },
  video_task_manage:       { category: "任务下发",  title: "APP 任务管理" },
  video_task_send:         { category: "任务下发",  title: "下发任务" },
  video_task_auto_charge:  { category: "任务下发",  title: "自动充电状态下发任务" },
  video_task_standby:      { category: "任务下发",  title: "待机状态下发任务" },
  video_pause:             { category: "任务下发",  title: "暂停操作" },
  video_return:            { category: "返航操作",  title: "返航操作" },
  video_app_switch_return: { category: "返航操作",  title: "APP 切换任务与返航" },
};

// ── 01拆箱及确认: per-file category ───────────────────────────────────────
const UNBOX_FILE_CATEGORY = {
  "开机1.mp4":       "开机部署",
  "充电1.mp4":       "充电操作",
  "加水1.mp4":       "加水操作",
  "倾倒垃圾.mp4":    "倾倒垃圾",
  "垃圾车复位.mp4":  "倾倒垃圾",
  "急停按钮使用.mp4":"开机部署",
  "刷卡关机.mp4":    "开机部署",
};

// ── Subfolder number → category name ──────────────────────────────────────
function getFolderMeta(folderName, filename) {
  if (folderName.startsWith("01")) {
    return {
      category: UNBOX_FILE_CATEGORY[filename] ?? "开机部署",
      section: "拆箱及确认",
    };
  }
  if (folderName.startsWith("02")) {
    return { category: "开机部署", section: "开机部署" };
  }
  if (folderName.startsWith("03")) {
    const isReturn =
      filename.includes("返航") || filename.includes("APP切换");
    return {
      category: isReturn ? "返航操作" : "任务下发",
      section: "任务下发及查看",
    };
  }
  if (folderName.startsWith("04")) {
    return { category: "APP业务视图", section: "APP业务视图" };
  }
  if (folderName.startsWith("05")) {
    return { category: "APP配置变更", section: "APP配置变更" };
  }
  if (folderName.startsWith("06")) {
    return { category: "APP登录及管理", section: "APP登录及管理" };
  }
  return { category: "其他", section: folderName };
}

// ── URL builder ────────────────────────────────────────────────────────────
function buildUrl(...parts) {
  return "/videos/" + parts.map(encodeURIComponent).join("/");
}

async function main() {
  const videosDir = path.join(process.cwd(), "public", "videos");
  const toImport = [];

  // 1. Root-level video_ files (skip Chinese-named duplicates)
  for (const entry of fs.readdirSync(videosDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".mp4")) continue;
    const key = entry.name.replace(/\.mp4$/i, "");
    if (!key.startsWith("video_")) continue; // skip Chinese-named root files
    const meta = ROOT_VIDEO_MAP[key];
    if (!meta) {
      console.warn(`  ⚠ Unknown root video: ${entry.name}`);
      continue;
    }
    toImport.push({
      title: meta.title,
      category: meta.category,
      fileUrl: buildUrl(entry.name),
      description: "",
    });
  }

  // 2. Subfolder .mp4 files
  for (const dir of fs.readdirSync(videosDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const subDir = path.join(videosDir, dir.name);

    for (const file of fs.readdirSync(subDir, { withFileTypes: true })) {
      if (!file.isFile() || !file.name.toLowerCase().endsWith(".mp4")) continue;
      const { category, section } = getFolderMeta(dir.name, file.name);
      toImport.push({
        title: file.name.replace(/\.mp4$/i, ""),
        category,
        fileUrl: buildUrl(dir.name, file.name),
        description: section,
      });
    }
  }

  console.log(`\nScanned ${toImport.length} video files.`);

  // Fetch existing fileUrls to skip duplicates
  const existing = await prisma.video.findMany({ select: { fileUrl: true } });
  const existingUrls = new Set(existing.map((v) => v.fileUrl));

  let created = 0;
  let skipped = 0;
  for (const video of toImport) {
    if (existingUrls.has(video.fileUrl)) {
      skipped++;
      continue;
    }
    await prisma.video.create({ data: video });
    created++;
    console.log(`  ✓ [${video.category}] ${video.title}`);
  }

  console.log(`\n✅ Done — created: ${created}, skipped (already exists): ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
