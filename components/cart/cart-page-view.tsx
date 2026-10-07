"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { CartExtrasPanel } from "@/components/cart/cart-extras-panel";
import { CartTotalsSummary } from "@/components/cart/cart-totals";
import { useLivePricing } from "@/components/cart/use-live-pricing";
import { TyreImage } from "@/components/catalog/tyre-image";
import { ImageSlot } from "@/components/page/image-slot";
import { ServiceError } from "@/components/ui/service-error";
import { Button, buttonClassName } from "@/components/ui/button";
import { CartIcon, CheckIcon, MinusIcon, PinIcon, PlusIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/catalog/format-money";
import { splitTyreLabel } from "@/lib/cart/label";
import { rowPrice } from "@/lib/cart/live-lines";
import { FITTING_INCLUSIONS } from "@/lib/site/inclusions";

/**
 * The cart page body: lines with quantity and remove, inclusions, and a
 * summary with the flexible discount, promo code and Checkout.
 *
 * Contents live in localStorage (`lib/cart/cart.ts`: there is no server-side
 * cart). Every price, discount and the total come from `cart/calculate`
 * (`useLivePricing`) once a service zone is known; without one the lines show
 * and the summary asks for a location instead of showing a price.
 */
export function CartPageView() {
  const { state, hydrated, setQuantity, remove } = useCart();
  const { pricing, zoneId, zoneLoading, openPicker } = useLivePricing();

  if (hydrated === false) return <div className="h-64 animate-pulse rounded-card bg-chip" aria-hidden />;

  if (state.items.length === 0) {
    return (
      <div
        data-testid="cart-empty"
        className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-card border border-line bg-surface px-6 py-12 text-center shadow-rest"
      >
        <ImageSlot slot="empty-cart" rounded={false} className="w-56" icon={<CartIcon className="h-8 w-8" />} />
        <div>
          <h2 className="type-h3">Your cart is currently empty</h2>
          <p className="mt-1 text-muted">Find your tyres and we will fit them at your place.</p>
        </div>
        <Link href="/tyres" className={buttonClassName({ variant: "green", fullWidth: true })}>
          Shop tyres now
        </Link>
      </div>
    );
  }

  const data = pricing.status === "ready" ? pricing.data : null;
  const count = state.items.reduce((n, it) => n + it.quantity, 0);
  const totalLabel = data ? formatMoney(data.grand_total, data.currency) : null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <ul aria-label="Cart items" className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface shadow-rest">
          {state.items.map((item) => {
            const { name, size } = splitTyreLabel(item.label);
            const key = { tyre_variant_id: item.tyre_variant_id, position: item.position };
            const price = rowPrice(data?.lines, item);
            return (
              <li key={`${item.tyre_variant_id}::${item.position}`} data-testid="cart-line" className="flex gap-4 p-4 md:p-5">
                <TyreImage src={item.image} alt="" sizes="112px" className="h-24 w-24 shrink-0 rounded-control md:h-28 md:w-28" />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/tyres/${item.slug}`} className="text-base font-extrabold leading-tight text-black hover:underline">
                        {name}
                      </Link>
                      {size && <p className="text-sm text-muted">{size}</p>}
                      {price?.promotion && (
                        <span
                          data-testid="line-promo-badge"
                          className="mt-1 inline-flex w-fit items-center rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-ink"
                        >
                          {price.promotion}
                        </span>
                      )}
                      {price && <p className="mt-1 text-sm text-muted">{formatMoney(price.unit)} each</p>}
                    </div>
                    <p className="type-mono shrink-0 text-lg font-extrabold text-black" aria-live="polite">
                      {price ? formatMoney(price.total) : pricing.status === "loading" ? "Pricing…" : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div role="group" aria-label={`Quantity for ${name}`} className="inline-flex items-center rounded-control border border-field">
                      <button
                        type="button"
                        aria-label={`Decrease quantity for ${name}`}
                        disabled={item.quantity <= 1}
                        onClick={() => setQuantity(key, item.quantity - 1)}
                        className="flex h-11 w-11 items-center justify-center text-black disabled:text-muted"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="type-mono w-9 text-center text-[15px] font-bold" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity for ${name}`}
                        disabled={item.quantity >= 20}
                        onClick={() => setQuantity(key, item.quantity + 1)}
                        className="flex h-11 w-11 items-center justify-center text-black disabled:text-muted"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(key)}
                      className="tap-target px-1 text-sm font-medium text-muted underline underline-offset-2 hover:text-black"
                    >
                      Remove<span className="sr-only"> {name}</span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <section aria-labelledby="cart-inclusions" className="rounded-card border border-line bg-surface p-4 shadow-rest md:p-6">
          <h2 id="cart-inclusions" className="type-h3">
            Included with every fitting
          </h2>
          <ul className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {FITTING_INCLUSIONS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <span className="leading-snug">
                  <span className="block font-bold text-black">{item.title}</span>
                  <span className="block text-sm text-muted">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside aria-label="Cart summary" className="mt-6 lg:sticky lg:top-24 lg:mt-0">
        <div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5 shadow-rest md:p-6">
          <h2 className="type-h3">Order summary</h2>
          <p className="-mt-3 text-sm text-muted">
            {count} {count === 1 ? "tyre" : "tyres"}
          </p>

          {pricing.status === "idle" && !zoneLoading && !zoneId && (
            <div data-testid="cart-location-prompt" className="flex flex-col gap-3 rounded-control bg-band p-4 text-sm">
              <p className="text-black">Enter your suburb or postcode to see prices for your cart.</p>
              <Button variant="black" size="sm" onClick={openPicker} className="w-fit">
                <PinIcon aria-hidden="true" className="h-4 w-4" />
                Set your location
              </Button>
            </div>
          )}
          {(pricing.status === "loading" || zoneLoading) && <div className="h-40 animate-pulse rounded-control bg-chip" aria-hidden />}
          {pricing.status === "error" && (
            <ServiceError message={pricing.message} onRetry={pricing.retry} />
          )}
          {data && (
            <div data-testid="cart-total">
              <CartTotalsSummary
                totals={data}
                appliedPromotions={data.applied_promotions}
                discountLines={data.discount_lines}
                flexibleDiscount={data.flexible_discount}
                hideHeading
              />
            </div>
          )}

          <CartExtrasPanel pricing={pricing} idPrefix="cart" />

          {/* Wrapper hides it below lg (the sticky bar carries Checkout there); a `hidden` class on the link itself loses to the button's own `inline-flex`. */}
          <div className="hidden lg:block">
            <Link href="/checkout" className={buttonClassName({ variant: "green", size: "lg", fullWidth: true })}>
              Checkout
            </Link>
          </div>
          <Link href="/tyres" className={buttonClassName({ variant: "secondary", fullWidth: true })}>
            Continue shopping
          </Link>
          <p className="hidden text-sm text-muted lg:block">You pick a fitting date and time next. Nothing is charged until you pay.</p>
        </div>
      </aside>

      <div
        data-testid="cart-sticky-bar"
        className="sticky bottom-0 z-30 -mx-5 mt-6 border-t border-line bg-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-raised md:-mx-6 md:px-6 lg:hidden"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 leading-tight">
            {totalLabel ? (
              <>
                <p className="type-mono text-xl font-extrabold text-black">{totalLabel}</p>
                <p className="text-sm text-muted">Total inc. GST</p>
              </>
            ) : (
              <p className="text-sm font-medium leading-tight text-black">Set location for prices</p>
            )}
          </div>
          <Link href="/checkout" className={buttonClassName({ variant: "green", className: "shrink-0" })}>
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
