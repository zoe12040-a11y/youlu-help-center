import { NextResponse } from "next/server";
import { ossPresignedPutUrl, ossPublicUrl } from "../../../../lib/oss";

const IMAGE_MAX = 20 * 1024 * 1024;   // 20 MB
const VIDEO_MAX = 500 * 1024 * 1024;  // 500 MB

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);

const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".webm", ".3gp", ".3g2"]);
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif"]);

const EXT_MAP: Record<string, string> = {
  ".jpg": ".jpg", ".jpeg": ".jpg",
  ".png": ".png", ".gif": ".gif",
  ".mp4": ".mp4", ".mov": ".mov",
  ".avi": ".avi", ".webm": ".webm",
  ".3gp": ".3gp", ".3g2": ".3g2",
};

/** POST /api/upload/presign
 *  Body: { filename: string, contentType: string, fileSize: number }
 *  Returns: { uploadUrl, objectKey, publicUrl, fileType: "image" | "video" }
 */
export async function POST(request: Request) {
  try {
    const { filename, contentType, fileSize } = await request.json();

    if (!filename) {
      return NextResponse.json({ success: false, message: "缺少 filename" }, { status: 400 });
    }

    const ext = (filename.match(/\.[^.]+$/) ?? [""])[0].toLowerCase();

    // Determine file type: image or video
    const isImage = IMAGE_TYPES.has(contentType) || IMAGE_EXTS.has(ext);
    const isVideo = VIDEO_EXTS.has(ext) ||
      (contentType?.startsWith("video/") && contentType !== "video/") ||
      contentType === "application/octet-stream" && VIDEO_EXTS.has(ext);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, message: `不支持的文件类型（${contentType || ext}）` },
        { status: 400 }
      );
    }

    const fileType: "image" | "video" = isImage ? "image" : "video";
    const maxBytes = fileType === "image" ? IMAGE_MAX : VIDEO_MAX;

    if (fileSize && fileSize > maxBytes) {
      const limitMB = maxBytes / 1024 / 1024;
      return NextResponse.json(
        { success: false, message: `文件超过大小限制（最大 ${limitMB} MB）` },
        { status: 400 }
      );
    }

    // Resolve extension and content type
    const safeExt     = EXT_MAP[ext] ?? (fileType === "image" ? ".jpg" : ".mp4");
    const resolvedType = (contentType && contentType !== "application/octet-stream")
      ? contentType
      : fileType === "image" ? "image/jpeg" : "video/mp4";

    // Build safe object key
    const rand      = Math.random().toString(36).slice(2, 8);
    const objectKey = `tickets/${Date.now()}-${rand}${safeExt}`;

    const uploadUrl = ossPresignedPutUrl(objectKey, resolvedType, 3600);
    const publicUrl = ossPublicUrl(objectKey);

    return NextResponse.json({ success: true, uploadUrl, objectKey, publicUrl, fileType });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[presign/upload] Error:", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
