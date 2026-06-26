import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: Number(id) },
      include: { logs: { orderBy: { createdAt: "desc" } } },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "工单不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    console.error("读取工单失败：", error);
    return NextResponse.json(
      { success: false, message: "读取工单失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const ticketId = Number(id);

    const current = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!current) {
      return NextResponse.json(
        { success: false, message: "工单不存在" },
        { status: 404 }
      );
    }

    // Build the update payload — only include fields present in the request
    type TicketUpdate = {
      status?: string;
      expectedAt?: Date | null;
      rating?: number | null;
      assignedTo?: number | null;
      assignedAt?: Date | null;
    };
    const updates: TicketUpdate = {};
    if (body.status) updates.status = body.status;
    if ("expectedAt" in body) {
      updates.expectedAt = body.expectedAt ? new Date(body.expectedAt) : null;
    }
    if ("rating" in body) {
      updates.rating = typeof body.rating === "number" ? body.rating : null;
    }
    if ("assignedTo" in body) {
      updates.assignedTo = body.assignedTo ? Number(body.assignedTo) : null;
      updates.assignedAt = body.assignedTo ? new Date() : null;
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updates,
    });

    // Log status changes
    if (body.status && body.status !== current.status) {
      await prisma.ticketLog.create({
        data: {
          ticketId,
          oldStatus: current.status,
          newStatus: body.status,
          operator: body.operator || "系统",
          remark: body.remark || `状态更新为：${body.status}`,
        },
      });
    }
    // Log assignment changes
    if ("assignedTo" in body) {
      const engineer = body.assignedTo
        ? await prisma.user.findUnique({ where: { id: Number(body.assignedTo) }, select: { name: true } })
        : null;
      await prisma.ticketLog.create({
        data: {
          ticketId,
          oldStatus: current.status,
          newStatus: current.status,
          operator: body.operator || "售后管理员",
          remark: engineer
            ? `工单已指派给工程师：${engineer.name}`
            : "已取消工程师指派",
        },
      });
    }

    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    console.error("更新工单失败：", error);
    return NextResponse.json(
      { success: false, message: "更新工单失败" },
      { status: 500 }
    );
  }
}
