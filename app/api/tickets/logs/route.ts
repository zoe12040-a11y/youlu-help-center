import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = Number(searchParams.get("id"));

    if (!ticketId) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少工单 ID",
        },
        { status: 400 }
      );
    }

    const logs = await prisma.ticketLog.findMany({
      where: {
        ticketId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error("读取工单处理记录失败：", error);

    return NextResponse.json(
      {
        success: false,
        message: "读取工单处理记录失败",
      },
      { status: 500 }
    );
  }
}
