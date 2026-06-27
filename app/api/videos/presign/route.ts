import { NextResponse } from "next/server";
import { ossPresignedPutUrl, ossPublicUrl } from "../../../../lib/oss";

/** GET /api/videos/presign — Health check */
export async function GET() {
  return NextResponse.json({
    route: "ok",
    env: {
      OSS_REGION:            process.env.OSS_REGION          ? "✅ set" : "❌ MISSING",
      OSS_BUCKET:            process.env.OSS_BUCKET          ? "✅ set" : "❌ MISSING",
      OSS_ACCESS_KEY_ID:     process.env.OSS_ACCESS_KEY_ID   ? "✅ set" : "❌ MISSING",
      OSS_ACCESS_KEY_SECRET: process.env.OSS_ACCESS_KEY_SECRET ? "✅ set" : "❌ MISSING",
    },
  });
}

const ACCEPTED_VIDEO_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/avi", "video/x-msvideo",
  "video/webm", "video/ogg", "video/3gpp", "video/3gpp2",
  "application/octet-stream",
]);

/** POST /api/videos/presign */
export async function POST(request: Request) {
  // ── 1. ENV check (exact format requested) ─────────────────────────────────
  console.log("ENV check:", {
    region:    process.env.OSS_REGION,
    bucket:    process.env.OSS_BUCKET,
    hasKey:    !!process.env.OSS_ACCESS_KEY_ID,
    hasSecret: !!process.env.OSS_ACCESS_KEY_SECRET,
  });

  const missingVars = [
    !process.env.OSS_REGION          && "OSS_REGION",
    !process.env.OSS_BUCKET          && "OSS_BUCKET",
    !process.env.OSS_ACCESS_KEY_ID     && "OSS_ACCESS_KEY_ID",
    !process.env.OSS_ACCESS_KEY_SECRET && "OSS_ACCESS_KEY_SECRET",
  ].filter(Boolean);

  if (missingVars.length > 0) {
    const msg = `服务器缺少环境变量：${missingVars.join(", ")}`;
    console.error("[presign] ❌ missing env vars:", missingVars);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }

  // ── 2. Parse request body ─────────────────────────────────────────────────
  let filename = "", contentType = "";
  try {
    const body = await request.json();
    filename    = body.filename    ?? "";
    contentType = body.contentType ?? "";
    console.log("[presign] request body:", { filename, contentType });
  } catch {
    return NextResponse.json({ success: false, message: "请求体必须是 JSON" }, { status: 400 });
  }

  if (!filename) {
    return NextResponse.json({ success: false, message: "缺少 filename 参数" }, { status: 400 });
  }

  const validType =
    ACCEPTED_VIDEO_TYPES.has(contentType) ||
    /\.(mp4|mov|avi|webm|ogv|3gp|3g2)$/i.test(filename);

  if (!validType) {
    console.error("[presign] ❌ unsupported type:", contentType, filename);
    return NextResponse.json(
      { success: false, message: `不支持的文件类型：${contentType || "unknown"}（${filename}）` },
      { status: 400 }
    );
  }

  // ── 3. Generate presigned URL ─────────────────────────────────────────────
  const cleanName = filename.replace(/[^\w\-._]/g, "_");
  const objectKey = `tutorials/${Date.now()}-${cleanName}`;
  console.log("[presign] objectKey:", objectKey);

  try {
    const presignUrl = ossPresignedPutUrl(objectKey, contentType, 3600);
    const publicUrl  = ossPublicUrl(objectKey);

    // ── Full URL logged for debugging (valid for 1h, safe to log) ───────────
    console.log("Generated presign URL:", presignUrl);
    console.log("[presign] publicUrl:", publicUrl);
    console.log("[presign] ✅ returning success to client");

    return NextResponse.json({ success: true, uploadUrl: presignUrl, objectKey, publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[presign] ❌ signing error:", msg);
    return NextResponse.json({ success: false, message: `生成签名失败：${msg}` }, { status: 500 });
  }
}
