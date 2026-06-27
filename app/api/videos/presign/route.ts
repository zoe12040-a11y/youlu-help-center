import { NextResponse } from "next/server";
import { ossPresignedPutUrl, ossPublicUrl } from "../../../../lib/oss";

const ACCEPTED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/avi",
  "video/x-msvideo",
  "video/webm",
  "video/ogg",
  "video/3gpp",
  "video/3gpp2",
  "application/octet-stream",
]);

/** POST /api/videos/presign
 *  Body: { filename: string, contentType: string }
 *  Returns: { uploadUrl, objectKey, publicUrl }
 */
export async function POST(request: Request) {
  try {
    const { filename, contentType } = await request.json();

    if (!filename) {
      return NextResponse.json({ success: false, message: "缺少 filename" }, { status: 400 });
    }

    const resolvedType = contentType && contentType !== "application/octet-stream"
      ? contentType
      : "video/mp4"; // fallback for browsers that report octet-stream

    const validType =
      ACCEPTED_VIDEO_TYPES.has(contentType) ||
      /\.(mp4|mov|avi|webm|ogv|3gp|3g2)$/i.test(filename);

    if (!validType) {
      return NextResponse.json(
        { success: false, message: `不支持的文件类型：${contentType}（${filename}）` },
        { status: 400 }
      );
    }

    // Build safe ASCII object key
    const cleanName = filename.replace(/[^\w\-._]/g, "_");
    const objectKey  = `tutorials/${Date.now()}-${cleanName}`;

    // Generate presigned PUT URL valid for 1 hour
    const uploadUrl = ossPresignedPutUrl(objectKey, resolvedType, 3600);
    const publicUrl = ossPublicUrl(objectKey);

    return NextResponse.json({ success: true, uploadUrl, objectKey, publicUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[presign/videos] Error:", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
