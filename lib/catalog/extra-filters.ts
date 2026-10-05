import { CLIENT_SIDE_FILTERS } from "./config";
import { withMockPrices } from "./mock-merchandising";
import { effectivePrice } from "./price";
import type { TyreModelGroup } from "./group-by-model";
import type { TyreListItem } from "./types";

/**
 * Sidebar filters (min load index, min speed rating, runflat, pattern, price
 * range). The live API applies them server-side (Phase 7, see
 * `buildTyreSearchQuery`), so counts and pagination are right. This client-side
 * version exists only for the stub backend, which ignores those params
 * (`CLIENT_SIDE_FILTERS`, set by `CATALOG_BACKEND=stub`). `car_make` is
 * API-only and never applied here.
 */

/** Low to high. `ZR` is above `Y` by convention. */
export const SPEED_RATINGS = ["N", "P", "Q", "R", "S", "T", "U", "H", "V", "W", "Y", "ZR"] as const;

export const LOAD_INDEX_OPTIONS = [75, 80, 85, 90, 95, 100, 105, 110, 115, 120] as const;

function speedRank(rating: string): number {
  return SPEED_RATINGS.indexOf(rating.toUpperCase() as (typeof SPEED_RATINGS)[number]);
}

function loadValue(load: string): number {
  const n = parseInt(load, 10);
  return Number.isNaN(n) ? 0 : n;
}

export function applyExtraFilters(
  items: TyreListItem[],
  values: Record<string, string | undefined>,
  enabled: boolean = CLIENT_SIDE_FILTERS,
): TyreListItem[] {
  if (!enabled) return items;
  const minLoad = Number(values.min_load) || 0;
  const minSpeed = values.min_speed ? speedRank(values.min_speed) : -1;
  const patterns = values.pattern ? new Set(values.pattern.split(",").filter(Boolean)) : null;
  const priceMin = values.price_min ? Number(values.price_min) * 100 : null;
  const priceMax = values.price_max ? Number(values.price_max) * 100 : null;
  const runflat = values.runflat;

  return items.filter((item) => {
    if (minLoad && loadValue(item.load_index) < minLoad) return false;
    if (minSpeed >= 0 && speedRank(item.speed_rating) < minSpeed) return false;
    if (patterns && !patterns.has(item.tyre_model.slug)) return false;
    const isRunflat = item.run_flat ?? item.tyre_model.run_flat ?? item.sidewall === "runflat";
    if (runflat === "yes" && !isRunflat) return false;
    if (runflat === "no" && isRunflat) return false;
    const price = effectivePrice(item);
    if (price !== undefined) {
      if (priceMin !== null && price < priceMin) return false;
      if (priceMax !== null && price > priceMax) return false;
    }
    return true;
  });
}

/** Re-sorts groups for the sorts the mock prices make necessary. Other sorts keep the backend order. */
export function sortGroups(groups: TyreModelGroup[], sort: string | undefined): TyreModelGroup[] {
  if (sort === "price_asc" || sort === "price_desc") {
    const dir = sort === "price_asc" ? 1 : -1;
    return [...groups].sort((a, b) => ((a.fromPrice ?? Infinity) - (b.fromPrice ?? Infinity)) * dir || 0);
  }
  if (sort === "name_asc") {
    return [...groups].sort((a, b) => a.model.name.localeCompare(b.model.name));
  }
  return groups;
}

/** Results as the listing shows them: placeholder prices only in mock mode, client-side filters only on the stub. Idempotent. */
export function prepareResults(items: TyreListItem[], values: Record<string, string | undefined> = {}): TyreListItem[] {
  return applyExtraFilters(withMockPrices(items), values);
}
