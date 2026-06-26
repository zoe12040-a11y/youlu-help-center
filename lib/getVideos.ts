import fs from "fs";
import path from "path";

export type VideoFile = { url: string; name: string };

// Human-readable names for the known video_ prefixed files
const DISPLAY_NAMES: Record<string, string> = {
  video_start_1:            "开机操作",
  video_charging:           "充电操作",
  video_water:              "加水操作",
  video_dump_trash:         "倾倒垃圾",
  video_trash_reset:        "垃圾车复位",
  video_task_manage:        "APP 任务管理",
  video_task_send:          "下发任务",
  video_task_auto_charge:   "自动充电状态下发任务",
  video_task_standby:       "待机状态下发任务",
  video_return:             "返航操作",
  video_app_switch_return:  "APP 切换任务与返航",
  video_pause:              "暂停操作",
  video_manual_clean:       "人工清扫模式",
  video_emergency_stop:     "急停按钮使用",
  video_reverse:            "倒车操作",
  video_gear_1:             "切换挡位（一挡）",
  video_gear_2:             "切换挡位（二挡）",
};

// Keywords per tutorial slug — matched against lower-cased filename (no extension)
const SLUG_KEYWORDS: Record<string, string[]> = {
  start:    ["start", "开机", "emergency", "急停", "gear", "挡位", "reverse", "倒车", "manual", "人工"],
  charging: ["charging", "充电"],
  water:    ["water", "加水"],
  trash:    ["trash", "dump", "垃圾", "倾倒"],
  task:     ["task", "任务", "下发", "standby", "pause", "暂停", "manage"],
  return:   ["return", "返航", "switch"],
};

function toDisplayName(filename: string): string {
  const key = filename.replace(/\.mp4$/i, "");
  if (DISPLAY_NAMES[key]) return DISPLAY_NAMES[key];
  // Chinese-named files: strip number suffix like (1) (2) but keep the rest
  return key.replace(/\(\d+\)$/, "").trim() || key;
}

/**
 * Scan the root of public/videos/ (non-recursive) for .mp4 files matching
 * the keywords for the given tutorial slug. Subdirectories are intentionally
 * skipped to avoid serving the same content twice from the numbered folders.
 */
export function getVideosBySlug(slug: string): VideoFile[] {
  const videosDir = path.join(process.cwd(), "public", "videos");
  if (!fs.existsSync(videosDir)) return [];

  const keywords = SLUG_KEYWORDS[slug] ?? [];
  const results: VideoFile[] = [];

  for (const entry of fs.readdirSync(videosDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".mp4")) continue;

    const lower = entry.name.toLowerCase();
    if (!keywords.some((kw) => lower.includes(kw.toLowerCase()))) continue;

    // Use encodeURIComponent for the filename so Chinese chars & parens are safe
    results.push({
      url: "/videos/" + encodeURIComponent(entry.name),
      name: toDisplayName(entry.name),
    });
  }

  // Dedup: if any video_ prefixed files matched, drop Chinese-named duplicates.
  // Chinese-named files (e.g. 充电(1).mp4) are re-exports of the same content.
  const hasVideoPrefix = results.some((v) => v.url.includes("video_"));
  const deduped = hasVideoPrefix
    ? results.filter((v) => v.url.includes("video_"))
    : results;

  // Sort video_ files by their key order in DISPLAY_NAMES for a logical sequence
  const nameOrder = Object.keys(DISPLAY_NAMES);
  deduped.sort((a, b) => {
    const aKey = decodeURIComponent(a.url.split("/").pop() ?? "").replace(/\.mp4$/i, "");
    const bKey = decodeURIComponent(b.url.split("/").pop() ?? "").replace(/\.mp4$/i, "");
    return nameOrder.indexOf(aKey) - nameOrder.indexOf(bKey);
  });

  return deduped;
}
