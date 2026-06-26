import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const engineerId = searchParams.get("engineerId");

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(phone ? { phone } : {}),
      ...(engineerId ? { assignedTo: Number(engineerId) } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      assignedUser: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, data: tickets });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ticketNo = "YL" + Date.now();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo,
        customer: body.customer || "未填写客户",
        contact: body.contact || "未填写联系人",
        phone: body.phone || "未填写电话",
        device: body.device || "未填写设备编号",
        project: body.project || "未填写项目",
        type: body.type || "其他问题",
        level: body.level || "普通",
        status: "待处理",
        description: body.description || "客户未填写具体描述",
        attachments: body.attachments || "[]",
      },
    });

    return NextResponse.json({ success: true, message: "工单提交成功", data: ticket });
  } catch (error) {
    console.error("创建工单失败：", error);
    return NextResponse.json({ success: false, message: "工单提交失败" }, { status: 500 });
  }
}
