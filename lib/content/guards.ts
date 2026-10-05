/**
 * Render-time content guards (WS-B). Pure helpers, safe on server and client.
 */

const TOKEN_RE = /\[[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\]|\[[A-Z]{4,}\]/g;

/** Unresolved `[UPPER_CASE]` template tokens (e.g. `[MAX_BOOKING_WINDOW_DAYS]`) left in authored text. */
export function findUnresolvedTokens(text: string | null | undefined): string[] {
  if (!text) return [];
  return Array.from(new Set(text.match(TOKEN_RE) ?? []));
}

/** Dev-only console warning when authored content still contains unresolved tokens. Never throws, never logs in production. */
export function warnUnresolvedTokens(source: string, text: string | null | undefined): void {
  if (process.env.NODE_ENV === "production") return;
  const tokens = findUnresolvedTokens(text);
  if (tokens.length > 0) {
    console.warn(`[content] Unresolved placeholder token(s) ${tokens.join(", ")} in ${source}. Fix it in the CMS/seed data.`);
  }
}

/** Plain-text length of an HTML string (tags stripped, whitespace collapsed). */
function textLength(html: string): number {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
}

/**
 * True for a CMS body that is only a stub (a heading plus one short line such as
 * "We service Richmond and surrounds."), which should not render as a section.
 */
export function isStubBody(html: string | null | undefined, minChars = 120): boolean {
  if (!html) return true;
  return textLength(html) < minChars;
}
