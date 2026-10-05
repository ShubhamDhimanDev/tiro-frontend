/**
 * Shared types for the Order/checkout/payment boundary.
 *
 * Mirrors docs/architecture/02-api-contract.md's "Cart, Checkout & Payment
 * endpoints" section (Phase 4, added 2026-09-22) and
 * docs/architecture/01-data-model.md's Commerce section. Verified directly
 * against the real backend this round (`OrderController`,
 * `StoreOrderRequest`) rather than trusting the doc alone — same
 * "independently verified against the actual controller" posture
 * `lib/booking/types.ts` documents for its own domain. Keep these in sync
 * with backend-agent's contract rather than inventing local variants.
 */

export const ORDER_STATUSES = [
  "pending_payment",
  "confirmed",
  "payment_failed",
  "refund_required",
  "completed",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded", "partially_refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface OrderCustomerInput {
  name: string;
  email: string;
  mobile?: string | null;
}

/**
 * `suburb_id` is a required FK to a backend `Suburb` row — resolved from a
 * Google Places-picked address via `resolveSuburbId()`
 * (`lib/checkout/address.ts`, backed by `GET /api/v1/suburbs`). Falls back
 * to `UNRESOLVED_SUBURB_ID` (a sentinel that deliberately fails
 * `exists:suburbs,id`) when that lookup can't resolve a single row — see
 * that function's doc comment for the distinct cases this covers.
 */
export interface OrderAddressInput {
  suburb_id: number;
  line1: string;
  line2?: string | null;
  lat: number;
  lng: number;
  access_instructions?: string | null;
}

/**
 * `rego`/`state` are accepted (shape-validated) but **not persisted
 * anywhere server-side this phase** — see `StoreOrderRequest`'s own
 * docblock and the task brief's note. Only `vehicle_id` survives (backfilled
 * onto the linked `Booking`). Still captured and sent per requirements §6.
 */
export interface OrderVehicleInput {
  vehicle_id?: number | null;
  rego?: string | null;
  state?: string | null;
  /** Phase 7 (persisted as the order's fitting details): free-text vehicle description and the wheels being replaced. */
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  wheels?: OrderWheel[];
}

/** `vehicle.wheels[]` values the order API accepts. */
export const ORDER_WHEELS = ["FL", "FR", "RL", "RR", "SPARE"] as const;
export type OrderWheel = (typeof ORDER_WHEELS)[number];

export interface OrderCreateInput {
  booking_id: number;
  customer: OrderCustomerInput;
  address: OrderAddressInput;
  vehicle?: OrderVehicleInput | null;
  /** Phase 7: fitting instructions for the technician, max 2000. */
  notes?: string | null;
  /** Phase 7: subscribe the customer email to the newsletter (source `checkout`). */
  newsletter_opt_in?: boolean;
}

export interface OrderTotals {
  subtotal: number;
  discount_total: number;
  tax_total: number;
  service_fee_total: number;
  grand_total: number;
  currency: string;
}

/**
 * `App\Enums\PaymentGateway`'s two now-implemented cases (`Zip` stays
 * reserved/unbuilt, untouched — see docs/architecture/03-integrations.md's
 * "PayPal as a second gateway" section, point 1). Exactly one is active at a
 * time, selected server-side; the frontend only ever branches on whichever
 * value this order's own `payment.gateway` actually reports.
 */
export const PAYMENT_GATEWAYS = ["stripe", "paypal"] as const;
export type PaymentGatewayName = (typeof PAYMENT_GATEWAYS)[number];

/**
 * Always the same three keys regardless of active gateway, with whichever
 * half doesn't apply set `null` — a stable, discriminated-by-`gateway` shape
 * rather than two differently-keyed response bodies to branch on
 * structurally (see docs/architecture/02-api-contract.md's `POST
 * /api/v1/orders` response shapes). A `null` `client_secret` on a PayPal
 * order (or a `null` `paypal_order_id` on a Stripe order) is expected, not
 * an error condition — only a `null` value on the field matching this
 * order's own `gateway` means payments genuinely aren't configured (see
 * `components/checkout/checkout-flow.tsx`'s gateway-aware "not configured"
 * check).
 */
export interface OrderPaymentInfo {
  gateway: PaymentGatewayName;
  client_secret: string | null;
  paypal_order_id: string | null;
}

export interface OrderLineItem {
  tyre_variant_id: number;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
}

export interface OrderBookingSummary {
  scheduled_date: string;
  slot_start: string;
  slot_end: string;
}

/**
 * Base shape shared by both endpoints. `id`/`order_number`/`status`/
 * `payment_status`/totals are always present. `order_token`/`order_token_issued`/
 * `payment` are creation-response-only (see `OrderCreateRecord` below) —
 * `GET /api/v1/orders/{order}` never includes them, same "absent, not
 * present-but-null" convention `BookingRecord` documents for
 * `manage_token`/`manage_token_issued`.
 */
export interface OrderRecord extends OrderTotals {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  /** Phase 6a: order-level flexible-booking discount, already inside `discount_total`. `null` when none. */
  flexible_discount?: { label: string; amount: number } | null;
  /** Only present on `GET /api/v1/orders/{order}` (`includeLineItemsAndBooking=true` server-side) — absent on the creation response. */
  line_items?: OrderLineItem[];
  /** Same as `line_items` above — `GET`-only, and `null` if the linked booking was somehow removed (defensive; shouldn't happen in practice since `Order.booking_id` is required). */
  booking?: OrderBookingSummary | null;
}

/**
 * `POST /api/v1/orders`'s response shape specifically — the only endpoint
 * that ever includes `order_token`/`order_token_issued`/`payment`.
 *
 * `order_token_issued` follows the identical semantics as `Booking`'s
 * `manage_token_issued` (see docs/architecture/02-api-contract.md's "One-time
 * secrets under idempotent replay" convention): `false`/absent for
 * authenticated requests, `true` with a value fresh or within 15 minutes of
 * creation, `true` with `order_token: null` outside that window on an
 * `Idempotency-Key` replay — modelled honestly rather than assumed away,
 * same posture `BookingCreateRecord` documents for its own equivalent case.
 */
export interface OrderCreateRecord extends OrderRecord {
  order_token_issued?: boolean;
  order_token?: string | null;
  payment: OrderPaymentInfo;
}

export interface OrderCreateResponse {
  data: OrderCreateRecord;
}

export interface OrderResponse {
  data: OrderRecord;
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
