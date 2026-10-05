import type { OrdersBackend } from "./backend-client";
import type { OrderCreateInput, OrderCreateRecord, OrderRecord, OrderStatus, PaymentStatus } from "./types";

/**
 * In-memory dev/test stub for `POST /api/v1/orders` / `GET /api/v1/orders/{order}`,
 * opt-in via `ORDERS_BACKEND=stub` — see `backend.ts` for why live is the
 * default. Good enough to exercise the checkout submit -> confirmation-page
 * UI end-to-end without a running Laravel process or Stripe keys.
 *
 * Deliberately decoupled from `lib/booking/backend-stub.ts`'s in-memory
 * bookings, same reasoning `lib/cart/backend-stub.ts` documents for its own
 * mode 2 — any positive-integer `booking_id` is accepted and priced with a
 * fixed synthetic total, not the booking's real line items. `client_secret`
 * is a fake, non-functional placeholder (`pi_stub_..._secret_stub`) — it
 * will not confirm against Stripe's real API, since there's no test key to
 * exercise it against yet (see the completion report's Stripe-keys note);
 * this stub only exists to exercise this app's own request/response wiring
 * and the confirmation page's rendering, not a real payment.
 */

const FIXED_TOTALS = { subtotal: 75600, discount_total: 0, tax_total: 6873, service_fee_total: 0, grand_total: 75600 };

interface StubOrder {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  guestToken: string | null;
  isGuest: boolean;
  idempotencyKey: string;
}

const orders = new Map<number, StubOrder>();
const byIdempotencyKey = new Map<string, number>();
let nextId = 8000;

function toRecord(order: StubOrder, includeLineItems: boolean): OrderRecord {
  return {
    id: order.id,
    order_number: order.orderNumber,
    status: order.status,
    payment_status: order.paymentStatus,
    currency: "AUD",
    ...FIXED_TOTALS,
    ...(includeLineItems
      ? {
          line_items: [
            { tyre_variant_id: 101, quantity: 2, unit_price: 18900, discount_amount: 0, tax_amount: 3436, line_total: 37800 },
            { tyre_variant_id: 102, quantity: 2, unit_price: 18900, discount_amount: 0, tax_amount: 3436, line_total: 37800 },
          ],
          booking: { scheduled_date: "2026-09-25", slot_start: "09:00", slot_end: "09:52" },
        }
      : {}),
  };
}

function toCreateRecord(order: StubOrder): OrderCreateRecord {
  return {
    ...toRecord(order, false),
    order_token_issued: order.isGuest,
    ...(order.isGuest && order.guestToken ? { order_token: order.guestToken } : {}),
    // Stub always simulates the Stripe leg (no fake `paypal_order_id`
    // generator exists here) — `paypal_order_id` is still present and
    // `null`, matching the real backend's "always the same three keys"
    // contract (see `lib/orders/types.ts`'s `OrderPaymentInfo` doc comment),
    // so nothing consuming this stub response has to special-case its shape.
    payment: { gateway: "stripe", client_secret: `pi_stub_${order.id}_secret_stub`, paypal_order_id: null },
  };
}

export const stubOrdersBackend: OrdersBackend = {
  async create(body: OrderCreateInput, opts: { idempotencyKey: string; token?: string | null; manageToken?: string | null }) {
    const existingId = byIdempotencyKey.get(opts.idempotencyKey);
    if (existingId !== undefined) {
      const existing = orders.get(existingId);
      if (existing) return { status: 201, body: { data: toCreateRecord(existing) } };
    }

    const bookingId = Number(body.booking_id);
    if (!body.booking_id || Number.isNaN(bookingId) || bookingId <= 0) {
      return { status: 404, body: { message: "Booking not found." } };
    }
    if (!opts.token && !opts.manageToken) {
      return { status: 403, body: { message: "You don't have permission to check out this booking." } };
    }

    const id = nextId++;
    const isGuest = !opts.token;
    const order: StubOrder = {
      id,
      orderNumber: `TMS-STUB-${String(id).padStart(4, "0")}`,
      status: "pending_payment",
      paymentStatus: "pending",
      guestToken: isGuest ? `stub-order-token-${id}-${Date.now()}` : null,
      isGuest,
      idempotencyKey: opts.idempotencyKey,
    };

    orders.set(id, order);
    byIdempotencyKey.set(opts.idempotencyKey, id);

    return { status: 201, body: { data: toCreateRecord(order) } };
  },

  async show(orderId: number | string, opts: { token?: string | null; orderToken?: string | null }) {
    const order = orders.get(Number(orderId));
    if (!order) return { status: 404, body: { message: "Order not found." } };

    if (opts.token) {
      if (order.isGuest) return { status: 403, body: { message: "You don't have permission to view this order." } };
    } else if (!opts.orderToken || opts.orderToken !== order.guestToken) {
      return { status: 403, body: { message: "You don't have permission to view this order." } };
    }

    return { status: 200, body: { data: toRecord(order, true) } };
  },

  /**
   * Stub never produces a `gateway: "paypal"` order (see `toCreateRecord`
   * above), so `PayPalPaymentStep` never actually calls this in stub mode —
   * implemented anyway to keep `stubOrdersBackend` structurally complete
   * against `OrdersBackend` (`lib/orders/backend-client.ts`) rather than
   * leaving the type checker to paper over a missing method. Mirrors
   * `show()`'s auth check, then simulates a successful capture.
   */
  async paypalCapture(orderId: number | string, opts: { idempotencyKey: string; token?: string | null; orderToken?: string | null }) {
    const order = orders.get(Number(orderId));
    if (!order) return { status: 404, body: { message: "Order not found." } };

    if (opts.token) {
      if (order.isGuest) return { status: 403, body: { message: "You don't have permission to complete payment for this order." } };
    } else if (!opts.orderToken || opts.orderToken !== order.guestToken) {
      return { status: 403, body: { message: "You don't have permission to complete payment for this order." } };
    }

    order.status = "confirmed";
    order.paymentStatus = "paid";

    return { status: 200, body: { data: toRecord(order, true) } };
  },
};
