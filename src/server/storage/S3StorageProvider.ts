import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { s3Client, s3PresignClient, s3Bucket } from "./s3.client";
import { StorageProvider, ObjectMetadata } from "./StorageProvider";

export class S3StorageProvider implements StorageProvider {
  constructor(private readonly bucket: string = s3Bucket) {}

  async presignPut(
    key: string,
    size: number,
    mimeType: string,
    ttlSeconds: number = Number(process.env.PRESIGN_PUT_TTL_SECONDS || 300)
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentLength: size,
      ContentType: mimeType,
    });

    return getSignedUrl(s3PresignClient, command, { expiresIn: ttlSeconds });
  }

  async presignGet(
    key: string,
    downloadFilename: string,
    mimeType?: string,
    ttlSeconds: number = Number(process.env.PRESIGN_GET_TTL_SECONDS || 60)
  ): Promise<string> {
    const asciiFallback = downloadFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const encodedFilename = encodeURIComponent(downloadFilename);
    const contentDisposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`;

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: contentDisposition,
      ResponseContentType: mimeType || "application/octet-stream",
    });

    return getSignedUrl(s3PresignClient, command, { expiresIn: ttlSeconds });
  }

  async head(key: string): Promise<ObjectMetadata | null> {
    try {
      const response = await s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      return {
        contentLength: response.ContentLength ?? 0,
        etag: (response.ETag ?? "").replace(/"/g, ""),
        contentType: response.ContentType,
        lastModified: response.LastModified,
      };
    } catch (err: unknown) {
      const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (
        error?.name === "NotFound" ||
        error?.name === "NoSuchKey" ||
        error?.$metadata?.httpStatusCode === 404
      ) {
        return null;
      }
      throw err;
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    // S3 DeleteObjects max batch size is 1000
    const chunkSize = 1000;
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: chunk.map((k) => ({ Key: k })),
            Quiet: true,
          },
        })
      );
    }
  }

  async deleteObject(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async putObject(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string
  ): Promise<{ etag: string }> {
    const response = await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );

    return {
      etag: (response.ETag ?? "").replace(/"/g, ""),
    };
  }

  async getObject(key: string): Promise<Buffer | null> {
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) return null;

      if (response.Body instanceof Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of response.Body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      } else if (typeof (response.Body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
        const bytes = await (response.Body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
        return Buffer.from(bytes);
      }

      return null;
    } catch (err: unknown) {
      const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (
        error?.name === "NotFound" ||
        error?.name === "NoSuchKey" ||
        error?.$metadata?.httpStatusCode === 404
      ) {
        return null;
      }
      throw err;
    }
  }
}

export const defaultStorageProvider = new S3StorageProvider();
