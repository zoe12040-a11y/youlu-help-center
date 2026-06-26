import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function PATCH(request: Request) {
  try {
    const { ids, status, operator, remark } = await request.json();

    if (!ids?.length || !status) {
      return NextResponse.json({ success: false, message: "缺少必要参数" }, { status: 400 });
    }

    const current = await prisma.ticket.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });

    await prisma.ticket.updateMany({ where: { id: { in: ids } }, data: { status } });

    await prisma.ticketLog.createMany({
      data: current.map((t) => ({
        ticketId: t.id,
        oldStatus: t.status,
        newStatus: status,
        operator: operator || "售后管理员",
        remark: remark || `批量更新状态为：${status}`,
      })),
    });

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (error) {
    console.error("批量更新失败：", error);
    return NextResponse.json({ success: false, message: "批量更新失败" }, { status: 500 });
  }
}
