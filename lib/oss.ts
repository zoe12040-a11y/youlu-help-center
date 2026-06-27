import OSS from "ali-oss";

// ── Client factory ────────────────────────────────────────────────────────────

export function getOSSClient(): OSS {
  const region          = process.env.OSS_REGION;
  const accessKeyId     = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const bucket          = process.env.OSS_BUCKET;

  const missing = [
    !region          && "OSS_REGION",
    !accessKeyId     && "OSS_ACCESS_KEY_ID",
    !accessKeySecret && "OSS_ACCESS_KEY_SECRET",
    !bucket          && "OSS_BUCKET",
  ].filter(Boolean).join(", ");

  if (missing) throw new Error(`缺少阿里云 OSS 环境变量：${missing}`);

  return new OSS({
    region: region!,
    accessKeyId: accessKeyId!,
    accessKeySecret: accessKeySecret!,
    bucket: bucket!,
  });
}

// ── Public URL builder ────────────────────────────────────────────────────────
// Format: https://BUCKET.REGION.aliyuncs.com/OBJECT_KEY
// Set OSS_CUSTOM_DOMAIN to override, e.g. cdn.example.com

export function ossPublicUrl(objectKey: string): string {
  const bucket       = process.env.OSS_BUCKET!;
  const region       = process.env.OSS_REGION!;
  const customDomain = process.env.OSS_CUSTOM_DOMAIN;
  return customDomain
    ? `https://${customDomain}/${objectKey}`
    : `https://${bucket}.${region}.aliyuncs.com/${objectKey}`;
}

// ── Presigned PUT URL (manual V1 signature — avoids ali-oss url.parse warning) ─
//
// Implements OSS Signature V1 using Web Crypto API (works in Node.js & Edge).
// Does NOT use ali-oss's signatureUrl(), which internally calls url.parse()
// and triggers [DEP0169] in Node.js 22+.
//
// ⚠️  OSS CORS requirement: configure your OSS bucket CORS rules to allow:
//    - Allowed Origins: your Vercel domain (or * for testing)
//    - Allowed Methods: PUT
//    - Allowed Headers: *
//    OSS Console → Bucket → Security → CORS Rules → Add Rule

export async function ossPresignedPutUrl(
  objectKey: string,
  _contentType: string,   // kept for API compatibility; not included in sig
  expiresSeconds = 3600
): Promise<string> {
  const region    = process.env.OSS_REGION!;
  const bucket    = process.env.OSS_BUCKET!;
  const keyId     = process.env.OSS_ACCESS_KEY_ID!;
  const keySecret = process.env.OSS_ACCESS_KEY_SECRET!;

  const expires = Math.floor(Date.now() / 1000) + expiresSeconds;

  // OSS V1 StringToSign: Method\nContent-MD5\nContent-Type\nExpires\nCanonicalizedResource
  // We omit Content-MD5 and Content-Type so the browser can PUT freely.
  const stringToSign = `PUT\n\n\n${expires}\n/${bucket}/${objectKey}`;

  // HMAC-SHA1 via Web Crypto (no url.parse, no Node.js-specific types)
  const enc = new TextEncoder();
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw", enc.encode(keySecret),
    { name: "HMAC", hash: "SHA-1" },
    false, ["sign"]
  );
  const sigBuf = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, enc.encode(stringToSign));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  const qs = `OSSAccessKeyId=${encodeURIComponent(keyId)}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`;
  const endpoint = process.env.OSS_CUSTOM_DOMAIN
    ? `https://${process.env.OSS_CUSTOM_DOMAIN}`
    : `https://${bucket}.${region}.aliyuncs.com`;

  return `${endpoint}/${objectKey}?${qs}`;
}

// ── Server-side upload (fallback for small files / internal use) ──────────────

export async function ossUpload(
  objectKey: string,
  data: Uint8Array,
  contentType: string
): Promise<string> {
  const client = getOSSClient();
  const result = await (client as OSS).put(objectKey, data as unknown as Buffer, {
    mime: contentType,
    headers: { "Content-Type": contentType },
  });
  const status = result?.res?.status ?? 200;
  if (status >= 400) throw new Error(`OSS 上传失败（HTTP ${status}）`);
  return ossPublicUrl(objectKey);
}
