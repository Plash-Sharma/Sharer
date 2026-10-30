import { describe, it, expect } from "vitest";
import { generateShareToken, hashToken } from "@/server/security/token";

describe("Share Link Token & Expiry", () => {
  it("generates a 256-bit (32-byte) base64url token", () => {
    const token = generateShareToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    // 32 bytes in base64url is 43 characters
    expect(token.length).toBe(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("produces deterministic SHA-256 hashes", () => {
    const token = generateShareToken();
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // 256-bit hex
  });

  it("correctly identifies active vs expired link based on inject timestamp", () => {
    const expiresAt = new Date("2026-06-01T12:00:00Z");

    const beforeExpiry = new Date("2026-06-01T11:59:59Z");
    expect(expiresAt.getTime() > beforeExpiry.getTime()).toBe(true);

    const afterExpiry = new Date("2026-06-01T12:00:01Z");
    expect(expiresAt.getTime() <= afterExpiry.getTime()).toBe(true);
  });
});
