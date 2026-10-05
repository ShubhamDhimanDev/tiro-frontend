/**
 * Canonical public origin for absolute URLs (sitemap, canonicals, JSON-LD, OG).
 * Set `NEXT_PUBLIC_SITE_URL` per environment (e.g. https://www.example.com.au).
 * The localhost fallback only exists so dev and tests resolve; production must
 * set it, otherwise every canonical points at localhost.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");

/** `/tyres` -> `https://host/tyres`. Absolute inputs pass through unchanged. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
