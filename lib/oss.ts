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

  return new OSS({ region: region!, accessKeyId: accessKeyId!, accessKeySecret: accessKeySecret!, bucket: bucket! });
}

// ── Public URL builder ────────────────────────────────────────────────────────
// Format: https://BUCKET.REGION.aliyuncs.com/OBJECT_KEY
// If OSS_CUSTOM_DOMAIN is set, uses: https://CUSTOM_DOMAIN/OBJECT_KEY

export function ossPublicUrl(objectKey: string): string {
  const bucket       = process.env.OSS_BUCKET!;
  const region       = process.env.OSS_REGION!;
  const customDomain = process.env.OSS_CUSTOM_DOMAIN;
  return customDomain
    ? `https://${customDomain}/${objectKey}`
    : `https://${bucket}.${region}.aliyuncs.com/${objectKey}`;
}

// ── Upload helper ─────────────────────────────────────────────────────────────

export async function ossUpload(
  objectKey: string,
  data: Uint8Array,
  contentType: string
): Promise<string> {
  const client = getOSSClient();

  // ali-oss accepts Buffer / Uint8Array / ReadableStream
  const result = await (client as OSS).put(objectKey, data as unknown as Buffer, {
    mime: contentType,
    headers: { "Content-Type": contentType },
  });

  const status = result?.res?.status ?? 200;
  if (status >= 400) {
    throw new Error(`OSS 上传失败（HTTP ${status}）`);
  }

  return ossPublicUrl(objectKey);
}
