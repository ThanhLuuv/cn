import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const enabled = process.env.CLOUDFLARE_R2_ENABLED === 'true' || process.env.CLOUDFLARE_R2_ENABLED === '1';

export const r2Client = enabled ? new S3Client({
  region: process.env.CLOUDFLARE_R2_REGION || 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
}) : null;

export async function r2PutObject(key: string, body: Uint8Array | Buffer | ArrayBuffer, contentType: string) {
  if (!enabled || !r2Client) throw new Error('R2 disabled');
  const bucketRaw = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const bucket = bucketRaw?.trim();
  if (!bucket) {
    throw new Error('CLOUDFLARE_R2_BUCKET_NAME is not set or empty. Check .env.local');
  }
  // Validate bucket name format (R2 buckets follow S3 naming rules)
  const bucketLower = bucket.toLowerCase();
  if (bucket !== bucketLower) {
    console.warn(`Bucket name "${bucket}" contains uppercase. Converting to lowercase: "${bucketLower}"`);
  }
  const finalBucket = bucketLower;
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(finalBucket) || finalBucket.length < 3 || finalBucket.length > 63) {
    throw new Error(`Invalid bucket name format: "${finalBucket}". Bucket names must be 3-63 characters, lowercase alphanumeric and hyphens only.`);
  }
  const cmd = new PutObjectCommand({ Bucket: finalBucket, Key: key, Body: body as any, ContentType: contentType, ACL: 'public-read' as any });
  await r2Client.send(cmd);
  const base = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '') || '';
  return `${base}/${key}`;
}


