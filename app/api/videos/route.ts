import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    console.error("读取视频失败：", error);

    return NextResponse.json(
      {
        success: false,
        message: "读取视频失败",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = body.title;
    const category = body.category || "未分类";
    const fileUrl = body.fileUrl;
    const description = body.description || "";

    if (!title || !fileUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "视频标题和视频地址不能为空",
        },
        { status: 400 }
      );
    }

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
      message: "视频创建成功",
      data: video,
    });
  } catch (error) {
    console.error("创建视频失败：", error);

    return NextResponse.json(
      {
        success: false,
        message: "创建视频失败",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少视频 ID",
        },
        { status: 400 }
      );
    }

    await prisma.video.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "视频删除成功",
    });
  } catch (error) {
    console.error("删除视频失败：", error);

    return NextResponse.json(
      {
        success: false,
        message: "删除视频失败",
      },
      { status: 500 }
    );
  }
}
