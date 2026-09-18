import { clearServiceZone } from "@/lib/location/cookies";

/**
 * DELETE /api/location/clear — explicit "change my location" action from
 * the UI (e.g. the header location badge), and also what any zone-scoped
 * fetch helper calls when a downstream Laravel response signals the zone is
 * stale/unknown (see `lib/catalog/client-api.ts`) — degrading to
 * "re-check serviceability" per the contract's "never silently fall through
 * to an unfiltered nationwide result" rule. 204, no body.
 */
export async function DELETE() {
  await clearServiceZone();
  return new Response(null, { status: 204 });
}
