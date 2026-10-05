"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useCart } from "@/components/cart/cart-provider";
import { PriceTick } from "@/components/motion/price-tick";
import { StockBadge } from "@/components/catalog/stock-badge";
import { TyreImage } from "@/components/catalog/tyre-image";
import { fallbackRows, usePriceLadder } from "@/components/catalog/use-price-ladder";
import { Badge, TierBadge, type Tier } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { CheckIcon, ChevronDownIcon, CloseIcon } from "@/components/ui/icons";
import { LinkPendingOverlay } from "@/components/ui/link-pending-overlay";
import { formatMoney } from "@/lib/catalog/format-money";
import type { TyreModelGroup } from "@/lib/catalog/group-by-model";
import { fullTyreName } from "@/lib/catalog/labels";
import { featureChips, isFourForThree } from "@/lib/catalog/mock-merchandising";
import { cheapestVariant, DEFAULT_QUANTITY, effectivePrice, wasPrice } from "@/lib/catalog/price";
import type { TyreListItem } from "@/lib/catalog/types";
import type { BookingPosition } from "@/lib/booking/types";

function sizeText(v: TyreListItem): string {
  return `${v.width}/${v.profile} R${v.rim_diameter}`;
}

/** Distinct sizes among a model's variants. One size means "Add" is unambiguous. */
export function distinctSizeCount(group: TyreModelGroup): number {
  return new Set(group.variants.map(sizeText)).size;
}

/** `$198` for whole dollars, `$198.50` otherwise. */
export function formatEa(cents: number): string {
  return formatMoney(cents).replace(/\.00$/, "");
}

/**
 * Results card (design v2, phase 3). One per `tyre_model`, grouped from the flat
 * variant list (`lib/catalog/group-by-model.ts`).
 *
 * Front: photo, brand, pattern, size/load/speed, feature chips, "from" price in
 * red (or the red "4 for 3" strip), and a "Select quantity" button. That button
 * flips the card to a dark back face with a 1 to 5 tyre per-tyre price table
 * and Add to cart. A model with several sizes gets a size picker on the back
 * face (defaulting to the cheapest size), and the table and Add follow it.
 *
 * The quantity table comes from the pricing engine (`/tyres/price-ladders`,
 * fetched when the card flips, or on mount for a 4 for 3 card whose strip needs
 * it); if that fails the table shows the flat list price with a note, and the
 * cart re-prices on the server. The "4 for 3" sticker is the API's
 * `four_for_three` flag (mock fallback only with `NEXT_PUBLIC_CATALOG_MOCKS=on`,
 * see `lib/catalog/mock-merchandising.ts`). The hidden face is `inert` so it is out
 * of the tab order and the accessibility tree. Priority image: first card only.
 */
