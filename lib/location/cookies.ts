import { cookies } from "next/headers";
import type { ServiceZoneSnapshot } from "./types";

/**
 * Server-side cookie for the resolved service zone.
 *
 * docs/architecture/02-api-contract.md: "Frontend persists `service_zone_id`
 * (+ display label) in a cookie/localStorage, not just React state, so it
 * survives navigation and is available to SSR requests." A cookie (not
 * localStorage) is the only option that satisfies "available to SSR
 * requests" — localStorage is client-only.
 *
 * **httpOnly, same as the auth session snapshot cookie** (`lib/auth/cookies.ts`).
 * The zone id/label aren't sensitive, but there's no functional need for raw
 * `document.cookie` access either: SSR pages read it server-side via
 * `getServiceZone()`, and client components hydrate it the same way
 * `<AuthProvider>` hydrates the customer snapshot — one mount-time
 * `GET /api/location/session` call (see `components/location/location-provider.tsx`)
 * — so httpOnly is strictly more defensive with no cost, same reasoning
 * `lib/auth/cookies.ts` already documents for its own snapshot cookie. This
 * is a judgment call, not spelled out in the contract; flagged in the
 * completion report.
 */

export const SERVICE_ZONE_COOKIE = "mts_service_zone";

/**
 * How long a resolved zone survives without the customer re-confirming it.
 * Not specified by the contract (only "survives navigation" is required).
 * 30 days balances "don't re-prompt on every visit" against zones/suburb
 * coverage changing over time (admin-managed, per docs/architecture/01-data-model.md's
 * `State`/`ServiceZone`) — shorter than the 90-day auth session so a stale
 * zone doesn't quietly outlive real serviceability changes for multiple
 * months. Tune later; cheap to change.
 */
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: THIRTY_DAYS_IN_SECONDS,
  };
}

/** Sets the zone cookie. Call this only after a `serviceable: true` response — never for a false/failed check. */
export async function setServiceZone(snapshot: ServiceZoneSnapshot): Promise<void> {
  const store = await cookies();
  store.set(SERVICE_ZONE_COOKIE, JSON.stringify(snapshot), baseCookieOptions());
}

/**
 * Clears the zone cookie. Call this when: the customer explicitly changes
 * location, a serviceability check comes back `false`, or a downstream
 * catalog/PDP call rejects the zone as stale/unknown (§ "never silently
 * fall through to an unfiltered nationwide result" — clearing forces every
 * zone-scoped surface back into its "re-check serviceability" state rather
 * than quietly keeping a dead zone id around).
 */
export async function clearServiceZone(): Promise<void> {
  const store = await cookies();
  store.delete(SERVICE_ZONE_COOKIE);
}

/** Server-only: the persisted zone snapshot, or `null` if none is set / the cookie is malformed. */
export async function getServiceZone(): Promise<ServiceZoneSnapshot | null> {
  const store = await cookies();
  const raw = store.get(SERVICE_ZONE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceZoneSnapshot;
    if (typeof parsed.zoneId !== "string" || typeof parsed.label !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
