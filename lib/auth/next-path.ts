/**
 * `?next=` handling for sign-in redirects. Only same-site relative paths are
 * accepted: anything else (absolute URLs, protocol-relative `//host`,
 * backslash tricks) falls back to the default, so the login page can never be
 * used as an open redirect.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

/** `/login?next=<path>` for a signed-out visitor on a gated page. */
export function loginHref(path: string | null | undefined): string {
  const next = safeNextPath(path, "");
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}
