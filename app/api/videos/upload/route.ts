import { NextResponse } from "next/server";
import { ossUpload, ossPublicUrl } from "../../../../lib/oss";
import { prisma } from "../../../../lib/prisma";

// Allow up to 300 s for large video uploads (App Router timeout)
export const maxDuration = 300;

const ACCEPTED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/avi",
  "video/x-msvideo",
  "video/webm",
  "video/ogg",
  "video/3gpp",
  "video/3gpp2",
  "application/octet-stream", // some mobile browsers
]);

export async function POST(request: Request) {
  // Guard: check OSS env vars before touching file data
  const missing = [
    !process.env.OSS_REGION          && "OSS_REGION",
    !process.env.OSS_ACCESS_KEY_ID     && "OSS_ACCESS_KEY_ID",
    !process.env.OSS_ACCESS_KEY_SECRET && "OSS_ACCESS_KEY_SECRET",
    !process.env.OSS_BUCKET            && "OSS_BUCKET",
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error("[video-upload] Missing OSS env:", missing.join(", "));
    return NextResponse.json(
      { success: false, message: `服务器配置错误：缺少环境变量 ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  try {
    const formData    = await request.formData();
    const title       = String(formData.get("title")       || "");
    const category    = String(formData.get("category")    || "未分类");
    const description = String(formData.get("description") || "");
    const file        = formData.get("file") as File | null;

    if (!title || !file) {
      return NextResponse.json(
        { success: false, message: "视频标题和视频文件不能为空" },
        { status: 400 }
      );
    }

    const validType =
      ACCEPTED_VIDEO_TYPES.has(file.type) ||
      /\.(mp4|mov|avi|webm|ogv|3gp|3g2)$/i.test(file.name);

    if (!validType) {
      return NextResponse.json(
        { success: false, message: `不支持的文件类型：${file.type || "unknown"}（${file.name}）` },
        { status: 400 }
      );
    }

    console.log(`[video-upload] size=${file.size} type=${file.type} name=${file.name}`);

    const bytes = new Uint8Array(await file.arrayBuffer());

    // Build OSS object key — sanitise filename to ASCII-safe characters
    const cleanName = file.name.replace(/[^\w\-._]/g, "_");
    const objectKey = `tutorials/${Date.now()}-${cleanName}`;

    // Upload — ali-oss supports files of any size (100 MB+)
    const fileUrl = await ossUpload(objectKey, bytes, file.type || "video/mp4");
    console.log(`[video-upload] uploaded → ${fileUrl}`);

    const video = await prisma.video.create({
      data: { title, category, fileUrl, description },
    });

    return NextResponse.json({ success: true, message: "视频上传成功", data: video });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[video-upload] Error:", msg);
    return NextResponse.json({ success: false, message: `上传失败：${msg}` }, { status: 500 });
  }
}

// Export for use in admin page if needed
export { ossPublicUrl };
