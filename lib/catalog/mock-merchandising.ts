import { CATALOG_MOCKS } from "./config";
import { TYRE_CATEGORY_LABELS, TYRE_TYPE_LABELS } from "./labels";
import type { LadderEntry, PriceLadder, TyreListItem } from "./types";

/**
 * Merchandising helpers for cards and the PDP. The API (Phase 7) now supplies
 * the real data, so each helper PREFERS the API field and only falls back to a
 * made-up value while `CATALOG_MOCKS` is on (`NEXT_PUBLIC_CATALOG_MOCKS=on`):
 *
 *  - price: `list_price` (no zone needed) or the zone price. `withMockPrices`
 *    fills a placeholder only for items that carry neither, and only in mock mode.
 *  - "4 for 3": `four_for_three` from the promotions engine.
 *  - quantity ladder: `GET /tyres/price-ladders` (the pricing engine). When it
 *    could not be fetched, `flatLadder` shows the list price for every quantity
 *    (what the engine charges without a promotion), never an invented uplift.
 *  - feature chips: real attributes only (category, type, run-flat). The old
 *    marketing tags ("Low noise", ...) have no API source and show in mock mode only.
 */
export const MOCK_PRICES = CATALOG_MOCKS;

export const QUANTITY_STEPS = [1, 2, 3, 4, 5] as const;

/** Per-tyre uplift of the old mock ladder (mock mode only). */
const MOCK_LADDER_UPLIFT: Record<number, number> = { 1: 0.4, 2: 0.14, 3: 0.07, 4: 0, 5: 0 };

/** Deterministic placeholder per-tyre price in cents: $95 to $340, whole dollars. Mock mode only. */
export function mockUnitCents(item: Pick<TyreListItem, "id" | "width" | "rim_diameter">): number {
  const seed = (item.id * 7919 + item.width * 31 + item.rim_diameter * 977) % 24500;
  const dollars = 95 + Math.round(seed / 100);
  return dollars * 100;
}

/** Fills placeholder prices for items the API gave no price at all (no `list_price`, no zone price). No-op unless mock mode is on. */
export function withMockPrices(items: TyreListItem[], enabled: boolean = MOCK_PRICES): TyreListItem[] {
  if (!enabled) return items;
  return items.map((item) =>
    typeof item.unit_price === "number" || typeof item.list_price === "number"
      ? item
      : {
          ...item,
          unit_price: mockUnitCents(item),
          promotional_price: null,
          stock_status: "in_stock",
          mock_price: true,
        },
  );
}

export interface LadderRow {
  qty: number;
  /** Cents per tyre. */
  unitCents: number;
}

/** Ladder rows from the API's `price-ladders` entry. */
export function ladderFromApi(entry: Pick<PriceLadder, "ladder">): LadderRow[] {
  return entry.ladder.map((row: LadderEntry) => ({ qty: row.quantity, unitCents: row.unit_price }));
}

/** Same price for 1 to 5 tyres: the fallback when the pricing engine could not be reached. */
export function flatLadder(unitCents: number): LadderRow[] {
  return QUANTITY_STEPS.map((qty) => ({ qty, unitCents }));
}

/** The old mock ladder (dearer for fewer tyres). Mock mode only. */
export function mockQuantityLadder(fromCents: number): LadderRow[] {
  return QUANTITY_STEPS.map((qty) => ({
    qty,
    unitCents: Math.round((fromCents * (1 + MOCK_LADDER_UPLIFT[qty])) / 100) * 100,
  }));
}

/** Ladder for a list price when the API ladder is not (yet) available: mock ladder in mock mode, else flat. */
export function quantityLadder(fromCents: number): LadderRow[] {
  return CATALOG_MOCKS ? mockQuantityLadder(fromCents) : flatLadder(fromCents);
}

/** The red "4 for 3" sticker: the API flag; in mock mode about one card in four. */
export function isFourForThree(item: Pick<TyreListItem, "id" | "four_for_three">): boolean {
  if (typeof item.four_for_three === "boolean") return item.four_for_three;
  return CATALOG_MOCKS && item.id % 4 === 0;
}

/** Feature chips for a card, from real attributes: category, tyre type, run-flat. Marketing tags only in mock mode. */
export function featureChips(item: TyreListItem): string[] {
  const model = item.tyre_model;
  const chips: string[] = [TYRE_CATEGORY_LABELS[model.category]];
  if (CATALOG_MOCKS) {
    const typeTag: Record<string, string> = {
      highway: "Low noise",
      all_terrain: "Gravel ready",
      mud_terrain: "Off-road grip",
      performance: "High performance",
      eco: "Fuel saving",
    };
    chips.push(typeTag[model.tyre_type] ?? TYRE_TYPE_LABELS[model.tyre_type]);
  } else {
    chips.push(TYRE_TYPE_LABELS[model.tyre_type]);
  }
  if (item.run_flat ?? model.run_flat) chips.push("Run-flat");
  return chips;
}
