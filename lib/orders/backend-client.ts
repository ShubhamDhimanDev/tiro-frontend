import type { BackendResponse, OrderCreateInput } from "./types";

/**
 * Live wiring to Laravel's `POST /api/v1/orders` / `GET /api/v1/orders/{order}`
 * — see docs/architecture/02-api-contract.md's "Cart, Checkout & Payment
 * endpoints" section. Same conventions as `lib/booking/backend-client.ts`.
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching
 * `backend/.env`'s `APP_URL` for local dev. Every call here is
 * `cache: "no-store"` — order creation/state is inherently per-session and
 * time-sensitive, never cacheable.
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1`;

async function call(path: string, init: RequestInit = {}): Promise<BackendResponse<unknown>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch {
    return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
  }

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveOrdersBackend = {
  /**
   * Auth-checks the *booking* (`authorizeGuestOrOwner()`), not the not-yet-
   * created order — so `opts` takes the same `{ token, manageToken }` shape
   * as `lib/booking/backend-client.ts`'s mutation endpoints, keyed off the
   * booking's own guest manage token, not an order token (which doesn't
   * exist until this call succeeds).
   */
  create: (
    body: OrderCreateInput,
    opts: { idempotencyKey: string; token?: string | null; manageToken?: string | null }
  ) =>
    call("/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Idempotency-Key": opts.idempotencyKey,
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        ...(!opts.token && opts.manageToken ? { "X-Booking-Manage-Token": opts.manageToken } : {}),
      },
    }),

  /**
   * `GET /api/v1/orders/{order}` — authenticated owner or `X-Order-Token`
   * (this order's own guest-continuity token, distinct from the booking's
   * manage token used at creation time above).
   */
  show: (orderId: number | string, opts: { token?: string | null; orderToken?: string | null }) =>
    call(`/orders/${encodeURIComponent(String(orderId))}`, {
      method: "GET",
      headers: {
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        ...(!opts.token && opts.orderToken ? { "X-Order-Token": opts.orderToken } : {}),
      },
    }),

  /**
   * `POST /api/v1/orders/{order}/paypal-capture` — PayPal only, called by
   * `components/checkout/paypal-payment-step.tsx`'s `onApprove` callback
   * immediately after the buyer approves. Same auth precedence as `show()`
   * above (authenticated owner or `X-Order-Token`), plus a required
   * `Idempotency-Key` — a double-submit (double-click, browser back-button)
   * must not attempt a second PayPal capture call. See
   * docs/architecture/02-api-contract.md's `POST
   * /api/v1/orders/{order}/paypal-capture` section.
   */
  paypalCapture: (
    orderId: number | string,
    opts: { idempotencyKey: string; token?: string | null; orderToken?: string | null }
  ) =>
    call(`/orders/${encodeURIComponent(String(orderId))}/paypal-capture`, {
      method: "POST",
      headers: {
        "Idempotency-Key": opts.idempotencyKey,
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        ...(!opts.token && opts.orderToken ? { "X-Order-Token": opts.orderToken } : {}),
      },
    }),
};

export type OrdersBackend = typeof liveOrdersBackend;
