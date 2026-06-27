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

// ── Presigned PUT URL ─────────────────────────────────────────────────────────
// Uses ali-oss official signatureUrl() — the most reliable V1 signature.
// Signature does NOT bind Content-Type so the browser can PUT without
// custom headers (avoids CORS preflight issues with Content-Type).
//
// Note: ali-oss internally uses url.parse() which triggers DEP0169 in
// Node.js 22+. This is a harmless deprecation warning, not an error.
//
// ⚠️  OSS CORS requirement (bucket settings):
//    - Allowed Origins : *  (or your exact domain)
//    - Allowed Methods : PUT, GET, HEAD, DELETE, POST
//    - Allowed Headers : *
//    OSS Console → Bucket → Data Security → CORS Rules

export function ossPresignedPutUrl(
  objectKey: string,
  _contentType: string,  // not bound in signature — browser PUT headers are free
  expiresSeconds = 3600
): string {
  const client = getOSSClient();
  // signatureUrl with method=PUT and no Content-Type binding
  // The returned URL contains ?OSSAccessKeyId=...&Expires=...&Signature=...
  return client.signatureUrl(objectKey, {
    expires: expiresSeconds,
    method: "PUT",
    // intentionally no "Content-Type" option
  });
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
