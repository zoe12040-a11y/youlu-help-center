import { NextResponse } from "next/server";
import { getOSSClient, ossPublicUrl } from "../../../../lib/oss";

const ACCEPTED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/avi",
  "video/x-msvideo",
  "video/webm",
  "video/ogg",
  "video/3gpp",
  "video/3gpp2",
  "application/octet-stream",
]);

export async function POST(request: Request) {
  // ── Step 0: Diagnose env vars (visible in Vercel Function Logs) ──────────────
  console.log("[presign/videos] ENV check:", {
    region:    process.env.OSS_REGION    ?? "MISSING",
    bucket:    process.env.OSS_BUCKET    ?? "MISSING",
    hasKey:    !!process.env.OSS_ACCESS_KEY_ID,
    hasSecret: !!process.env.OSS_ACCESS_KEY_SECRET,
  });

  // ── Step 1: Guard — fail fast with a clear message if env vars are absent ──
  const missing = [
    !process.env.OSS_REGION          && "OSS_REGION",
    !process.env.OSS_BUCKET          && "OSS_BUCKET",
    !process.env.OSS_ACCESS_KEY_ID     && "OSS_ACCESS_KEY_ID",
    !process.env.OSS_ACCESS_KEY_SECRET && "OSS_ACCESS_KEY_SECRET",
  ].filter(Boolean);

  if (missing.length > 0) {
    const msg = `服务器缺少环境变量：${missing.join(", ")}（请在 Vercel → Settings → Environment Variables 中添加）`;
    console.error("[presign/videos] Missing env:", missing.join(", "));
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { filename, contentType } = body as { filename?: string; contentType?: string };

    if (!filename) {
      return NextResponse.json({ success: false, message: "缺少 filename 参数" }, { status: 400 });
    }

    const validType =
      ACCEPTED_VIDEO_TYPES.has(contentType ?? "") ||
      /\.(mp4|mov|avi|webm|ogv|3gp|3g2)$/i.test(filename);

    if (!validType) {
      return NextResponse.json(
        { success: false, message: `不支持的文件类型：${contentType ?? "unknown"}（${filename}）` },
        { status: 400 }
      );
    }

    // Build safe ASCII object key
    const cleanName = filename.replace(/[^\w\-._]/g, "_");
    const objectKey = `tutorials/${Date.now()}-${cleanName}`;

    // ── Step 2: Create OSS client ───────────────────────────────────────────
    let client;
    try {
      client = getOSSClient();
      console.log("[presign/videos] OSS client created OK");
    } catch (clientErr) {
      const msg = clientErr instanceof Error ? clientErr.message : String(clientErr);
      console.error("[presign/videos] Client creation failed:", msg);
      return NextResponse.json({ success: false, message: `OSS 客户端初始化失败：${msg}` }, { status: 500 });
    }

    // ── Step 3: Generate presigned URL ─────────────────────────────────────
    // NOTE: We do NOT include Content-Type in the signature.
    // This avoids an ali-oss v6 compatibility issue and lets the browser
    // set any Content-Type in the PUT request freely.
    let uploadUrl: string;
    try {
      uploadUrl = client.signatureUrl(objectKey, {
        expires: 3600,
        method:  "PUT",
      });
      console.log("[presign/videos] Signed URL generated, objectKey:", objectKey);
    } catch (signErr) {
      const msg = signErr instanceof Error ? signErr.message : String(signErr);
      console.error("[presign/videos] signatureUrl failed:", msg);
      return NextResponse.json({ success: false, message: `生成签名 URL 失败：${msg}` }, { status: 500 });
    }

    const publicUrl = ossPublicUrl(objectKey);
    return NextResponse.json({ success: true, uploadUrl, objectKey, publicUrl });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[presign/videos] Unexpected error:", msg);
    return NextResponse.json({ success: false, message: `接口错误：${msg}` }, { status: 500 });
  }
}
