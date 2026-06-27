import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, operator, remark } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "缺少工单 ID 或状态" },
        { status: 400 }
      );
    }

    const ticketId = Number(id);
    const current = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!current) {
      return NextResponse.json(
        { success: false, message: "工单不存在" },
        { status: 404 }
      );
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
    });

    // Only write a log entry when the status actually changes
    if (status !== current.status) {
      await prisma.ticketLog.create({
        data: {
          ticketId,
          oldStatus: current.status,
          newStatus: status,
          operator: operator || "售后管理员",
          remark: remark || `状态更新为：${status}`,
        },
      });
    }

    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    console.error("更新工单状态失败：", error);
    return NextResponse.json(
      { success: false, message: "更新工单状态失败" },
      { status: 500 }
    );
  }
}
