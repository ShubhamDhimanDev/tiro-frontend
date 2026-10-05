"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { useLocation } from "@/components/location/location-provider";
import { fallbackRows, usePriceLadder } from "@/components/catalog/use-price-ladder";
import { QUANTITY_STEPS } from "@/lib/catalog/mock-merchandising";
import { clampQuantity, DEFAULT_QUANTITY } from "@/lib/catalog/price";
import type { BookingPosition } from "@/lib/booking/types";
import type { TyreAvailability } from "@/lib/catalog/types";

/**
 * Shared state for the PDP buy area: the always-live price/stock fetch, the
 * chosen quantity and fitting position, and add-to-cart. The buy panel (in the
 * page's right column) and the phone sticky bar (last child of the page) both
 * read it, so they always agree.
 *
 * Price/stock is a separate client fetch on purpose (`GET /api/v1/tyres/{slug}/
 * availability?zone=`): it is zone- and time-dependent and must never be baked
 * into the cached page (docs/architecture/02-api-contract.md).
 */

export type AvailabilityState =
  | { status: "zone-loading" }
  | { status: "no-zone" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TyreAvailability };

interface PdpBuyValue {
  tyreVariantId: number;
  slug: string;
  label: string;
  zoneId: string | null;
  zoneLabel: string | null;
  availability: AvailabilityState;
  position: BookingPosition;
  setPosition: (next: BookingPosition) => void;
  quantity: number;
  setQuantity: (next: number) => void;
  /** Per-tyre price in cents for the chosen quantity (from the quantity ladder), or `null` until price is known and orderable. */
  unitCents: number | null;
  /** Per-tyre price for 1 to 5 tyres from the pricing engine (flat zone price if it could not be fetched). `null` until priced. */
  ladder: { qty: number; unitCents: number }[] | null;
  /** True while the ladder is still loading: the price shown is the zone price, not final. */
  ladderLoading: boolean;
  /** True when the pricing engine could not be reached and the ladder is the flat zone price. */
  ladderFailed: boolean;
  /** `unitCents` x quantity, or `null`. */
  totalCents: number | null;
  justAdded: boolean;
  add: () => void;
  /** Set by the panel's own Add button so the sticky bar can hide while that button is on screen. */
  addButtonInView: boolean;
  setAddButtonInView: (v: boolean) => void;
}

const PdpBuyContext = createContext<PdpBuyValue | null>(null);

export function usePdpBuy(): PdpBuyValue {
  const ctx = useContext(PdpBuyContext);
  if (!ctx) throw new Error("usePdpBuy must be used within <PdpBuyProvider>");
  return ctx;
}

export function PdpBuyProvider({
  tyreVariantId,
  slug,
  label,
  image,
  children,
}: {
  tyreVariantId: number;
  slug: string;
  label: string;
  image?: string;
  children: ReactNode;
}) {
  const { zone, loading: zoneLoading, clearZone } = useLocation();
  const { add: addToCart } = useCart();
  const zoneId = zone?.zoneId ?? null;

  const [position, setPositionState] = useState<BookingPosition>("all");
  const [quantity, setQuantityState] = useState(DEFAULT_QUANTITY.all);
  const [justAdded, setJustAdded] = useState(false);
  const [addButtonInView, setAddButtonInView] = useState(true);
  const timer = useRef<number | null>(null);

  // Keyed by `slug::zoneId` rather than reset via a synchronous `setState` at
  // the top of the effect (`react-hooks/set-state-in-effect`): "loading" for a
  // new pair is derived below by comparing keys.
  const requestKey = zoneId ? `${slug}::${zoneId}` : null;
  const [result, setResult] = useState<{ key: string; state: AvailabilityState } | null>(null);

  useEffect(() => {
    if (!zoneId || !requestKey) return;
    let cancelled = false;

    fetch(`/api/catalog/tyres/${encodeURIComponent(slug)}/availability?zone=${encodeURIComponent(zoneId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (cancelled) return;

        if (res.status === 404) {
          // Stale/tampered/unknown zone id: degrade to "re-check serviceability"
          // (clearing the zone puts the buy panel back in its location-field
          // state) rather than silently falling through to an unscoped result.
          await clearZone();
          return;
        }

        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          setResult({ key: requestKey, state: { status: "ready", data: body.data as TyreAvailability } });
        } else {
          setResult({
            key: requestKey,
            state: { status: "error", message: body.message ?? "Couldn't load price and availability." },
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ key: requestKey, state: { status: "error", message: "Couldn't load price and availability." } });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, zoneId, requestKey, clearZone]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const availability: AvailabilityState = zoneLoading
    ? { status: "zone-loading" }
    : !zoneId
      ? { status: "no-zone" }
      : result && result.key === requestKey
        ? result.state
        : { status: "loading" };

  const setPosition = useCallback((next: BookingPosition) => {
    setPositionState(next);
    setQuantityState(DEFAULT_QUANTITY[next]);
  }, []);

  const setQuantity = useCallback((next: number) => setQuantityState(clampQuantity(next)), []);

  const baseCents =
    availability.status === "ready" && availability.data.stock_status !== "unavailable_in_zone"
      ? (availability.data.promotional_price ?? availability.data.unit_price)
      : null;
  const ladderState = usePriceLadder(tyreVariantId, baseCents !== null, zoneId ?? "");
  const ladder = baseCents === null ? null : ladderState.status === "ready" ? ladderState.rows : fallbackRows(baseCents);
  const unitCents = ladder === null ? null : (ladder.find((row) => row.qty === Math.min(quantity, QUANTITY_STEPS[QUANTITY_STEPS.length - 1]))?.unitCents ?? baseCents);
  const totalCents = unitCents === null ? null : unitCents * clampQuantity(quantity);

  const add = useCallback(() => {
    addToCart({ tyre_variant_id: tyreVariantId, quantity, position, label, slug, image, ...(unitCents !== null ? { unit_cents: unitCents } : {}) });
    setJustAdded(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJustAdded(false), 4000);
  }, [addToCart, tyreVariantId, quantity, position, label, slug, image, unitCents]);

  const value: PdpBuyValue = {
    tyreVariantId,
    slug,
    label,
    zoneId,
    zoneLabel: zone?.label ?? null,
    availability,
    position,
    setPosition,
    quantity,
    setQuantity,
    unitCents,
    ladder,
    ladderLoading: ladderState.status === "loading",
    ladderFailed: ladderState.status === "error",
    totalCents,
    justAdded,
    add,
    addButtonInView,
    setAddButtonInView,
  };

  return <PdpBuyContext.Provider value={value}>{children}</PdpBuyContext.Provider>;
}
