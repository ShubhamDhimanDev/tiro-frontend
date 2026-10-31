import { NextResponse } from "next/server";
import { proxyResponse } from "@/lib/http/proxy-response";
import { ordersBackend } from "@/lib/orders/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { getOrderToken } from "@/lib/orders/order-token-cookie";

/**
 * POST /api/orders/{id}/stripe-confirm — proxies
 * `POST /api/v1/orders/{order}/stripe-confirm`. Called by
 * `components/checkout/stripe-payment-step.tsx` right after
 * `stripe.confirmPayment()` resolves, so the order is confirmed as soon as
 * Stripe reports the payment succeeded instead of waiting on the webhook.
 * Laravel re-reads the PaymentIntent from Stripe itself — nothing in this
 * request says the payment succeeded.
 *
 * Same auth precedence and `403` short-circuit as
 * `app/api/orders/[id]/paypal-capture/route.ts`: the Sanctum bearer token if
 * signed in, otherwise this order's own guest token from the httpOnly
 * cookie (only a server-side Route Handler can read it to attach
 * `X-Order-Token`). No `Idempotency-Key` — the endpoint is naturally
 * idempotent.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = await getAuthToken();
  const orderToken = token ? null : await getOrderToken(id);

  if (!token && !orderToken) {
    return NextResponse.json(
      { message: "You don't have permission to complete payment for this order." },
      { status: 403 }
    );
  }

  const result = await ordersBackend.stripeConfirm(id, { token, orderToken });
  return proxyResponse(result);
}
