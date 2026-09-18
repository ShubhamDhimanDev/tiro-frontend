import type { BrowserContext, Page } from "@playwright/test";

/**
 * Resolves serviceability for `page`'s browser context via this app's own
 * `POST /api/location/check` route (not the UI) — for tests where "a zone is
 * already resolved" is setup, not the thing under test (the golden-path UI
 * flow itself is covered by `serviceability.spec.ts`'s own test, same
 * "fixture vs. thing under test" split `helpers/fixtures.ts` uses for auth).
 *
 * Deliberately uses `page.request`, not the standalone `request` fixture:
 * `page.request` shares the page's browser-context cookie jar, so the
 * httpOnly `mts_service_zone` cookie this sets is actually visible to
 * subsequent `page.goto()` navigations in the same test. The standalone
 * `request` fixture is its own `APIRequestContext`, independent of any
 * `page`/`context`, and would silently leave `page` zone-less.
 */
export async function resolveZoneViaApi(
  page: Page,
  input: { postcode?: string } | { suburb?: string }
): Promise<{ zoneId: string; label: string }> {
  const res = await page.request.post("/api/location/check", { data: input });
  if (!res.ok()) {
    throw new Error(`resolveZoneViaApi: POST /api/location/check failed — ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as { serviceable: boolean; service_zone_id: number | string | null; label: string | null };
  if (!body.serviceable || body.service_zone_id === null || body.label === null) {
    throw new Error(
      `resolveZoneViaApi: ${JSON.stringify(input)} resolved as not serviceable (${JSON.stringify(body)}) — ` +
        `pick input that actually matches LocationSeeder's seed data.`
    );
  }
  return { zoneId: String(body.service_zone_id), label: body.label };
}

export const SERVICE_ZONE_COOKIE = "mts_service_zone";

/**
 * Directly injects a zone cookie whose id no `ServiceZone` will ever have —
 * simulating "stale" (a real zone that existed when the cookie was set but
 * was since deleted/deactivated) or "tampered" (edited client-side) without
 * needing to actually mutate/delete real seeded zones out from under other
 * tests. `context.addCookies` operates at the CDP/browser-context level, not
 * through `document.cookie`, so `httpOnly` doesn't block setting it here —
 * same as a real `Set-Cookie` response header would.
 *
 * The value is URI-component-encoded JSON to match exactly how
 * `lib/location/cookies.ts#setServiceZone` actually serializes it (verified
 * against a real `Set-Cookie` from `POST /api/location/check`) — this
 * exercises `getServiceZone()`'s real parsing path, not a shortcut past it.
 */
export async function setTamperedZoneCookie(context: BrowserContext, baseURL: string): Promise<void> {
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: SERVICE_ZONE_COOKIE,
      value: encodeURIComponent(JSON.stringify({ zoneId: "999999", label: "Nonexistent Zone" })),
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
