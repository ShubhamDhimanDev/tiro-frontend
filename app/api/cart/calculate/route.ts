import { proxyResponse } from "@/lib/http/proxy-response";
import { cartBackend } from "@/lib/cart/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { getBookingManageToken } from "@/lib/booking/manage-token-cookie";
import type { CartCalculateInput } from "@/lib/cart/types";

/**
 * POST /api/cart/calculate — proxies `POST /api/v1/cart/calculate`.
 *
 * Two mutually exclusive input modes, matching the upstream endpoint exactly
 * (see docs/architecture/02-api-contract.md's "Cart, Checkout & Payment
 * endpoints" section):
 *  - Mode 1 (`{ zone_id, items }`) — cart page, before a booking exists. No
 *    auth needed, same posture as the zone-aware `/tyres` endpoints.
 *  - Mode 2 (`{ booking_id }`) — checkout page, against an already-created
 *    booking hold. Reuses the exact same guest-or-owner auth as Phase 3's
 *    booking mutation endpoints: an authenticated bearer token if signed in,
 *    otherwise the guest manage token stored server-side by
 *    `POST /api/booking` (`lib/booking/manage-token-cookie.ts`) — this is
 *    exactly why this has to be a server-side proxy rather than a direct
 *    client-side fetch to Laravel, same reasoning as every other guest-token
 *    domain in this app.
 *
 * Unlike `POST /api/booking`, there's nothing to strip from the response —
 * `cart/calculate` never returns a secret (no `manage_token`/`order_token`
 * equivalent here), so this just forwards Laravel's body/status through
 * unchanged.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as CartCalculateInput;

  const token = await getAuthToken();
  const manageToken =
    !token && "booking_id" in body && body.booking_id ? await getBookingManageToken(body.booking_id) : null;

  const result = await cartBackend.calculate(body, { token, manageToken });
  return proxyResponse(result);
}
