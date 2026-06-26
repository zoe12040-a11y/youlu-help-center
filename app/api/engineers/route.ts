import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const engineers = await prisma.user.findMany({
      where: { role: "engineer", isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: engineers });
  } catch (error) {
    console.error("读取工程师列表失败：", error);
    return NextResponse.json({ success: false, message: "读取失败" }, { status: 500 });
  }
}
