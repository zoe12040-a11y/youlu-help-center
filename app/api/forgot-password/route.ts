import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "../../../lib/prisma";

function generateToken(): string {
  const array = new Uint8Array(32);
  globalThis.crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone?.trim()) {
      return NextResponse.json({ success: false, message: "请输入账号" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone: phone.trim() } });

    if (!user) {
      return NextResponse.json({ success: false, message: "账号不存在" }, { status: 404 });
    }

    if (!user.email) {
      return NextResponse.json(
        {
          success: false,
          message: "该账号未绑定邮箱，请联系管理员在后台用户管理中添加邮箱后再使用此功能",
        },
        { status: 400 }
      );
    }

    // Generate secure token + 1-hour expiry
    const token = generateToken();
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    const appUrl = (process.env.APP_URL ?? "https://www.youlu-service.com").replace(/\/$/, "");
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[forgot-password] Missing RESEND_API_KEY");
      return NextResponse.json(
        { success: false, message: "邮件服务未配置（缺少 RESEND_API_KEY）" },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "有鹿机器人服务系统 <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject: "重置密码 — 有鹿机器人客户服务系统",
      html: `
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <tr><td style="background:#1d4ed8;padding:32px 32px 24px;">
          <p style="margin:0;color:#bfdbfe;font-size:13px;">有鹿机器人客户服务系统</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">重置您的密码</h1>
        </td></tr>

        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#374151;font-size:15px;">您好，<strong>${user.name}</strong></p>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
            我们收到了账号 <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px;">${user.phone}</code> 的密码重置请求。<br/>
            点击下方按钮设置新密码，<strong>链接有效期 1 小时</strong>。
          </p>

          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:8px 0 28px;">
            <a href="${resetLink}"
               style="display:inline-block;background:#2563eb;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;">
              重置密码
            </a>
          </td></tr></table>

          <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">按钮无法点击？复制以下链接到浏览器：</p>
          <p style="margin:0 0 24px;word-break:break-all;font-size:12px;">
            <a href="${resetLink}" style="color:#2563eb;">${resetLink}</a>
          </p>

          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
            如果您没有申请重置密码，请忽略此邮件，您的账号仍然安全。<br/>
            此链接将在 1 小时后自动失效。
          </p>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">有鹿机器人客户服务系统 · 自动发送，请勿回复</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    if (error) {
      console.error("[forgot-password] Resend error:", error);
      return NextResponse.json(
        { success: false, message: `邮件发送失败：${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `重置链接已发送至 ${maskEmail(user.email)}，请在 1 小时内完成重置`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[forgot-password] Error:", msg);
    return NextResponse.json({ success: false, message: `操作失败：${msg}` }, { status: 500 });
  }
}
