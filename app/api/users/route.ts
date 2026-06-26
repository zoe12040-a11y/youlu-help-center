import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("读取用户失败：", error);

    return NextResponse.json(
      {
        success: false,
        message: "读取用户失败",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name;
    const phone = body.phone;
    const password = body.password || "123456";
    const role = body.role || "customer";

    if (!name || !phone) {
      return NextResponse.json(
        {
          success: false,
          message: "客户名称和账号不能为空",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        phone,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "该账号已存在",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        password: hashedPassword,
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "用户创建成功",
      data: user,
    });
  } catch (error) {
    console.error("创建用户失败：", error);

    return NextResponse.json(
      {
        success: false,
        message: "创建用户失败",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id);
    const isActive = body.isActive;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "缺少用户 ID 或启用状态",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: isActive ? "账号已启用" : "账号已禁用",
      data: user,
    });
  } catch (error) {
    console.error("更新用户状态失败：", error);

    return NextResponse.json(
      {
        success: false,
        message: "更新用户状态失败",
      },
      { status: 500 }
    );
  }
}
