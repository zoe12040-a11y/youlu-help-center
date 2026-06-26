import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
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
        {
          success: false,
          message: "视频标题和视频文件不能为空",
        },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".mp4")) {
      return NextResponse.json(
        {
          success: false,
          message: "当前仅支持上传 mp4 视频文件",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "videos");
    await mkdir(uploadDir, { recursive: true });

    const safeFileName =
      Date.now() + "-" + file.name.replaceAll(" ", "-").replaceAll("/", "-");

    const filePath = path.join(uploadDir, safeFileName);
    await writeFile(filePath, buffer);

    const fileUrl = "/uploads/videos/" + safeFileName;

    const video = await prisma.video.create({
      data: {
        title,
        category,
        fileUrl,
        description,
      },
    });

    return NextResponse.json({
      success: true,
      message: "视频上传成功",
      data: video,
    });
  } catch (error) {
    console.error("上传视频失败：", error);

    return NextResponse.json(
      {
        success: false,
        message: "上传视频失败",
      },
      { status: 500 }
    );
  }
}
