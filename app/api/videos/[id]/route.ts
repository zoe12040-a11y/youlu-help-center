import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getOSSClient } from "../../../../lib/oss";

/** DELETE /api/videos/[id]
 *  Deletes the video record from the database AND the file from OSS (best-effort).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = Number(id);

    if (!videoId || isNaN(videoId)) {
      return NextResponse.json({ success: false, message: "无效的视频 ID" }, { status: 400 });
    }

    // Get video record to find the OSS object key
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ success: false, message: "视频不存在" }, { status: 404 });
    }

    // ── Delete from OSS (best-effort, don't fail if OSS delete fails) ──────
    const ossErrors: string[] = [];
    const fileUrl = video.fileUrl;

    // Only attempt OSS deletion for aliyuncs.com URLs
    if (fileUrl && fileUrl.includes(".aliyuncs.com")) {
      try {
        const url       = new URL(fileUrl);
        const objectKey = decodeURIComponent(url.pathname.slice(1)); // remove leading /
        const client    = getOSSClient();
        await client.delete(objectKey);
        console.log(`[video-delete] OSS object deleted: ${objectKey}`);
      } catch (ossErr) {
        const msg = ossErr instanceof Error ? ossErr.message : String(ossErr);
        console.error("[video-delete] OSS delete failed (continuing):", msg);
        ossErrors.push(msg);
      }
    } else if (fileUrl && fileUrl.startsWith("/videos/")) {
      // Static file — skip OSS deletion (file is in git, not OSS)
      console.log("[video-delete] Static URL, skipping OSS deletion:", fileUrl);
    }

    // ── Delete from database ─────────────────────────────────────────────
    await prisma.video.delete({ where: { id: videoId } });
    console.log(`[video-delete] DB record deleted: id=${videoId}`);

    return NextResponse.json({
      success: true,
      message: ossErrors.length > 0
        ? `数据库记录已删除，OSS 文件删除失败（${ossErrors[0]}）`
        : "视频已删除（数据库 + OSS）",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[video-delete] Error:", msg);
    return NextResponse.json({ success: false, message: `删除失败：${msg}` }, { status: 500 });
  }
}
