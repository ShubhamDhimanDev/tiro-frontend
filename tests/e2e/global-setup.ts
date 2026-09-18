/**
 * Fails the whole run fast, with an actionable message, if the real Laravel
 * backend isn't reachable — every spec in this suite exercises real
 * backend-agent endpoints rather than any domain's in-memory stub
 * (frontend/CLAUDE.md: AUTH_BACKEND defaulted to "live" as of 2026-09-10;
 * LOCATION_BACKEND/CATALOG_BACKEND followed as of 2026-09-11 — all three
 * now default to live, with `*_BACKEND=stub` opt-in only). A silent
 * connection failure here would otherwise show up as a wall of confusing
 * per-test timeouts instead of one clear cause.
 */
export default async function globalSetup(): Promise<void> {
  const backendUrl = process.env.LARAVEL_API_URL ?? "http://localhost:8000";

  const checks: Array<{ path: string; init: RequestInit }> = [
    { path: "/api/v1/auth/login", init: { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" } },
    { path: "/api/v1/serviceability", init: { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" } },
    { path: "/api/v1/brands", init: { method: "GET" } },
  ];

  for (const { path, init } of checks) {
    try {
      // Any HTTP response (even a 4xx/5xx) proves the process is up; only a
      // network-level failure (connection refused, DNS, etc.) is fatal here.
      await fetch(`${backendUrl}${path}`, init);
    } catch (err) {
      throw new Error(
        `Laravel backend not reachable at ${backendUrl}${path}. ` +
          `This E2E suite exercises the real backend, not any domain's *_BACKEND=stub in-memory fake — ` +
          `start it first (e.g. \`php artisan serve\` from backend/, or your Docker Compose stack once ` +
          `devops-agent's is in place) before running \`npm run test:e2e\`.\n\nUnderlying error: ${String(err)}`
      );
    }
  }
}
