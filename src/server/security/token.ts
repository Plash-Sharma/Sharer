import crypto from "crypto";

/**
 * Generates an unguessable 256-bit cryptographically secure token encoded in base64url.
 */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Computes the SHA-256 hash of a raw token for storage in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
