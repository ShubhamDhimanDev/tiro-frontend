"use client";

import { PriceTick } from "@/components/motion/price-tick";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FittingDateStrip, FittingLocationStrip, useFittingSelection } from "@/components/checkout/fitting-date-strip";
import { LocationCaptureForm } from "@/components/location/location-capture-form";
import { useLocation } from "@/components/location/location-provider";
import { BnplLines } from "@/components/catalog/bnpl-lines";
import { PdpNextSlot } from "@/components/catalog/pdp-next-slot";
import { usePdpBuy } from "@/components/catalog/pdp-buy-context";
import { StockBadge } from "@/components/catalog/stock-badge";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { CalendarIcon, CheckIcon, PinIcon, TruckIcon, WrenchIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/catalog/format-money";
import { QUANTITY_STEPS } from "@/lib/catalog/mock-merchandising";

/** The quantity flagged "Most popular" (a full set). */
const POPULAR_QUANTITY = 4;

/** "Includes ..." line: the site's canonical value proposition (fitting, balancing, valves, old-tyre recycling). */
export const INCLUDES_LINE = "Includes fitting, balancing, valves and old-tyre recycling.";

/**
 * Price block. The page is static, so the server can't know whether the visitor
 * already has a location: the loading skeleton is replaced after hydration by
 * either the "no location" form (about 185px) or the price (about 120px).
 * Heights are reserved so that swap stays small whichever way it goes: the
 * skeleton (152px) sits between the two, and every price-state branch reserves
 * 120px. Measured on a 390px phone with 4x CPU + Slow 4G: CLS 0.276 when the
 * skeleton was 96px and the form was about 290px; an earlier Lighthouse run
 * saw 0.224 when the branches had different heights.
 */
function PriceBlock() {
  const { availability, unitCents } = usePdpBuy();

  if (availability.status === "zone-loading" || availability.status === "loading") {
    return <div className="min-h-[9.5rem] animate-pulse rounded-control bg-chip" aria-hidden />;
  }

  if (availability.status === "no-zone") {
    return (
      <div className="rounded-card border border-line bg-band p-4" data-testid="pdp-fitting-teaser">
        <p className="mb-3 flex items-start gap-2 text-sm text-black">
          <CalendarIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink" />
          Enter your suburb to see the price and the next available fitting time.
        </p>
        <LocationCaptureForm />
      </div>
    );
  }

  if (availability.status === "error") {
    return (
      <div className="flex min-h-[7.5rem] flex-col justify-center">
        <p role="alert" className="text-sm msg-error">
          {availability.message}
        </p>
      </div>
    );
  }

  const { data } = availability;

  if (data.stock_status === "unavailable_in_zone") {
    return (
      <div className="flex min-h-[7.5rem] flex-col justify-center msg-warning px-4 py-3 text-sm text-black">
        This tyre isn&apos;t currently available in your area. Try a different location, or check back soon.
      </div>
    );
  }

  const shown = unitCents ?? data.promotional_price ?? data.unit_price;

  return (
    <div className="flex min-h-[7.5rem] flex-col justify-center gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <PriceTick className="type-mono text-4xl font-extrabold text-black" value={formatMoney(shown, data.currency)} />
        {data.promotional_price ? <s className="type-mono text-sm text-muted">{formatMoney(data.unit_price, data.currency)}</s> : null}
        <span className="text-sm text-muted">per tyre, fitted</span>
      </div>
      <StockBadge status={data.stock_status} />
      {data.service_fee > 0 && (
        <p className="text-xs text-muted">
          Plus a <span className="font-mono">{formatMoney(data.service_fee, data.currency)}</span> service fee for your area.
        </p>
      )}
    </div>
  );
}

/**
 * The PDP buy area (right column on desktop, after the name on phones):
 * quantity boxes 1 to 5 (default 4), price per tyre and total, next available
 * fitting preview, Add to cart, what is included, then the inline fitting
 * strip (location, week of dates, windows) with Express Checkout.
 * Reads everything from `<PdpBuyProvider>`. The quantity prices come from the
 * pricing engine (`/tyres/price-ladders`). The pay-later line and the fitting
 * date strip are still placeholders (checkout/booking area, not catalogue).
 */
export function PdpBuyPanel() {
  const router = useRouter();
  const { availability, tyreVariantId, position, quantity, setQuantity, totalCents, justAdded, add, setAddButtonInView } = usePdpBuy();
  const [fitting, setFitting] = useFittingSelection();
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = addRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setAddButtonInView(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [setAddButtonInView]);

  const currency = availability.status === "ready" ? availability.data.currency : "AUD";
  const unavailable = availability.status === "ready" && availability.data.stock_status === "unavailable_in_zone";
  const hasZone = availability.status === "ready" || availability.status === "error" || availability.status === "loading";
  // No price without a location: block Add to cart (with a reason) rather than offering a primary action with no price attached.
  const needsLocation = availability.status === "no-zone" || availability.status === "zone-loading";
  const canExpress = Boolean(fitting) && !unavailable && availability.status === "ready";

  function express() {
    add();
    router.push("/checkout");
  }

  return (
    <div className="flex flex-col gap-5">
      <PriceBlock />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold text-black">Select quantity</legend>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {QUANTITY_STEPS.map((q) => (
            <label
              key={q}
              className={cx(
                "flex min-h-12 cursor-pointer items-center justify-center rounded-control border-2 text-base font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black",
                "relative",
                quantity === q ? "border-black bg-gold text-black" : "border-ink/40 bg-surface text-black hover:border-black",
              )}
            >
              {q === POPULAR_QUANTITY && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black px-1.5 py-px text-[10px] font-bold leading-4 text-white"
                >
                  Most popular
                </span>
              )}
              <input type="radio" name="pdp-quantity" value={q} checked={quantity === q} onChange={() => setQuantity(q)} className="sr-only" />
              {q}
              <span className="sr-only">
                {" "}
                {q === 1 ? "tyre" : "tyres"}
                {q === POPULAR_QUANTITY ? " (most popular)" : ""}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {totalCents !== null && (
        <p className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
          <span className="text-sm text-black">
            Total Cost <span className="text-muted">(inc. GST)</span>
            <span className="sr-only">
              {" "}
              for {quantity} {quantity === 1 ? "tyre" : "tyres"}
            </span>
          </span>
          <span className="type-mono text-2xl font-extrabold text-black" data-testid="pdp-total">
            {formatMoney(totalCents, currency)}
          </span>
        </p>
      )}

      {hasZone && !unavailable && <PdpNextSlot />}

      <div ref={addRef} className="flex flex-col gap-2">
        <Button onClick={add} fullWidth size="lg" disabled={unavailable || needsLocation} data-testid="pdp-add">
          Add to cart
        </Button>
        <p role="status" className="min-h-5 text-sm font-medium text-link">
          {needsLocation && !justAdded && <span className="font-normal text-black">Enter your suburb above to see the price and add to cart.</span>}
          {justAdded && (
            <>
              Added.{" "}
              <Link href="/cart" className="underline underline-offset-2">
                View your cart
              </Link>
            </>
          )}
        </p>
      </div>

      <ul className="flex flex-col gap-2 text-sm text-black">
        <li className="flex items-center gap-2">
          <TruckIcon className="h-5 w-5 shrink-0" />
          Inclusive of mobile delivery
        </li>
        <li className="flex items-center gap-2">
          <WrenchIcon className="h-5 w-5 shrink-0" />
          Onsite fitting included
        </li>
        <li className="flex items-start gap-2">
          <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          {INCLUDES_LINE}
        </li>
      </ul>
      <ul aria-label="Why buy from Tiro" className="flex flex-wrap gap-x-4 gap-y-2 rounded-card bg-band px-4 py-3 text-sm font-medium text-black">
        {["Price match guarantee", "Fitted at your door", "Secure payment"].map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <CheckIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-success" />
            {t}
          </li>
        ))}
      </ul>
      <BnplLines totalCents={totalCents} currency={currency} />

      {/* Nothing here can work without a location, so it only appears once there is one (no wall of disabled controls). */}
      {!needsLocation && (
        <section aria-labelledby="pdp-fitting-heading" className="flex flex-col gap-4 rounded-card border border-line p-4 shadow-rest">
          <h2 id="pdp-fitting-heading" className="sr-only">
            Choose a fitting time
          </h2>
          <FittingLocationStrip />
          <FittingDateStrip value={fitting} onChange={setFitting} idPrefix="pdp" items={[{ tyre_variant_id: tyreVariantId, quantity, position }]} />
          <Button onClick={express} disabled={!canExpress} variant="yellow" fullWidth size="lg" data-testid="pdp-express">
            Express Checkout ({quantity} {quantity === 1 ? "tyre" : "tyres"})
          </Button>
          {!canExpress && <p className="-mt-2 text-center text-sm text-muted">Choose a fitting date and time to check out in one step.</p>}
        </section>
      )}
    </div>
  );
}

