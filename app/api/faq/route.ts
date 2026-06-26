import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const faqs = await prisma.faq.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ success: true, data: faqs });
  } catch (error) {
    console.error("读取 FAQ 失败：", error);
    return NextResponse.json(
      { success: false, message: "读取 FAQ 失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const faq = await prisma.faq.create({
      data: {
        question: body.question,
        answer: body.answer,
        category: body.category || "其他",
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: faq });
  } catch (error) {
    console.error("创建 FAQ 失败：", error);
    return NextResponse.json(
      { success: false, message: "创建 FAQ 失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, increment, ...data } = body;

    // Dedicated increment path — avoids sending back full object
    if (increment === "clickCount") {
      await prisma.faq.update({
        where: { id: Number(id) },
        data: { clickCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true });
    }

    const faq = await prisma.faq.update({
      where: { id: Number(id) },
      data,
    });

    return NextResponse.json({ success: true, data: faq });
  } catch (error) {
    console.error("更新 FAQ 失败：", error);
    return NextResponse.json(
      { success: false, message: "更新 FAQ 失败" },
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
        { success: false, message: "缺少 FAQ ID" },
        { status: 400 }
      );
    }

    await prisma.faq.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除 FAQ 失败：", error);
    return NextResponse.json(
      { success: false, message: "删除 FAQ 失败" },
      { status: 500 }
    );
  }
}
