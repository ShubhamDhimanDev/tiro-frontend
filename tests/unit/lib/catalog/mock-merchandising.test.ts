import { describe, expect, it, vi } from "vitest";
import { applyExtraFilters, prepareResults, sortGroups } from "@/lib/catalog/extra-filters";
import { groupTyresByModel } from "@/lib/catalog/group-by-model";
import { featureChips, isFourForThree, ladderFromApi, mockUnitCents, quantityLadder, withMockPrices } from "@/lib/catalog/mock-merchandising";
import type { TyreListItem } from "@/lib/catalog/types";

function item(id: number, overrides: Partial<TyreListItem> = {}): TyreListItem {
  return {
    id,
    slug: `tyre-${id}`,
    sku: `S${id}`,
    width: 205,
    profile: 55,
    rim_diameter: 16,
    load_index: "91",
    speed_rating: "V",
    sidewall: "standard",
    tyre_model: {
      id,
      slug: `model-${id}`,
      name: `Model ${id}`,
      brand: { id: 1, name: "Brand", slug: "brand", logo_path: null, country_of_origin: null },
      category: "car",
      tyre_type: "highway",
      images: [],
    },
    ...overrides,
  };
}

describe("merchandising: API data first, mocks only when enabled", () => {
  it("fills placeholder prices only where the API gave no price at all, and marks them (mock mode)", () => {
    const [mocked, zone, listed] = withMockPrices(
      [item(1), item(2, { unit_price: 15000, promotional_price: null }), item(3, { list_price: 17000 })],
      true,
    );
    expect(mocked.mock_price).toBe(true);
    expect(mocked.unit_price).toBe(mockUnitCents(item(1)));
    expect(mocked.stock_status).toBe("in_stock");
    expect(zone.unit_price).toBe(15000);
    expect(zone.mock_price).toBeUndefined();
    expect(listed.list_price).toBe(17000);
    expect(listed.mock_price).toBeUndefined();
    expect(listed.unit_price).toBeUndefined();
  });

  it("is deterministic and stays within $95 to $340", () => {
    for (let id = 1; id < 200; id++) {
      const cents = mockUnitCents(item(id));
      expect(cents).toBe(mockUnitCents(item(id)));
      expect(cents).toBeGreaterThanOrEqual(9500);
      expect(cents).toBeLessThanOrEqual(34000);
    }
  });

  it("does nothing when mocks are off (the default)", () => {
    expect(withMockPrices([item(1)], false)[0].unit_price).toBeUndefined();
    expect(withMockPrices([item(1)])[0].unit_price).toBeUndefined();
  });

  it("builds the ladder from the pricing engine rows", () => {
    expect(
      ladderFromApi({
        ladder: [
          { quantity: 1, unit_price: 21900, total: 21900, discount_total: 0 },
          { quantity: 4, unit_price: 16425, total: 65700, discount_total: 21900 },
        ],
      }),
    ).toEqual([
      { qty: 1, unitCents: 21900 },
      { qty: 4, unitCents: 16425 },
    ]);
  });

  it("falls back to a flat ladder (no invented uplift) when the engine is unavailable", () => {
    const ladder = quantityLadder(16300);
    expect(ladder.map((r) => r.qty)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(ladder.map((r) => r.unitCents))).toEqual(new Set([16300]));
  });

  it("uses the API four_for_three flag and real attributes for chips", () => {
    expect(isFourForThree({ id: 8, four_for_three: false })).toBe(false);
    expect(isFourForThree({ id: 9, four_for_three: true })).toBe(true);
    // No flag and mocks off: no sticker, not "every fourth id".
    expect(isFourForThree({ id: 8 })).toBe(false);
    expect(featureChips(item(1))).toEqual(["Passenger Car", "Highway"]);
    expect(featureChips(item(1, { run_flat: true }))).toEqual(["Passenger Car", "Highway", "Run-flat"]);
  });

  it("keeps the old placeholder behaviour behind NEXT_PUBLIC_CATALOG_MOCKS=on", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_CATALOG_MOCKS", "on");
    const mock = await import("@/lib/catalog/mock-merchandising");
    expect(mock.isFourForThree({ id: 8 })).toBe(true);
    expect(mock.isFourForThree({ id: 9 })).toBe(false);
    expect(mock.isFourForThree({ id: 9, four_for_three: false })).toBe(false);
    expect(mock.featureChips(item(1))).toEqual(["Passenger Car", "Low noise"]);
    const ladder = mock.quantityLadder(16300);
    expect(ladder[0].unitCents).toBeGreaterThan(ladder[3].unitCents);
    expect(ladder[3].unitCents).toBe(16300);
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe("extra sidebar filters", () => {
  const items = [
    item(1, { load_index: "91", speed_rating: "H", unit_price: 10000 }),
    item(2, { load_index: "100", speed_rating: "W", unit_price: 20000 }),
    item(3, { load_index: "112", speed_rating: "Y", sidewall: "runflat", unit_price: 30000 }),
  ];

  it("is a no-op by default: the live API applies these filters server-side", () => {
    expect(applyExtraFilters(items, { min_load: "100", runflat: "yes" })).toBe(items);
  });

  it("(stub backend) filters by minimum load index and minimum speed rating", () => {
    expect(applyExtraFilters(items, { min_load: "100" }, true).map((i) => i.id)).toEqual([2, 3]);
    expect(applyExtraFilters(items, { min_speed: "W" }, true).map((i) => i.id)).toEqual([2, 3]);
  });

  it("(stub backend) filters by runflat yes/no and by price range in dollars", () => {
    expect(applyExtraFilters(items, { runflat: "yes" }, true).map((i) => i.id)).toEqual([3]);
    expect(applyExtraFilters(items, { runflat: "no" }, true).map((i) => i.id)).toEqual([1, 2]);
    expect(applyExtraFilters(items, { price_min: "150", price_max: "250" }, true).map((i) => i.id)).toEqual([2]);
  });

  it("(stub backend) filters by pattern slugs and never applies car make client-side", () => {
    expect(applyExtraFilters(items, { pattern: "model-1,model-3" }, true).map((i) => i.id)).toEqual([1, 3]);
    expect(applyExtraFilters(items, { car_make: "toyota" }, true)).toHaveLength(3);
  });

  it("prepareResults leaves live items untouched (no placeholder prices, no client filtering)", () => {
    const live = [item(1, { list_price: 12000 }), item(2)];
    expect(prepareResults(live, { price_min: "1000" })).toBe(live);
    expect(prepareResults(live, {})[1].unit_price).toBeUndefined();
  });

  it("re-sorts groups for price and name sorts only", () => {
    const groups = groupTyresByModel(items);
    expect(sortGroups(groups, "price_desc").map((g) => g.model.slug)).toEqual(["model-3", "model-2", "model-1"]);
    expect(sortGroups(groups, "price_asc").map((g) => g.model.slug)).toEqual(["model-1", "model-2", "model-3"]);
    expect(sortGroups(groups, undefined)).toBe(groups);
  });
});