/**
 * Phone-only sticky bottom bar: total (or a prompt) plus Add to cart. Render it
 * as the last child of the page so it rests above the footer at the end of the
 * page. Hidden while the panel's own Add button is on screen, so there is never
 * more than one visible Add.
 */
export function PdpStickyBar() {
  const { addButtonInView, totalCents, quantity, add, availability } = usePdpBuy();
  const { openPicker } = useLocation();
  if (addButtonInView) return null;
  // No location yet: the one persistent control is "Set location" (opens the picker), not a disabled Add button.
  const needsLocation = availability.status === "no-zone";
  const unavailable = availability.status === "ready" && availability.data.stock_status === "unavailable_in_zone";
  const currency = availability.status === "ready" ? availability.data.currency : "AUD";

  return (
    <div
      data-testid="pdp-sticky-bar"
      className="sticky bottom-0 z-30 -mx-5 border-t border-line bg-surface px-5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-raised md:-mx-6 md:px-6 lg:hidden"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 leading-tight">
          {totalCents !== null ? (
            <>
              <p className="type-mono text-lg font-extrabold text-black">{formatMoney(totalCents, currency)}</p>
              <p className="text-xs text-muted">
                for {quantity} {quantity === 1 ? "tyre" : "tyres"}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium leading-tight text-black">{needsLocation ? "See price and fitting times" : "Set location for price"}</p>
          )}
        </div>
        {needsLocation ? (
          <Button onClick={openPicker} className="shrink-0" data-testid="pdp-sticky-set-location">
            <PinIcon aria-hidden="true" className="h-5 w-5" />
            Set location
          </Button>
        ) : (
          <Button onClick={add} disabled={unavailable || availability.status === "zone-loading"} className="shrink-0">
            Add to cart
          </Button>
        )}
      </div>
    </div>
  );
}
