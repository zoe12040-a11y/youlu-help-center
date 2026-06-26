import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phone = body.phone;
    const password = body.password;

    if (!phone || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "请输入账号和密码",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        phone,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "账号不存在",
        },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "账号已被禁用，请联系管理员",
        },
        { status: 403 }
      );
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      return NextResponse.json(
        {
          success: false,
          message: "密码错误",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "登录成功",
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("登录失败：", error);

    return NextResponse.json(
      {
        success: false,
        message: "登录失败",
      },
      { status: 500 }
    );
  }
}
