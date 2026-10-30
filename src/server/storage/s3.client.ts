import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.S3_REGION || "us-east-1";
const accessKeyId = process.env.S3_ACCESS_KEY || "drivelite-app";
const secretAccessKey = process.env.S3_SECRET_KEY || "drivelitesecret123";
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

export const s3Bucket = process.env.S3_BUCKET || "drivelite-files";

/**
 * Server-side S3 client used for direct backend operations (HEAD, DeleteObject, DeleteObjects, PutObject).
 * Points to S3_ENDPOINT (e.g. internal network / http://localhost:9000).
 */
export const s3Client = new S3Client({
  region,
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  forcePathStyle,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Client configured with S3_PUBLIC_ENDPOINT (e.g. http://localhost:9000)
 * used exclusively for generating pre-signed URLs that the browser will call directly.
 */
export const s3PresignClient = new S3Client({
  region,
  endpoint: process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || "http://localhost:9000",
  forcePathStyle,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});
