/**
 * Sanitizes an uploaded or user-provided filename according to Section 11:
 * - Strip slashes (/ and \)
 * - Strip control characters and path traversal (..)
 * - Trim length <= 255 characters
 * - Fallback to "untitled" if empty
 */
export function sanitizeFilename(raw: string): string {
  if (!raw) return "untitled";

  // Strip path traversal, colons, and slashes
  let clean = raw
    .replace(/[/\\]/g, "")
    .replace(/:/g, "")
    .replace(/\.\./g, "")
    // Strip control characters (ASCII 0-31 and 127)
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();

  // If filename begins with dot or is all dots, make it safe
  clean = clean.replace(/^\.+/, "");

  if (!clean) {
    clean = "untitled";
  }

  // Trim to max 255 characters while preserving extension if possible
  if (clean.length > 255) {
    const lastDot = clean.lastIndexOf(".");
    if (lastDot > 0 && clean.length - lastDot <= 10) {
      const ext = clean.substring(lastDot);
      const namePart = clean.substring(0, 255 - ext.length);
      clean = namePart + ext;
    } else {
      clean = clean.substring(0, 255);
    }
  }

  return clean;
}
