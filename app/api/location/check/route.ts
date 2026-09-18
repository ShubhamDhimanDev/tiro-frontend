import { NextResponse } from "next/server";
import { locationBackend } from "@/lib/location/backend";
import { setServiceZone, clearServiceZone } from "@/lib/location/cookies";
import type { ServiceabilityCheckInput, ServiceabilityResult } from "@/lib/location/types";

/**
 * POST /api/location/check — proxies `POST /api/v1/serviceability`
 * (docs/architecture/02-api-contract.md). The browser never calls Laravel
 * directly (same posture as `/api/auth/*` — avoids needing CORS on the
 * Laravel API for a public, unauthenticated endpoint, and keeps
 * `LARAVEL_API_URL` a server-only implementation detail).
 *
 * On `serviceable: true`, persists the zone cookie server-side (httpOnly)
 * before responding — the client never has to make a second call to
 * "save" the resolved zone. On `serviceable: false` (or any non-200), any
 * previously-set zone cookie is cleared: a fresh negative check should
 * never leave a stale positive zone lying around.
 */
export async function POST(request: Request) {
  let input: ServiceabilityCheckInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 422 });
  }

  if (!input.postcode && !input.suburb) {
    return NextResponse.json(
      { message: "Enter a postcode or suburb.", errors: { postcode: ["Enter a postcode or suburb."] } },
      { status: 422 }
    );
  }

  const result = await locationBackend.check(input);

  if (result.status === 200) {
    const body = result.body as ServiceabilityResult;
    if (body.serviceable && body.service_zone_id !== null && body.label) {
      await setServiceZone({ zoneId: String(body.service_zone_id), label: body.label });
    } else {
      await clearServiceZone();
    }
    return NextResponse.json(body, { status: 200 });
  }

  await clearServiceZone();
  return NextResponse.json(result.body, { status: result.status });
}
