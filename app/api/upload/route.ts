import { NextResponse } from "next/server";
import { getSupabaseAdmin, STORAGE_BUCKET } from "../../../lib/supabase";

const ALLOWED: Record<string, { ext: string; fileType: "image" | "video" }> = {
  "image/jpeg":      { ext: ".jpg", fileType: "image" },
  "image/png":       { ext: ".png", fileType: "image" },
  "image/gif":       { ext: ".gif", fileType: "image" },
  "video/mp4":       { ext: ".mp4", fileType: "video" },
  "video/quicktime": { ext: ".mov", fileType: "video" },
};

const MAX_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "未选择文件" }, { status: 400 });
    }

    const allowed = ALLOWED[file.type];
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: `不支持的文件类型（仅支持 jpg/png/gif/mp4/mov）` },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, message: "文件超过 100 MB 限制" }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const storagePath = `tickets/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${allowed.ext}`;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });

    if (error) {
      console.error("Storage upload error:", error.message);
      return NextResponse.json({ success: false, message: "文件上传失败" }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      name: file.name,
      size: file.size,
      fileType: allowed.fileType,
    });
  } catch (error) {
    console.error("文件上传失败：", error);
    return NextResponse.json({ success: false, message: "文件上传失败" }, { status: 500 });
  }
}
