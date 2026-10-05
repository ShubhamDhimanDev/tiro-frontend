import { NextResponse } from "next/server";
import { proxyResponse } from "@/lib/http/proxy-response";
import { ordersBackend } from "@/lib/orders/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { getOrderToken } from "@/lib/orders/order-token-cookie";

/**
 * GET /api/orders/{id} — proxies `GET /api/v1/orders/{order}`. Read-only, no
 * side effects. Same auth precedence as `app/api/booking/[id]/route.ts`:
 * the Sanctum bearer token if signed in, otherwise this order's own guest
 * token stored server-side by `POST /api/orders`
 * (`lib/orders/order-token-cookie.ts`) — never both, and never exposed to
 * client JS (this is exactly why this has to be a server-side proxy rather
 * than a direct client-side fetch to Laravel: only this Route Handler can
 * read the httpOnly order-token cookie to attach `X-Order-Token`).
 *
 * Short-circuits to `403` without a round trip when neither credential is
 * available, same as the booking equivalent — an unauthenticated request for
 * a genuinely nonexistent order id gets `403` here rather than Laravel's own
 * `404` (it 404s before its own auth check runs), a harmless minor behavioral
 * difference documented identically there.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = await getAuthToken();
  const orderToken = token ? null : await getOrderToken(id);

  if (!token && !orderToken) {
    return NextResponse.json({ message: "You don't have permission to view this order." }, { status: 403 });
  }

  const result = await ordersBackend.show(id, { token, orderToken });
  return proxyResponse(result);
}
