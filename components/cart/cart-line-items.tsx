"use client";

import Link from "next/link";
import { AnimatePresence, m } from "framer-motion";
import { PriceTick } from "@/components/motion/price-tick";
import { useCart } from "@/components/cart/cart-provider";
import { TyreImage } from "@/components/catalog/tyre-image";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { LinkPendingDot } from "@/components/ui/link-pending-dot";
import { BOOKING_ADDONS, type BookingPosition } from "@/lib/booking/types";
import { formatMoney } from "@/lib/catalog/format-money";
import { splitTyreLabel } from "@/lib/cart/label";
import type { CartItem } from "@/lib/cart/cart";
import type { CartLine } from "@/lib/cart/types";

const ADDON_LABEL: Record<string, string> = {
  alignment: "Wheel alignment",
  locking_nuts: "Locking wheel nuts",
};

const POSITION_LABEL: Record<BookingPosition, string> = { all: "All wheels", front: "Front axle", rear: "Rear axle" };

/**
 * Cart contents. Used on the cart page (`editable`, with `lines` from
 * `cart/calculate` mode 1 for per-line pricing) and read-only on the booking
 * page (`editable={false}`, no prices: the total sits beside the slot choice).
 *
 * `lines` is matched back to each cart row by `tyre_variant_id` only: the
 * backend prices per variant, not per axle position (see `toCalculateItems`
 * in `lib/cart/cart.ts`, which merges front/rear rows of one variant into one
 * priced line). So a staggered cart's front/rear rows for the same variant
 * both show the same `unit_price`, and each row's own line total is computed
 * client-side as `unit_price x that row's quantity`.
 *
 * The promotion badge keeps `data-testid="line-promo-badge"`; the cart e2e spec
 * and unit tests count it (badge + the totals breakdown = two mentions).
 */
export function CartLineItems({ editable, lines }: { editable: boolean; lines?: CartLine[] | null }) {
  const { state, setQuantity, remove, toggleAddonKey } = useCart();

  function priceFor(tyreVariantId: number): CartLine | undefined {
    return lines?.find((line) => line.tyre_variant_id === tyreVariantId);
  }

  if (state.items.length === 0 && state.addons.length === 0) return null;

  if (!editable) {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-rest">
        <div className="flex items-center justify-between gap-3">
          <h2 className="type-h3">Your tyres</h2>
          <Link href="/cart" className="tap-target inline-flex items-center text-sm font-semibold text-black underline underline-offset-2">
            Edit cart
          </Link>
        </div>
        <ul className="flex flex-col gap-3">
          {state.items.map((item) => (
            <ReadOnlyRow key={`${item.tyre_variant_id}::${item.position}`} item={item} />
          ))}
        </ul>
        {state.addons.length > 0 && (
          <p className="text-sm text-muted">Extras: {state.addons.map((a) => ADDON_LABEL[a] ?? a).join(", ")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-rest md:p-6">
      <h2 className="type-h3">Your tyres</h2>

      {state.items.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          <AnimatePresence initial={false}>
          {state.items.map((item) => {
            const price = priceFor(item.tyre_variant_id);
            const { name, size } = splitTyreLabel(item.label);
            const key = { tyre_variant_id: item.tyre_variant_id, position: item.position };
            return (
              <m.li
                key={`${item.tyre_variant_id}::${item.position}`}
                layout="position"
                exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.25 } }}
                data-testid="cart-line"
                className="flex flex-col gap-3 overflow-hidden py-4 first:pt-0 last:pb-0"
              >
                <div className="flex gap-3">
                  <TyreImage
                    src={item.image}
                    alt=""
                    sizes="88px"
                    className="h-20 w-20 shrink-0 rounded-control sm:h-24 sm:w-24"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={`/tyres/${item.slug}`}
                      className="inline-flex min-h-11 items-center font-semibold leading-snug text-ink underline-offset-2 hover:text-black hover:underline"
                    >
                      {name}
                      {/* PDP has no route-level loading.tsx by design; this dot is the only feedback that the click registered. */}
                      <LinkPendingDot />
                    </Link>
                    {size && <p className="type-mono text-sm text-muted">{size}</p>}
                    <p className="text-sm text-muted">{POSITION_LABEL[item.position]}</p>
                    {price?.applied_promotion && (
                      <span
                        data-testid="line-promo-badge"
                        className="mt-0.5 inline-flex w-fit items-center rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-ink"
                      >
                        {price.applied_promotion.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <QuantityStepper
                    label={`Quantity for ${item.label}`}
                    value={item.quantity}
                    onChange={(next) => setQuantity(key, next)}
                  />
                  <div className="ml-auto text-right leading-tight">
                    {price ? (
                      <>
                        <p className="font-mono text-lg font-bold text-ink"><PriceTick value={formatMoney(price.unit_price * item.quantity, "AUD")} /></p>
                        <p className="text-xs text-muted">{formatMoney(price.unit_price, "AUD")} each, inc. GST</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted" aria-live="polite">
                        Pricing&hellip;
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`Remove ${item.label} from cart`}
                  onClick={() => remove(key)}
                  className="tap-target -mt-2 inline-flex w-fit items-center text-sm font-semibold text-black underline underline-offset-2"
                >
                  Remove
                </button>
              </m.li>
            );
          })}
          </AnimatePresence>
        </ul>
      )}

      <fieldset className="flex flex-col gap-1 border-0 border-t border-solid border-line p-0 pt-4">
        <legend className="mb-1 text-sm font-semibold text-ink">Optional extras</legend>
        {BOOKING_ADDONS.map((addon) => (
          <label key={addon} className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink">
            <input
              type="checkbox"
              checked={state.addons.includes(addon)}
              onChange={() => toggleAddonKey(addon)}
              className="h-5 w-5 shrink-0 rounded-sm border-line accent-green"
            />
            {ADDON_LABEL[addon]}
          </label>
        ))}
        <p className="text-sm text-muted">
          Extras aren&apos;t in the total below. We confirm their price at checkout.
        </p>
      </fieldset>
    </div>
  );
}

function ReadOnlyRow({ item }: { item: CartItem }) {
  const { name, size } = splitTyreLabel(item.label);
  return (
    <li className="flex items-center gap-3">
      <TyreImage src={item.image} alt="" sizes="56px" className="h-14 w-14 shrink-0 rounded-control" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        <p className="text-xs text-muted">
          {size && <span className="type-mono">{size} &middot; </span>}
          {POSITION_LABEL[item.position]}
        </p>
      </div>
      <span className="shrink-0 font-mono text-sm font-semibold text-ink">&times; {item.quantity}</span>
    </li>
  );
}
