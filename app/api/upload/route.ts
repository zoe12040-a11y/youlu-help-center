import { NextResponse } from "next/server";
import { ossUpload } from "../../../lib/oss";

const ALLOWED: Record<string, { ext: string; fileType: "image" | "video" }> = {
  "image/jpeg":       { ext: ".jpg", fileType: "image" },
  "image/png":        { ext: ".png", fileType: "image" },
  "image/gif":        { ext: ".gif", fileType: "image" },
  "video/mp4":        { ext: ".mp4", fileType: "video" },
  "video/quicktime":  { ext: ".mov", fileType: "video" },
  "video/avi":        { ext: ".avi", fileType: "video" },
  "video/x-msvideo":  { ext: ".avi", fileType: "video" },
  "video/webm":       { ext: ".webm", fileType: "video" },
  "video/3gpp":       { ext: ".3gp", fileType: "video" },
  "video/3gpp2":      { ext: ".3g2", fileType: "video" },
};

// 100 MB for images; no hard cap on videos (OSS handles large files natively)
const IMAGE_MAX = 20 * 1024 * 1024;   // 20 MB
const VIDEO_MAX = 500 * 1024 * 1024;  // 500 MB

export async function POST(request: Request) {
  // Guard: check OSS env vars first
  const missing = [
    !process.env.OSS_REGION          && "OSS_REGION",
    !process.env.OSS_ACCESS_KEY_ID     && "OSS_ACCESS_KEY_ID",
    !process.env.OSS_ACCESS_KEY_SECRET && "OSS_ACCESS_KEY_SECRET",
    !process.env.OSS_BUCKET            && "OSS_BUCKET",
  ].filter(Boolean);

  if (missing.length > 0) {
    return NextResponse.json(
      { success: false, message: `服务器配置错误：缺少环境变量 ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "未选择文件" }, { status: 400 });
    }

    // Try exact MIME type; fall back to extension-based detection
    let allowed = ALLOWED[file.type];
    if (!allowed) {
      const ext = (file.name.match(/\.[^.]+$/) ?? [""])[0].toLowerCase();
      const byExt: Record<string, typeof allowed> = {
        ".jpg": { ext: ".jpg", fileType: "image" },
        ".jpeg": { ext: ".jpg", fileType: "image" },
        ".png": { ext: ".png", fileType: "image" },
        ".gif": { ext: ".gif", fileType: "image" },
        ".mp4": { ext: ".mp4", fileType: "video" },
        ".mov": { ext: ".mov", fileType: "video" },
        ".avi": { ext: ".avi", fileType: "video" },
        ".webm": { ext: ".webm", fileType: "video" },
        ".3gp": { ext: ".3gp", fileType: "video" },
      };
      allowed = byExt[ext];
    }

    if (!allowed) {
      return NextResponse.json(
        { success: false, message: `不支持的文件类型（仅支持图片和视频）` },
        { status: 400 }
      );
    }

    const maxBytes = allowed.fileType === "image" ? IMAGE_MAX : VIDEO_MAX;
    if (file.size > maxBytes) {
      const limitMB = Math.round(maxBytes / 1024 / 1024);
      return NextResponse.json(
        { success: false, message: `文件超过大小限制（${allowed.fileType === "image" ? "图片最大 20 MB" : `视频最大 ${limitMB} MB`}）` },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    // OSS object key: tickets/timestamp-randomhex.ext
    const objectKey = `tickets/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${allowed.ext}`;

    const url = await ossUpload(objectKey, bytes, file.type || "application/octet-stream");
    console.log(`[attachment-upload] ${allowed.fileType} → ${url}`);

    return NextResponse.json({
      success: true,
      url,
      name: file.name,
      size: file.size,
      fileType: allowed.fileType,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[attachment-upload] Error:", msg);
    return NextResponse.json({ success: false, message: `上传失败：${msg}` }, { status: 500 });
  }
}
