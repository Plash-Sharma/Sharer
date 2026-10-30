import { randomUUID } from "crypto";

/**
 * Generates an opaque, flat UUID object key for S3/MinIO.
 * Storage keys MUST NEVER contain filenames, user IDs, paths, or slashes.
 */
export function newStorageKey(): string {
  return randomUUID();
}
