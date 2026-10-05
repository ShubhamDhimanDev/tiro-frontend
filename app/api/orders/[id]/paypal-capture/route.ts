import { NextResponse } from "next/server";
import { proxyResponse } from "@/lib/http/proxy-response";
import { ordersBackend } from "@/lib/orders/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { getOrderToken } from "@/lib/orders/order-token-cookie";

/**
 * POST /api/orders/{id}/paypal-capture — proxies
 * `POST /api/v1/orders/{order}/paypal-capture`. Called by
 * `components/checkout/paypal-payment-step.tsx`'s `onApprove` callback
 * immediately after the buyer approves in the PayPal popup — this is the
 * step that actually captures funds server-side (PayPal's own recommended
 * pattern; capture must happen server-side, never client-side — see
 * docs/architecture/03-integrations.md's PayPal section, point 6, and
 * docs/architecture/02-api-contract.md's matching endpoint section).
 *
 * Same auth precedence as `GET /api/orders/{id}` (this route's sibling, in
 * `app/api/orders/[id]/route.ts`): the Sanctum bearer token if signed in,
 * otherwise this order's own guest token stored server-side by
 * `POST /api/orders` (`lib/orders/order-token-cookie.ts`) — never both, and
 * never exposed to client JS (the reason this has to be a server-side proxy
 * rather than a direct client-side fetch to Laravel: only this Route
 * Handler can read the httpOnly order-token cookie to attach
 * `X-Order-Token`). Short-circuits to `403` without a round trip when
 * neither credential is available, same posture as `GET /api/orders/{id}`.
 *
 * `Idempotency-Key` is forwarded as-is from the client's own header — this
 * route doesn't re-validate its format; Laravel's `idempotency` middleware
 * is the single source of truth for that, same "don't duplicate the
 * backend's own validation" posture as `app/api/orders/route.ts`.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";

  const token = await getAuthToken();
  const orderToken = token ? null : await getOrderToken(id);

  if (!token && !orderToken) {
    return NextResponse.json(
      { message: "You don't have permission to complete payment for this order." },
      { status: 403 }
    );
  }

  const result = await ordersBackend.paypalCapture(id, { idempotencyKey, token, orderToken });
  return proxyResponse(result);
}