export function TyreModelCard({
  group,
  priority = false,
  tier,
  position = "all",
  className,
  bare = false,
}: {
  group: TyreModelGroup;
  priority?: boolean;
  tier?: Tier;
  /** Cart position when added: staggered results add `front` / `rear` pairs. */
  position?: BookingPosition;
  className?: string;
  /** No own border, radius or shadow: the parent (a tier column) draws them. */
  bare?: boolean;
}) {
  const { add } = useCart();
  const { model, fromPrice } = group;
  const primary = cheapestVariant(group);
  const sizeCount = distinctSizeCount(group);
  const singleSize = sizeCount === 1;
  // One entry per size, each with its cheapest variant: the back face's size picker, and the variant its price table and Add act on.
  const sizes = useMemo(() => {
    const bySize = new Map<string, TyreListItem[]>();
    for (const v of group.variants) bySize.set(sizeText(v), [...(bySize.get(sizeText(v)) ?? []), v]);
    return [...bySize.entries()].map(([text, variants]) => ({ text, variant: cheapestVariant({ ...group, variants }) }));
  }, [group]);
  const [selectedSize, setSelectedSize] = useState(() => sizeText(primary));
  const active = sizes.find((size) => size.text === selectedSize)?.variant ?? primary;
  const name = fullTyreName(model.brand.name, model.name);
  const label = `${name} ${sizeText(primary)}`;
  const activeLabel = `${name} ${sizeText(active)}`;
  const stock = primary.stock_status;
  const was = fromPrice !== undefined && effectivePrice(primary) === fromPrice ? wasPrice(primary) : undefined;
  const onOffer = was !== undefined;
  const fourForThree = fromPrice !== undefined && isFourForThree(primary);
  const canFlip = fromPrice !== undefined && group.variants.some((v) => v.stock_status !== "unavailable_in_zone");
  const chips = featureChips(primary);

  const [flipped, setFlipped] = useState(false);
  // How the quantity panel was opened: hover panels close again when the pointer leaves; button/keyboard ones stay until closed.
  const openedBy = useRef<"hover" | "button" | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const [qty, setQty] = useState<number>(DEFAULT_QUANTITY[position]);
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<number | null>(null);
  const flipBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const radioName = useId();

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  const ladderState = usePriceLadder(active.id, canFlip && (flipped || fourForThree));
  const ladderLoading = ladderState.status === "loading";
  const ladderFailed = ladderState.status === "error";
  const activePrice = effectivePrice(active) ?? fromPrice;
  const ladder = ladderState.status === "ready" ? ladderState.rows : activePrice !== undefined ? fallbackRows(activePrice) : [];
  const unitForQty = ladder.find((row) => row.qty === qty)?.unitCents ?? activePrice ?? 0;
  // The front "4 for 3" strip describes the headline (cheapest) variant, so it only reads the ladder while that one is selected.
  const dealWas = ladderState.status === "ready" && active.id === primary.id ? ladder.find((row) => row.qty === 1)?.unitCents : undefined;
  const dealNow = ladderState.status === "ready" && active.id === primary.id ? ladder.find((row) => row.qty === 4)?.unitCents : undefined;

  function flip(next: boolean, by: "hover" | "button" = "button") {
    setFlipped(next);
    openedBy.current = next ? by : null;
    // Button/keyboard: move focus into the face that just became visible (after the inert swap). Hover never steals focus.
    if (by === "button") window.setTimeout(() => (next ? closeBtn.current : flipBtn.current)?.focus(), 0);
  }

  // Desktop hover-reveal (mouse only: touch and keyboard use the button). Short open delay avoids flicker while the pointer passes over.
  function hoverIn(e: PointerEvent) {
    if (e.pointerType !== "mouse" || !canFlip || flipped) return;
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => flip(true, "hover"), 150);
  }
  function hoverOut(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    if (flipped && openedBy.current === "hover") hoverTimer.current = window.setTimeout(() => flip(false, "hover"), 250);
  }

  function handleAdd() {
    add({
      tyre_variant_id: active.id,
      quantity: qty,
      position,
      label: activeLabel,
      slug: active.slug,
      image: model.images[0],
      unit_cents: unitForQty,
    });
    setJustAdded(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJustAdded(false), 2500);
  }

  const face = "col-start-1 row-start-1 flex min-w-0 flex-col";

  return (
    <article
      data-testid="tyre-card"
      data-tier={tier}
      onPointerEnter={hoverIn}
      onPointerLeave={hoverOut}
      className={cx("group/card relative h-full", className)}
    >
      <div
        className={cx(
          "grid h-full bg-surface transition-shadow duration-300",
          !bare && "rounded-card border border-line shadow-rest hover:shadow-raised",
        )}
      >
        {/* Front */}
        <div
          className={cx(face, "overflow-hidden transition-opacity duration-300", !bare && "rounded-card", flipped && "opacity-0")}
          inert={flipped}
          aria-hidden={flipped || undefined}
        >
          <div className="relative">
            <TyreImage
              src={model.images[0]}
              alt=""
              priority={priority}
              sizes="(min-width: 1024px) 300px, (min-width: 576px) 45vw, 90vw"
              ratioClassName="aspect-[4/3]"
              className="bg-gradient-to-b from-[#f4f4f4] to-[#e6e6e6] [&_img]:transition-transform [&_img]:duration-500 [&_img]:ease-out group-hover/card:[&_img]:scale-105"
            />
            {fourForThree && (
              <span
                data-testid="four-for-three"
                className="badge-pop absolute right-3 top-3 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-green text-white shadow-rest"
              >
                <span className="text-[26px] font-extrabold leading-none">
                  4<span className="text-[13px] font-semibold"> for </span>3
                </span>
              </span>
            )}
            <span className="absolute bottom-0 left-3 max-w-[calc(100%-1.5rem)] translate-y-1/2 truncate rounded-control border border-line bg-surface px-3 py-1.5 text-[13px] font-extrabold uppercase tracking-tight text-black shadow-rest">
              {model.brand.name}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-6">
            <h3 className="line-clamp-2 text-[17px] font-extrabold uppercase leading-tight tracking-normal text-black">
              <Link href={`/tyres/${primary.slug}`} className="hover:text-link after:absolute after:inset-0 after:z-[1] after:content-['']">
                <LinkPendingOverlay />
                {model.name}
              </Link>
            </h3>
            <p className="text-sm text-muted">
              {sizeText(primary)} · {primary.load_index}
              {primary.speed_rating}
              {!singleSize ? ` +${sizeCount - 1} more size${sizeCount > 2 ? "s" : ""}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {stock && <StockBadge status={stock} />}
              {tier && (
                <TierBadge tier={tier} className="py-0" />
              )}
              {onOffer && (
                <Badge tone="green" className="py-0">
                  Special price
                </Badge>
              )}
            </div>
            <ul className="flex flex-wrap gap-1.5" aria-label="Tyre features">
              {chips.map((chip) => (
                <li key={chip} className="rounded-full bg-chip px-2.5 py-1 text-xs font-medium text-black">
                  {chip}
                </li>
              ))}
            </ul>
          </div>

          {fromPrice !== undefined ? (
            fourForThree ? (
              <div
                data-mock={primary.mock_price || undefined}
                className="flex min-h-12 items-center justify-between gap-2 bg-green px-4 py-2.5 text-white"
              >
                <span className="text-sm font-bold">4 for 3*</span>
                <span className="flex items-baseline gap-2">
                  {dealWas !== undefined && dealNow !== undefined && dealWas > dealNow && (
                    <s className="text-sm opacity-80">{formatEa(dealWas)}ea</s>
                  )}
                  <span className="type-mono text-xl font-extrabold">{formatEa(dealNow ?? fromPrice)}ea</span>
                </span>
              </div>
            ) : (
              <div
                data-mock={primary.mock_price || undefined}
                className="flex min-h-12 items-baseline justify-between gap-2 border-t border-line px-4 py-2.5"
              >
                <span className="text-sm text-muted">From</span>
                <span className="flex items-baseline gap-2">
                  {was !== undefined && <s className="type-mono text-sm text-muted">{formatMoney(was)}</s>}
                  <span className="type-mono text-xl font-extrabold text-green">{formatEa(fromPrice)}ea</span>
                </span>
              </div>
            )
          ) : (
            <p className="flex min-h-12 items-center border-t border-line px-4 py-2.5 text-sm text-muted">Set your location to see pricing</p>
          )}

          <div className="relative z-[2] px-4 pb-4 pt-3">
            <button
              ref={flipBtn}
              type="button"
              disabled={!canFlip}
              aria-expanded={flipped}
              aria-label={`Select quantity for ${singleSize ? label : name}`}
              onClick={() => flip(true)}
              className={buttonClassName({ variant: "green", size: "sm", fullWidth: true })}
            >
              Select quantity
            </button>
          </div>
        </div>

        {/* Back: quantity-price table */}
        {canFlip && (
          <div
            className={cx(
              face,
              "z-10 bg-[#1a1a1a] p-4 text-white transition-[opacity,visibility] duration-300",
              !bare && "rounded-card",
              flipped ? "visible opacity-100" : "invisible opacity-0",
            )}
            inert={!flipped}
            aria-hidden={!flipped || undefined}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-control bg-white px-3 py-1.5 text-[13px] font-extrabold uppercase text-black">
                {model.brand.name}
              </span>
              <button
                ref={closeBtn}
                type="button"
                aria-label={`Close quantity table for ${activeLabel}`}
                onClick={() => flip(false)}
                className="-mr-1 -mt-1 flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/15"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {/* The pattern name is not repeated here: it is the page's one text node for this tyre (e2e getByText stays unique). */}
            {singleSize ? (
              <p className="mt-3 text-sm text-white/75">
                {sizeText(active)} · {active.load_index}
                {active.speed_rating}
              </p>
            ) : (
              <div className="relative mt-3">
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  // An open native list can fire pointerleave on the card: once the picker is used, treat the panel as pinned open.
                  onFocus={() => {
                    openedBy.current = "button";
                  }}
                  aria-label={`Size for ${name}`}
                  className="min-h-11 w-full cursor-pointer appearance-none rounded-control border border-white/15 bg-white/10 py-2 pl-3 pr-10 text-sm font-bold text-white transition-colors [color-scheme:dark] hover:bg-white/20 focus-visible:border-white/60 focus-visible:outline-none"
                >
                  {sizes.map((size) => (
                    <option key={size.text} value={size.text} className="bg-[#1a1a1a] text-white">
                      {size.text} · {size.variant.load_index}
                      {size.variant.speed_rating}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              </div>
            )}

            <fieldset className="mt-3 flex flex-col gap-1.5">
              <legend className="sr-only">Quantity for {activeLabel}</legend>
              {ladder.map((row, i) => (
                <label
                  key={row.qty}
                  style={{ transitionDelay: flipped ? `${80 + i * 45}ms` : "0ms" }}
                  className={cx(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 text-sm transition-[opacity,transform,background-color] duration-300",
                    flipped ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                    qty === row.qty ? "bg-white font-bold text-black" : "bg-white/10 text-white hover:bg-white/20",
                  )}
                >
                  <input
                    type="radio"
                    name={radioName}
                    value={row.qty}
                    checked={qty === row.qty}
                    onChange={() => setQty(row.qty)}
                    className="h-4 w-4 shrink-0 accent-[#3c8425]"
                  />
                  <span className="flex-1">
                    {row.qty} {row.qty === 1 ? "Tyre" : "Tyres"}
                  </span>
                  <span className="type-mono font-extrabold">{ladderLoading ? "..." : `${formatEa(row.unitCents)}ea`}</span>
                </label>
              ))}
            </fieldset>

            <p className="mt-3 flex items-baseline justify-between text-sm text-white/85">
              <span>Total (inc. GST)</span>
              <span className="type-mono text-lg font-extrabold text-white" data-testid="card-total">
                {ladderLoading ? "..." : <PriceTick value={formatMoney(unitForQty * qty)} />}
              </span>
            </p>
            {ladderFailed && (
              <p role="status" className="mt-1 text-xs text-white/70">
                Quantity prices could not be loaded. Your cart confirms the final price.
              </p>
            )}

            <div className="mt-auto flex items-center gap-3 pt-3">
              <Link
                href={`/tyres/${active.slug}`}
                className="inline-flex min-h-11 items-center whitespace-nowrap text-[13px] font-bold text-white underline underline-offset-4"
              >
                Product details
              </Link>
              <button
                type="button"
                onClick={handleAdd}
                disabled={active.stock_status === "unavailable_in_zone" || ladderLoading}
                aria-label={`Add ${activeLabel} to cart`}
                data-testid="quick-add"
                className={buttonClassName({ variant: "green", size: "sm", className: "ml-auto min-w-28 !border-white/0" })}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {justAdded ? (
                    <m.span
                      key="added"
                      className="inline-flex items-center gap-1.5"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    >
                      <CheckIcon aria-hidden="true" className="h-4 w-4" />
                      Added
                    </m.span>
                  ) : (
                    <m.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                      Add to cart
                    </m.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
            <span role="status" className="sr-only">
              {justAdded ? `${activeLabel} added to cart (${qty} tyres)` : ""}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
