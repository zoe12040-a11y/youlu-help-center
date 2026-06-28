import { NextResponse } from "next/server";
import { ossPresignedPutUrl, ossPublicUrl } from "../../../../lib/oss";

// Ticket attachments: images only (max 4 MB). Videos are NOT allowed.
const IMAGE_MAX = 4 * 1024 * 1024;    // 4 MB

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif"]);

const EXT_MAP: Record<string, string> = {
  ".jpg": ".jpg", ".jpeg": ".jpg",
  ".png": ".png", ".gif": ".gif",
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

    // Ticket attachments: IMAGES ONLY — reject videos explicitly
    const isVideo = contentType?.startsWith("video/") || /\.(mp4|mov|avi|webm|3gp)$/i.test(filename);
    if (isVideo) {
      return NextResponse.json(
        { success: false, message: "工单附件不支持上传视频，如需提供视频请直接发送给售后人员" },
        { status: 400 }
      );
    }

    const isImage = IMAGE_TYPES.has(contentType) || IMAGE_EXTS.has(ext);
    if (!isImage) {
      return NextResponse.json(
        { success: false, message: `不支持的文件类型（仅支持 jpg、png、gif 图片）` },
        { status: 400 }
      );
    }

    if (fileSize && fileSize > IMAGE_MAX) {
      return NextResponse.json(
        { success: false, message: `图片过大（最大 4 MB，当前 ${(fileSize / 1024 / 1024).toFixed(1)} MB）` },
        { status: 400 }
      );
    }

    const fileType: "image" | "video" = "image";
    // Resolve extension and content type
    const safeExt     = EXT_MAP[ext] ?? ".jpg";
    const resolvedType = (contentType && contentType !== "application/octet-stream")
      ? contentType
      : "image/jpeg";

    // Build safe object key
    const rand      = Math.random().toString(36).slice(2, 8);
    const objectKey = `tickets/${Date.now()}-${rand}${safeExt}`;

    // ossPresignedPutUrl uses Web Crypto (no url.parse deprecation)
    const uploadUrl = ossPresignedPutUrl(objectKey, resolvedType, 3600);
    const publicUrl = ossPublicUrl(objectKey);

    return NextResponse.json({ success: true, uploadUrl, objectKey, publicUrl, fileType });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[presign/upload] Error:", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
