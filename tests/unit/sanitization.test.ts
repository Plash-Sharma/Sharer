import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "@/server/security/sanitize-filename";
import { getSafeResponseContentType } from "@/server/security/mime";

describe("Security Sanitization (Filename & MIME)", () => {
  it("strips path traversal and path separators", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("etcpasswd");
    expect(sanitizeFilename("folder/subfolder/file.pdf")).toBe("foldersubfolderfile.pdf");
    expect(sanitizeFilename("C:\\Windows\\System32\\calc.exe")).toBe("CWindowsSystem32calc.exe");
  });

  it("trims length to maximum 255 characters", () => {
    const longName = "a".repeat(300) + ".txt";
    const sanitized = sanitizeFilename(longName);
    expect(sanitized.length).toBeLessThanOrEqual(255);
    expect(sanitized.endsWith(".txt")).toBe(true);
  });

  it("safely downgrades active / executable MIME types to octet-stream", () => {
    expect(getSafeResponseContentType("text/html")).toBe("application/octet-stream");
    expect(getSafeResponseContentType("image/svg+xml")).toBe("application/octet-stream");
    expect(getSafeResponseContentType("application/javascript")).toBe("application/octet-stream");
    expect(getSafeResponseContentType("image/png")).toBe("image/png");
    expect(getSafeResponseContentType("application/pdf")).toBe("application/pdf");
  });
});
