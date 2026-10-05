import type { BookingAddonKey, BookingItemInput, BookingPosition } from "@/lib/booking/types";

/**
 * Shared types for the cart/checkout pricing boundary.
 *
 * Mirrors docs/architecture/02-api-contract.md's "Cart, Checkout & Payment
 * endpoints" section (Phase 4, added 2026-09-22) — specifically
 * `POST /api/v1/cart/calculate`'s two mutually exclusive input modes and its
 * single response shape. Verified directly against the real backend this
 * round (`CartController`, `CartCalculateRequest`, `PricingService`) rather
 * than trusting the doc alone — same "independently verified against the
 * actual controller" posture `lib/booking/types.ts` documents for its own
 * domain.
 *
 * `BookingItemInput`/`BookingAddonKey`/`BookingPosition` are re-exported from
 * `lib/booking/types` rather than redeclared here — the cart's line items
 * become a `Booking`'s line items the moment a hold is created (see
 * `lib/cart/cart.ts`'s doc comment), so this is one shape, not two drifting
 * copies.
 */
export type { BookingAddonKey, BookingItemInput, BookingPosition };

/** Mode 1 — cart page, before a booking exists. `items` omits `position`; pricing doesn't care which axle a tyre is for, only `booking-slots`/`bookings` do. */
export interface CartCalculateItemsInput {
  tyre_variant_id: number;
  quantity: number;
}

export interface CartCalculateModeItems {
  zone_id: string;
  items: CartCalculateItemsInput[];
  /** Optional promo code (case-insensitive, trimmed, max 40). Mode 1 only. */
  promo_code?: string | null;
  /** Preview the flexible-booking discount. Mode 1 only. */
  flexible?: boolean;
}

/** Mode 2 — checkout page, against an already-created booking. Zone/items are derived server-side from the booking; never re-supplied. */
export interface CartCalculateModeBooking {
  booking_id: number;
}

export type CartCalculateInput = CartCalculateModeItems | CartCalculateModeBooking;

export function isBookingMode(input: CartCalculateInput): input is CartCalculateModeBooking {
  return "booking_id" in input;
}

/**
 * The single {@see Promotion} contributing the most discount to a line —
 * `PricingLine::$appliedPromotion` (Phase 5, `docs/architecture/02-api-contract.md`'s
 * "Promotions & Price-Guarantee endpoints" section, verified directly
 * against `app/Services/Commerce/PricingLine.php`). Always present on every
 * line (never omitted), `null` when no promotion applies to that line.
 */
export interface AppliedPromotionLine {
  id: number;
  name: string;
  type: string;
}

/**
 * Cart-level summary entry — `PricingResult::$appliedPromotions`, one per
 * distinct promotion actually applied anywhere in the cart, for "You saved
 * $X via {name}" messaging. Unlike the per-line shape above, this one
 * carries its own `discount_amount` (the promotion's total contribution
 * across every line it touched), since a single promotion (e.g. 4-for-3)
 * can span multiple lines.
 */
export interface AppliedPromotionSummary extends AppliedPromotionLine {
  discount_amount: number;
  /** Phase 6a: the promotion title (else its name), for display. */
  label?: string;
  /** Same number as `discount_amount`. */
  amount?: number;
  /** `code` when the typed code triggered it, else `auto`. */
  source?: "code" | "auto";
  code?: string | null;
}

/** One row under "You saved" (Phase 6a `discount_lines`). Positive cents. */
export interface DiscountLine {
  type: "promotion" | "flexible";
  label: string;
  amount: number;
}

export interface FlexibleDiscount {
  label: string;
  amount: number;
}

export const PROMO_ERROR_CODES = [
  "promo_code_invalid",
  "promo_code_not_started",
  "promo_code_expired",
  "promo_code_exhausted",
  "promo_code_ineligible",
  "promo_code_not_combinable",
] as const;

/** A code was sent but not applied. Not an HTTP error: the cart is priced without it. `message` is user-facing. */
export interface PromoError {
  code: string;
  message: string;
}

/** One priced line — mirrors `PricingLine`/`CartController::calculate()`'s per-item breakdown exactly. */
export interface CartLine {
  tyre_variant_id: number;
  quantity: number;
  unit_price: number;
  promotional_price: number | null;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  applied_promotion: AppliedPromotionLine | null;
}

/**
 * `service_fee_total` is still a flat `0` placeholder this phase
 * (`PriceRule` isn't retrofitted yet — see [06-open-decisions.md](../../../docs/architecture/06-open-decisions.md)
 * item 7); `discount_total` is now real, computed by Phase 5's promotions
 * engine. `tax_total` is an extracted, informational breakdown —
 * GST-inclusive convention, never additive on top of `grand_total`/
 * `unit_price`. See docs/architecture/01-data-model.md's "Money & tax
 * convention" section.
 */
export interface CartTotals {
  subtotal: number;
  discount_total: number;
  tax_total: number;
  service_fee_total: number;
  grand_total: number;
  currency: string;
}

export interface CartCalculateData extends CartTotals {
  lines: CartLine[];
  /** Cart-level promotions summary — always present (empty array when nothing applies), same "field always present, value reflects state" convention as `manage_token_issued`. `cart/calculate`-only; `Order`'s own response shape doesn't carry this (see `lib/orders/types.ts`). */
  applied_promotions: AppliedPromotionSummary[];
  /** Phase 6a: flat list to render under "You saved". Optional here so older fixtures still type-check; the API always sends it. */
  discount_lines?: DiscountLine[];
  /** Phase 6a: `null` or `{ label, amount }`. */
  flexible_discount?: FlexibleDiscount | null;
  /** Phase 6a: `null`, or why a sent code was not applied. */
  promo_error?: PromoError | null;
}

export interface CartCalculateResponse {
  data: CartCalculateData;
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
