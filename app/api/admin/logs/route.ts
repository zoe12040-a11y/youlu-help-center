import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || "200"), 500);

    const logs = await prisma.ticketLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        ticket: { select: { ticketNo: true, customer: true, type: true } },
      },
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("读取操作日志失败：", error);
    return NextResponse.json({ success: false, message: "读取失败" }, { status: 500 });
  }
}
