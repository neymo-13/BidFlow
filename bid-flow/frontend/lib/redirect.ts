// =====================================================
// Safe redirect — allow only same-site relative paths
// Blocks open redirects such as "//evil.com", "/\evil.com", "https://evil.com"
// =====================================================
export function safeRedirect(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;

  // Must be a path on this site
  if (!value.startsWith("/")) return fallback;

  // Protocol-relative URLs and backslash tricks (browsers treat "\" like "/")
  if (value.startsWith("//") || value.includes("\\")) return fallback;

  // Control characters (tab/newline) are stripped by browsers and can turn "/\t/x" into "//x"
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;

  return value;
}
