import { NextResponse } from "next/server";
import { ossPublicUrl } from "../../../../lib/oss";
import { prisma } from "../../../../lib/prisma";

/** POST /api/videos/confirm
 *  Called after a successful direct PUT to OSS.
 *  Body: { objectKey, title, category, description }
 *  Writes the video record to DB and returns it.
 */
export async function POST(request: Request) {
  try {
    const { objectKey, title, category, description } = await request.json();

    if (!objectKey || !title) {
      return NextResponse.json(
        { success: false, message: "缺少 objectKey 或 title" },
        { status: 400 }
      );
    }

    const fileUrl = ossPublicUrl(objectKey);

    const video = await prisma.video.create({
      data: {
        title,
        category: category || "未分类",
        fileUrl,
        description: description || "",
      },
    });

    console.log(`[confirm/videos] Created video #${video.id} → ${fileUrl}`);

    return NextResponse.json({ success: true, message: "视频已保存", data: video });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[confirm/videos] Error:", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
