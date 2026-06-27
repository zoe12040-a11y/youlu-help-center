import { NextResponse } from "next/server";
import { getSupabaseAdmin, STORAGE_BUCKET } from "../../../../lib/supabase";
import { prisma } from "../../../../lib/prisma";

// Accepted video MIME types — broaden beyond just mp4 for mobile compatibility
const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",   // .mov
  "video/avi",
  "video/x-msvideo",   // .avi
  "video/webm",
  "video/ogg",
  "video/3gpp",        // common on Android
  "video/3gpp2",
  "application/octet-stream", // some mobile browsers send this for video files
];

export async function POST(request: Request) {
  // ── Environment variable guard ──────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[video-upload] Missing env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      {
        success: false,
        message: "服务器配置错误：缺少 Supabase 环境变量（SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）",
      },
      { status: 500 }
    );
  }

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

    // Accept any video type; fall back gracefully when MIME type is octet-stream
    const isVideoByMime = ACCEPTED_VIDEO_TYPES.includes(file.type);
    const isVideoByName = /\.(mp4|mov|avi|webm|ogv|3gp|3g2)$/i.test(file.name);
    if (!isVideoByMime && !isVideoByName) {
      return NextResponse.json(
        {
          success: false,
          message: `不支持的文件类型：${file.type || "unknown"}（文件名：${file.name}）`,
        },
        { status: 400 }
      );
    }

    console.log(`[video-upload] bucket=${STORAGE_BUCKET} size=${file.size} type=${file.type} name=${file.name}`);

    const buffer = new Uint8Array(await file.arrayBuffer());

    // Build a safe ASCII storage path (replace non-ASCII/special chars, keep extension)
    const cleanName = file.name.replace(/[^\w\-._]/g, "_");
    const safeFileName = `tutorials/${Date.now()}-${cleanName}`;

    const supabase = getSupabaseAdmin();

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(safeFileName, buffer, { contentType: file.type || "video/mp4", upsert: true });

    if (uploadError) {
      console.error("[video-upload] Storage error:", JSON.stringify(uploadError));
      return NextResponse.json(
        {
          success: false,
          message: `Storage 上传失败：${uploadError.message}`,
          detail: uploadError,
        },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(safeFileName);
    console.log(`[video-upload] success → ${publicUrl}`);

    const video = await prisma.video.create({
      data: { title, category, fileUrl: publicUrl, description },
    });

    return NextResponse.json({ success: true, message: "视频上传成功", data: video });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[video-upload] Unexpected error:", msg);
    return NextResponse.json(
      { success: false, message: `上传失败：${msg}` },
      { status: 500 }
    );
  }
}
