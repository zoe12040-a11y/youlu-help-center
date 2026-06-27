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
// Generates a signed URL that allows a browser to PUT directly to OSS.
// The Content-Type is included in the signature, so the browser MUST send
// the same Content-Type header in the PUT request.
//
// ⚠️  OSS CORS requirement: configure your OSS bucket CORS rules to allow:
//    - Allowed Origins: your Vercel domain (or * for testing)
//    - Allowed Methods: PUT
//    - Allowed Headers: *
//    OSS Console → Bucket → Security → CORS Rules → Add Rule

export function ossPresignedPutUrl(
  objectKey: string,
  contentType: string,
  expiresSeconds = 3600
): string {
  const client = getOSSClient();
  // signatureUrl() runs on the server and uses the secret key — never exposed to client
  return client.signatureUrl(objectKey, {
    expires: expiresSeconds,
    method: "PUT",
    "Content-Type": contentType,
  } as Parameters<OSS["signatureUrl"]>[1]);
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
