import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED: Record<string, { ext: string; fileType: "image" | "video" }> = {
  "image/jpeg":     { ext: ".jpg",  fileType: "image" },
  "image/png":      { ext: ".png",  fileType: "image" },
  "image/gif":      { ext: ".gif",  fileType: "image" },
  "video/mp4":      { ext: ".mp4",  fileType: "video" },
  "video/quicktime":{ ext: ".mov",  fileType: "video" },
};

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB hard cap

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
        { success: false, message: `不支持的文件类型：${file.type}（仅支持 jpg/png/gif/mp4/mov）` },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, message: "文件超过 100 MB 限制" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads", "tickets");
    await mkdir(uploadDir, { recursive: true });

    // Filename: timestamp + random suffix + extension (no original filename to avoid path injection)
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${allowed.ext}`;
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/tickets/${filename}`,
      name: file.name,
      size: file.size,
      fileType: allowed.fileType,
    });
  } catch (error) {
    console.error("文件上传失败：", error);
    return NextResponse.json({ success: false, message: "文件上传失败" }, { status: 500 });
  }
}
