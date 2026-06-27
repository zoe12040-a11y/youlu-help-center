import { NextResponse } from "next/server";
import { getSupabaseAdmin, STORAGE_BUCKET } from "../../../../lib/supabase";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const title = String(formData.get("title") || "");
    const category = String(formData.get("category") || "未分类");
    const description = String(formData.get("description") || "");
    const file = formData.get("file") as File | null;

    if (!title || !file) {
      return NextResponse.json(
        { success: false, message: "视频标题和视频文件不能为空" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".mp4")) {
      return NextResponse.json(
        { success: false, message: "当前仅支持上传 mp4 视频文件" },
        { status: 400 }
      );
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    // Use safe ASCII filename to avoid Storage path issues
    const safeFileName = `tutorials/${Date.now()}-${file.name.replace(/[^\w\-._]/g, "_")}`;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(safeFileName, buffer, { contentType: "video/mp4", upsert: true });

    if (error) {
      console.error("Storage upload error:", error.message);
      return NextResponse.json({ success: false, message: "视频上传失败" }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(safeFileName);

    const video = await prisma.video.create({
      data: { title, category, fileUrl: publicUrl, description },
    });

    return NextResponse.json({ success: true, message: "视频上传成功", data: video });
  } catch (error) {
    console.error("上传视频失败：", error);
    return NextResponse.json({ success: false, message: "上传视频失败" }, { status: 500 });
  }
}
