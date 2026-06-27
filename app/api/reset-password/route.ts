import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

// GET — verify token validity (used by reset-password page on load)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ success: false, message: "缺少 token" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
    select: { id: true, name: true, phone: true },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, message: "链接已失效或已使用，请重新申请" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, name: user.name, phone: user.phone });
}

// POST — set new password
export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ success: false, message: "缺少必要参数" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: "新密码至少 6 位" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "链接已失效或已使用，请重新申请" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true, message: "密码已重置，请使用新密码登录" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[reset-password] Error:", msg);
    return NextResponse.json({ success: false, message: `操作失败：${msg}` }, { status: 500 });
  }
}
