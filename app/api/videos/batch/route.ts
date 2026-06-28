import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

/** POST /api/videos/batch
 *  Body: { videos: [{ title, category, fileUrl, description? }] }
 *  Creates multiple Video records in one request.
 */
export async function POST(request: Request) {
  try {
    const { videos } = await request.json();

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json(
        { success: false, message: "请提供视频列表" },
        { status: 400 }
      );
    }

    const toCreate = videos.filter(
      (v: { title?: string; fileUrl?: string }) => v.title?.trim() && v.fileUrl?.trim()
    );

    if (toCreate.length === 0) {
      return NextResponse.json(
        { success: false, message: "所有条目都缺少标题或URL" },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(
      toCreate.map((v: { title: string; category?: string; fileUrl: string; description?: string }) =>
        prisma.video.create({
          data: {
            title:       v.title.trim(),
            category:    v.category?.trim() || "未分类",
            fileUrl:     v.fileUrl.trim(),
            description: v.description?.trim() || "",
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `成功导入 ${created.length} 个视频`,
      data: created,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[batch-import] Error:", msg);
    return NextResponse.json({ success: false, message: `导入失败：${msg}` }, { status: 500 });
  }
}
