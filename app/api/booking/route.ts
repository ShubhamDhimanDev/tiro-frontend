import { NextResponse } from "next/server";
import { proxyResponse } from "@/lib/http/proxy-response";
import { bookingBackend } from "@/lib/booking/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { setBookingManageToken } from "@/lib/booking/manage-token-cookie";
import type { BookingCreateInput, BookingCreateResponse } from "@/lib/booking/types";

/**
 * POST /api/booking — proxies `POST /api/v1/bookings`. Works guest or
 * authenticated: attaches the Sanctum bearer token from the httpOnly
 * session cookie when signed in (same pattern as every other authenticated
 * proxy in this app — see `lib/auth/cookies.ts`), omits it otherwise so the
 * booking is created guest-owned.
 *
 * `Idempotency-Key` is forwarded as-is from the client's own header — this
 * route doesn't re-validate its format; Laravel's `idempotency` middleware
 * is the single source of truth for that (`422` if missing/malformed),
 * same "don't duplicate the backend's own validation" posture as every
 * other proxy route in this app.
 */
export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
  const body = (await request.json()) as BookingCreateInput;
  const token = await getAuthToken();

  const result = await bookingBackend.create(body, { idempotencyKey, token });

  if (result.status !== 201) {
    return proxyResponse(result);
  }

  const { data } = result.body as BookingCreateResponse;

  // `manage_token` is a bearer-equivalent secret for guest bookings — same
  // handling as the Sanctum token in `lib/auth/cookies.ts`: store it
  // server-side in an httpOnly cookie and strip it from the response the
  // browser actually receives. It must never reach client JS.
  //
  // `manage_token_issued` is *not* a secret (just a boolean flag) and is
  // forwarded through untouched — always present as `true`/`false` on this
  // endpoint's responses, per `BookingCreateRecord`'s doc comment. It's
  // deliberately not treated as an error signal even when it's `true` but
  // `manage_token` itself is absent (the "replay outside the cache window"
  // edge case) — this app's own flow always captures the token synchronously
  // on the first `201`, well inside that window, so there's nothing this
  // route needs to special-case here.
  const { manage_token: manageToken, ...safeData } = data;
  if (manageToken) {
    await setBookingManageToken(data.id, manageToken);
  }

  return NextResponse.json({ data: safeData }, { status: 201 });
}
