import { NextResponse } from "next/server";
import { getOSSClient, ossPublicUrl } from "../../../../lib/oss";

/** GET /api/videos/presign
 *  Health-check: visit in browser to confirm the route is live and env vars are set.
 *  Returns env var status (never exposes secret values).
 */
export async function GET() {
  const status = {
    route: "ok",
    env: {
      OSS_REGION:          process.env.OSS_REGION          ? "✅ set" : "❌ MISSING",
      OSS_BUCKET:          process.env.OSS_BUCKET          ? "✅ set" : "❌ MISSING",
      OSS_ACCESS_KEY_ID:   process.env.OSS_ACCESS_KEY_ID   ? "✅ set" : "❌ MISSING",
      OSS_ACCESS_KEY_SECRET: process.env.OSS_ACCESS_KEY_SECRET ? "✅ set" : "❌ MISSING",
    },
  };
  return NextResponse.json(status);
}

const ACCEPTED_VIDEO_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/avi", "video/x-msvideo",
  "video/webm", "video/ogg", "video/3gpp", "video/3gpp2",
  "application/octet-stream",
]);

/** POST /api/videos/presign
 *  Body: { filename: string, contentType: string }
 *  Returns: { success, uploadUrl, objectKey, publicUrl }
 */
export async function POST(request: Request) {
  // ── Env var check ────────────────────────────────────────────────────────
  console.log("[presign/videos] ENV:", {
    region:    process.env.OSS_REGION    ?? "MISSING",
    bucket:    process.env.OSS_BUCKET    ?? "MISSING",
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
    console.error("[presign/videos]", msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }

  // ── Parse request body ───────────────────────────────────────────────────
  let filename = "", contentType = "";
  try {
    const body = await request.json();
    filename    = body.filename    ?? "";
    contentType = body.contentType ?? "";
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
    return NextResponse.json(
      { success: false, message: `不支持的文件类型：${contentType || "unknown"}（${filename}）` },
      { status: 400 }
    );
  }

  // ── Create OSS client ────────────────────────────────────────────────────
  let client;
  try {
    client = getOSSClient();
    console.log("[presign/videos] OSS client OK");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[presign/videos] Client error:", msg);
    return NextResponse.json({ success: false, message: `OSS 初始化失败：${msg}` }, { status: 500 });
  }

  // ── Generate presigned PUT URL ───────────────────────────────────────────
  const cleanName = filename.replace(/[^\w\-._]/g, "_");
  const objectKey = `tutorials/${Date.now()}-${cleanName}`;

  let uploadUrl: string;
  try {
    // NOTE: Content-Type intentionally excluded from signature (ali-oss v6 compatibility).
    // The browser can set any Content-Type in the PUT request.
    uploadUrl = client.signatureUrl(objectKey, { expires: 3600, method: "PUT" });
    console.log("[presign/videos] Signed URL OK, key:", objectKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[presign/videos] signatureUrl error:", msg);
    return NextResponse.json({ success: false, message: `生成签名失败：${msg}` }, { status: 500 });
  }

  const publicUrl = ossPublicUrl(objectKey);
  return NextResponse.json({ success: true, uploadUrl, objectKey, publicUrl });
}
