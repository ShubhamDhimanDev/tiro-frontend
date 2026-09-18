import { NextResponse } from "next/server";
import { getServiceZone } from "@/lib/location/cookies";

/**
 * GET /api/location/session — frontend-only read of the zone snapshot
 * cookie (no equivalent in the backend contract), used by
 * `<LocationProvider>` to hydrate client-side zone state on mount without
 * forcing shared layouts into dynamic SSR — same reasoning as
 * `/api/auth/session`. Always 200; `zone` is `null` when unresolved.
 */
export async function GET() {
  const zone = await getServiceZone();
  return NextResponse.json({ zone });
}
