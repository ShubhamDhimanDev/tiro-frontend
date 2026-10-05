/** "just now", "5 minutes ago", "2 hours ago", "3 days ago"; falls back to "recently" for bad or future dates. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "recently";
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 0) return "recently";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Paths where the toast must never appear (money and personal-data flows). */
const EXCLUDED_PREFIXES = ["/checkout", "/booking", "/orders", "/account"];

export function isSocialProofExcluded(pathname: string | null): boolean {
  if (!pathname) return false;
  return EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
