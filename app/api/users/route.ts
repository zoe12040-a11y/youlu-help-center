import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, phone: true, role: true, isActive: true, email: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("读取用户失败：", error);
    return NextResponse.json({ success: false, message: "读取用户失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Parse the full body first so we can access all fields including email
    const body = await request.json();
    const { name, phone, password, role, email: rawEmail } = body;

    console.log("[users/POST] payload:", { name, phone, role, hasPassword: !!password, email: rawEmail });

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ success: false, message: "名称和账号不能为空" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { phone: phone.trim() } });
    if (existing) {
      return NextResponse.json({ success: false, message: `账号「${phone}」已存在，请换一个账号` }, { status: 400 });
    }

    const email = rawEmail?.trim() || null;
    const hashedPassword = await bcrypt.hash(password || "123456", 10);
    const user = await prisma.user.create({
      data: { name: name.trim(), phone: phone.trim(), password: hashedPassword, role: role || "customer", isActive: true, email },
      select: { id: true, name: true, phone: true, role: true, isActive: true, email: true, createdAt: true },
    });

    console.log("[users/POST] created user id:", user.id);
    return NextResponse.json({ success: true, message: "账号创建成功", data: user });
  } catch (error) {
    // Surface the real error message for easier debugging
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[users/POST] error:", msg, error);

    // Prisma unique constraint violation (phone already taken despite pre-check)
    if (msg.includes("Unique constraint") || msg.includes("P2002")) {
      return NextResponse.json({ success: false, message: "该账号已存在（唯一性冲突）" }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, message: `创建失败：${msg}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, isActive, name, phone, password, role } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "缺少用户 ID" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (name?.trim()) updateData.name = name.trim();
    if (phone?.trim()) {
      // Check phone uniqueness (excluding current user)
      const existing = await prisma.user.findFirst({ where: { phone: phone.trim(), NOT: { id: Number(id) } } });
      if (existing) {
        return NextResponse.json({ success: false, message: "该账号已被其他用户使用" }, { status: 400 });
      }
      updateData.phone = phone.trim();
    }
    if (password?.trim()) updateData.password = await bcrypt.hash(password.trim(), 10);
    if (role) updateData.role = role;
    if ("email" in body) updateData.email = body.email?.trim() || null;

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: { id: true, name: true, phone: true, role: true, isActive: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, message: "更新成功", data: user });
  } catch (error) {
    console.error("更新用户失败：", error);
    return NextResponse.json({ success: false, message: "更新用户失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get("id");

    if (singleId) {
      // Single delete
      await prisma.user.delete({ where: { id: Number(singleId) } });
      return NextResponse.json({ success: true, message: "账号已删除" });
    }

    // Bulk delete — ids in request body
    const body = await request.json().catch(() => null);
    if (body?.ids?.length) {
      await prisma.user.deleteMany({ where: { id: { in: body.ids.map(Number) } } });
      return NextResponse.json({ success: true, message: `已删除 ${body.ids.length} 个账号` });
    }

    return NextResponse.json({ success: false, message: "缺少用户 ID" }, { status: 400 });
  } catch (error) {
    console.error("删除用户失败：", error);
    return NextResponse.json({ success: false, message: "删除用户失败" }, { status: 500 });
  }
}
