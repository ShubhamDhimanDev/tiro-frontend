import { FIXTURE_VARIANTS } from "@/lib/catalog/fixtures";
import type { CartBackend } from "./backend-client";
import { isBookingMode, type BackendResponse, type CartCalculateInput, type CartLine } from "./types";

/**
 * In-memory dev/test stub for `POST /api/v1/cart/calculate`, opt-in via
 * `CART_BACKEND=stub` — see `backend.ts` for why live is the default.
 *
 * Mode 1 (`{ zone_id, items }`) prices directly against
 * `lib/catalog/fixtures.ts`'s `FIXTURE_VARIANTS`, using the exact GST-
 * inclusive extraction formula documented in
 * docs/architecture/01-data-model.md's "Money & tax convention" section
 * (`tax_total = round(grand_total / 11)`, never additive) — good enough to
 * exercise the cart page's totals UI end-to-end without a running Laravel
 * process. `discount_total`/`discount_amount`/`service_fee_total` stay flat
 * `0` here (`applied_promotion`/`applied_promotions` correspondingly
 * `null`/`[]`) — this stub doesn't replicate the promotions evaluation
 * engine (eligibility matching, 4-for-3 pooling), only the response shape,
 * same "good enough to exercise the UI, not a faithful replay of pricing
 * logic" posture as every other stub in this app. Prefer `CART_BACKEND=live`
 * (the default) to see real promo discounts/badges.
 *
 * Mode 2 (`{ booking_id }`) has a real limitation, flagged rather than
 * silently faked precisely: this stub has no visibility into
 * `lib/booking/backend-stub.ts`'s in-memory bookings (deliberately kept
 * decoupled — a booking can be created against the live backend while cart
 * pricing runs against the stub, or vice versa, and cross-wiring two
 * independent stub modules for a dev-only convenience isn't worth the
 * coupling). Any positive-integer `booking_id` returns a fixed, deterministic
 * two-tyre preview instead of the booking's actual line items — enough to
 * exercise the checkout order-summary UI's rendering, not a faithful replay
 * of what was actually booked. Prefer `CART_BACKEND=live` (the default) for
 * anything that needs mode 2 to reflect a real cart.
 */

const GST_DIVISOR = 11;

/** Stub promo codes (Phase 6a shapes, invented rules): WELCOME10 is 10% off; EXPIRED10 always reports expired; anything else is invalid. */
const STUB_PROMO = { code: "WELCOME10", percent: 10, label: "10% off your first order", id: 12, name: "Welcome 10% off" };
const STUB_FLEXIBLE_CENTS = 1000;

function priceMode1(
  items: { tyre_variant_id: number; quantity: number }[],
  opts: { promo_code?: string | null; flexible?: boolean } = {},
): BackendResponse<unknown> {
  const lines: CartLine[] = [];
  for (const item of items) {
    const variant = FIXTURE_VARIANTS.find((v) => v.id === item.tyre_variant_id);
    if (!variant) {
      return {
        status: 422,
        body: { message: "The given data was invalid.", errors: { items: ["One or more tyre variants weren't found."] } },
      };
    }
    const unitPrice = variant.promotional_price ?? variant.unit_price;
    const lineTotal = unitPrice * item.quantity;
    lines.push({
      tyre_variant_id: item.tyre_variant_id,
      quantity: item.quantity,
      unit_price: variant.unit_price,
      promotional_price: variant.promotional_price,
      discount_amount: 0,
      tax_amount: Math.round(lineTotal / GST_DIVISOR),
      line_total: lineTotal,
      applied_promotion: null,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);

  const typed = (opts.promo_code ?? "").trim().toUpperCase();
  let promoError: { code: string; message: string } | null = null;
  let promoDiscount = 0;
  if (typed) {
    if (typed === STUB_PROMO.code) {
      promoDiscount = Math.round((subtotal * STUB_PROMO.percent) / 100);
      let remaining = promoDiscount;
      lines.forEach((line, index) => {
        const share = index === lines.length - 1 ? remaining : Math.round((line.line_total / subtotal) * promoDiscount);
        remaining -= share;
        line.discount_amount = share;
        line.line_total -= share;
        line.applied_promotion = { id: STUB_PROMO.id, name: STUB_PROMO.name, type: "percentage" };
      });
    } else if (typed === "EXPIRED10") {
      promoError = { code: "promo_code_expired", message: "That promo code has expired." };
    } else {
      promoError = { code: "promo_code_invalid", message: "That promo code is not valid." };
    }
  }
  const flexibleAmount = opts.flexible ? STUB_FLEXIBLE_CENTS : 0;
  const flexibleDiscount = flexibleAmount > 0 ? { label: "Flexible booking discount", amount: flexibleAmount } : null;
  const discountTotal = promoDiscount + flexibleAmount;
  const grandTotal = subtotal - discountTotal;
  const discountLines = [
    ...(promoDiscount > 0 ? [{ type: "promotion" as const, label: STUB_PROMO.label, amount: promoDiscount }] : []),
    ...(flexibleDiscount ? [{ type: "flexible" as const, label: flexibleDiscount.label, amount: flexibleDiscount.amount }] : []),
  ];

  return {
    status: 200,
    body: {
      data: {
        subtotal,
        discount_total: discountTotal,
        tax_total: Math.round(grandTotal / GST_DIVISOR),
        service_fee_total: 0,
        grand_total: grandTotal,
        currency: "AUD",
        lines,
        applied_promotions:
          promoDiscount > 0
            ? [
                {
                  id: STUB_PROMO.id,
                  name: STUB_PROMO.name,
                  type: "percentage",
                  discount_amount: promoDiscount,
                  label: STUB_PROMO.label,
                  amount: promoDiscount,
                  source: "code" as const,
                  code: STUB_PROMO.code,
                },
              ]
            : [],
        discount_lines: discountLines,
        flexible_discount: flexibleDiscount,
        promo_error: promoError,
      },
    },
  };
}

/** See the module doc comment — a fixed stand-in, not the booking's real line items. */
function priceMode2Fallback(): BackendResponse<unknown> {
  return priceMode1([
    { tyre_variant_id: 101, quantity: 2 },
    { tyre_variant_id: 102, quantity: 2 },
  ]);
}

export const stubCartBackend: CartBackend = {
  async calculate(input: CartCalculateInput) {
    if (isBookingMode(input)) {
      const bookingId = Number(input.booking_id);
      if (!input.booking_id || Number.isNaN(bookingId) || bookingId <= 0) {
        return { status: 404, body: { message: "Booking not found." } };
      }
      return priceMode2Fallback();
    }

    const zoneId = Number(input.zone_id);
    if (!input.zone_id || Number.isNaN(zoneId) || zoneId <= 0) {
      return { status: 404, body: { message: "Service zone not found." } };
    }
    return priceMode1(input.items, { promo_code: input.promo_code, flexible: input.flexible });
  },
};
