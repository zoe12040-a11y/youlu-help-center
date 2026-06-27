import { NextResponse } from "next/server";
import OSS from "ali-oss";
import { prisma } from "../../../../lib/prisma";

const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/avi",
  "video/x-msvideo",
  "video/webm",
  "video/ogg",
  "video/3gpp",
  "video/3gpp2",
  "application/octet-stream",
];

function getOSSClient() {
  const region = process.env.OSS_REGION;
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.OSS_BUCKET;

  if (!region || !accessKeyId || !accessKeySecret || !bucket) {
    const missing = [
      !region && "OSS_REGION",
      !accessKeyId && "OSS_ACCESS_KEY_ID",
      !accessKeySecret && "OSS_ACCESS_KEY_SECRET",
      !bucket && "OSS_BUCKET",
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(`缺少阿里云 OSS 环境变量：${missing}`);
  }

  return new OSS({ region, accessKeyId, accessKeySecret, bucket });
}

/** Build the public URL for an uploaded object */
function buildOSSUrl(objectKey: string): string {
  const bucket = process.env.OSS_BUCKET!;
  const region = process.env.OSS_REGION!;
  // Custom domain takes priority; falls back to default OSS endpoint
  const customDomain = process.env.OSS_CUSTOM_DOMAIN;
  if (customDomain) return `https://${customDomain}/${objectKey}`;
  // Default: https://BUCKET.REGION.aliyuncs.com/KEY
  return `https://${bucket}.${region}.aliyuncs.com/${objectKey}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
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

    const isVideoByMime = ACCEPTED_VIDEO_TYPES.includes(file.type);
    const isVideoByName = /\.(mp4|mov|avi|webm|ogv|3gp|3g2)$/i.test(file.name);
    if (!isVideoByMime && !isVideoByName) {
      return NextResponse.json(
        { success: false, message: `不支持的文件类型：${file.type || "unknown"}（${file.name}）` },
        { status: 400 }
      );
    }

    console.log(`[video-upload-oss] size=${file.size} type=${file.type} name=${file.name}`);

    const buffer = Buffer.from(await file.arrayBuffer());

    // OSS object key: tutorials/timestamp-safename.ext
    const cleanName = file.name.replace(/[^\w\-._]/g, "_");
    const objectKey = `tutorials/${Date.now()}-${cleanName}`;

    let client: OSS;
    try {
      client = getOSSClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[video-upload-oss] Config error:", msg);
      return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }

    // Upload to OSS — supports files of any size
    const result = await client.put(objectKey, buffer, {
      mime: file.type || "video/mp4",
      headers: {
        "Content-Type": file.type || "video/mp4",
        // Allow public read via bucket ACL; or use signed URL if bucket is private
        "x-oss-object-acl": "public-read",
      },
    });

    if (!result || result.res?.status >= 400) {
      const status = result?.res?.status;
      console.error("[video-upload-oss] Upload failed, status:", status);
      return NextResponse.json(
        { success: false, message: `OSS 上传失败（HTTP ${status}）` },
        { status: 500 }
      );
    }

    const fileUrl = buildOSSUrl(objectKey);
    console.log(`[video-upload-oss] success → ${fileUrl}`);

    const video = await prisma.video.create({
      data: { title, category, fileUrl, description },
    });

    return NextResponse.json({ success: true, message: "视频上传成功", data: video });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[video-upload-oss] Unexpected error:", msg);
    return NextResponse.json(
      { success: false, message: `上传失败：${msg}` },
      { status: 500 }
    );
  }
}
