import { NextResponse } from "next/server";
import { proxyResponse } from "@/lib/http/proxy-response";
import { ordersBackend } from "@/lib/orders/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { getBookingManageToken } from "@/lib/booking/manage-token-cookie";
import { setOrderToken } from "@/lib/orders/order-token-cookie";
import type { OrderCreateInput, OrderCreateResponse } from "@/lib/orders/types";

/**
 * POST /api/orders — proxies `POST /api/v1/orders`. Works guest or
 * authenticated: attaches the Sanctum bearer token from the httpOnly
 * session cookie when signed in, otherwise the *booking's* guest manage
 * token (`lib/booking/manage-token-cookie.ts`) — `POST /api/v1/orders`
 * auth-checks the booking via `authorizeGuestOrOwner()`, the same call
 * `reschedule`/`cancel` use, not a token belonging to the not-yet-created
 * order. Same pattern as `app/api/booking/route.ts`.
 *
 * `Idempotency-Key` is forwarded as-is from the client's own header — this
 * route doesn't re-validate its format; Laravel's `idempotency` middleware
 * is the single source of truth for that, same "don't duplicate the
 * backend's own validation" posture as every other proxy route in this app.
 */
export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
  const body = (await request.json()) as OrderCreateInput;
  const token = await getAuthToken();
  const manageToken = token ? null : await getBookingManageToken(body.booking_id);

  const result = await ordersBackend.create(body, { idempotencyKey, token, manageToken });

  if (result.status !== 201) {
    return proxyResponse(result);
  }

  const { data } = result.body as OrderCreateResponse;

  // `order_token` is a bearer-equivalent secret for guest orders — same
  // handling as `Booking.manage_token` in `app/api/booking/route.ts`: store
  // it server-side in an httpOnly cookie and strip it from the response the
  // browser actually receives. It must never reach client JS.
  //
  // `order_token_issued` is *not* a secret (just a boolean flag) and is
  // forwarded through untouched. `payment.client_secret` is deliberately
  // NOT stripped — unlike `order_token`, Stripe's Payment Element model
  // requires the client secret in browser JS to confirm the payment; that's
  // the one secret in this response that's meant to reach the client.
  const { order_token: orderToken, ...safeData } = data;
  if (orderToken) {
    await setOrderToken(data.id, orderToken);
  }

  return NextResponse.json({ data: safeData }, { status: 201 });
}
