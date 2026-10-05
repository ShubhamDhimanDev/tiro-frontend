import type { TyreModelGroup } from "./group-by-model";
import type { TyreListItem } from "./types";
import type { BookingPosition } from "@/lib/booking/types";

/**
 * Price a customer pays per tyre: the promotional price when there is one, else
 * the zone price, else the catalogue `list_price` (Phase 7, present without a
 * zone). Cents; `undefined` only when the API gave none of them.
 */
export function effectivePrice(variant: TyreListItem): number | undefined {
  const price = variant.promotional_price ?? variant.unit_price ?? variant.list_price;
  return typeof price === "number" ? price : undefined;
}

/** The variant behind a group's "from" price (falls back to the first variant when nothing is priced). */
export function cheapestVariant(group: TyreModelGroup): TyreListItem {
  let best = group.variants[0];
  let bestPrice = effectivePrice(best);
  for (const variant of group.variants.slice(1)) {
    const price = effectivePrice(variant);
    if (price !== undefined && (bestPrice === undefined || price < bestPrice)) {
      best = variant;
      bestPrice = price;
    }
  }
  return best;
}

/** Struck-through "was" price, only when the variant is actually discounted. */
export function wasPrice(variant: TyreListItem): number | undefined {
  const { unit_price: unit, promotional_price: promo } = variant;
  if (typeof unit === "number" && typeof promo === "number" && promo < unit) return unit;
  return undefined;
}

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 20;

/** Default quantity per fitting position: a full set of four, or an axle pair. */
export const DEFAULT_QUANTITY: Record<BookingPosition, number> = { all: 4, front: 2, rear: 2 };

export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return MIN_QUANTITY;
  return Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, Math.round(value)));
}

/** Total in cents for `quantity` tyres at `unitCents` each. */
export function totalForQuantity(unitCents: number, quantity: number): number {
  return unitCents * clampQuantity(quantity);
}
