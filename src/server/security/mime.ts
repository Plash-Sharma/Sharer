const INLINE_PREVIEW_WHITELIST = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

/**
 * Normalizes and guards MIME types. Prevents executable / active content sniffing (HTML/SVG/scripts)
 * from being served inline or without safe attachment headers.
 */
export function getSafeResponseContentType(mimeType?: string | null): string {
  if (!mimeType) return "application/octet-stream";

  const lower = mimeType.toLowerCase().trim();

  // Explicitly block SVG/HTML/JS from having executable content types
  if (
    lower.includes("html") ||
    lower.includes("xml") ||
    lower.includes("svg") ||
    lower.includes("javascript") ||
    lower.includes("ecmascript")
  ) {
    return "application/octet-stream";
  }

  if (INLINE_PREVIEW_WHITELIST.has(lower)) {
    return lower;
  }

  return "application/octet-stream";
}

export function isInlinePreviewable(mimeType?: string | null): boolean {
  if (!mimeType) return false;
  return INLINE_PREVIEW_WHITELIST.has(mimeType.toLowerCase().trim());
}
