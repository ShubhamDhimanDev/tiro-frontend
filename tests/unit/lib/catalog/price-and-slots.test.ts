import { describe, expect, it } from "vitest";
import { clampQuantity, DEFAULT_QUANTITY, effectivePrice, totalForQuantity } from "@/lib/catalog/price";
import { describeNextSlot, findNextSlot, formatSlotDay, formatSlotTime } from "@/lib/catalog/next-slot";
import { buildFilterHref, countActiveFilters, describeSearchSize } from "@/lib/catalog/filters";

describe("quantity and total", () => {
  it("defaults to 4 for all, 2 per axle", () => {
    expect(DEFAULT_QUANTITY).toEqual({ all: 4, front: 2, rear: 2 });
  });
  it("clamps to 1-20", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(99)).toBe(20);
    expect(clampQuantity(NaN)).toBe(1);
  });
  it("multiplies cents by quantity", () => {
    expect(totalForQuantity(18900, 4)).toBe(75600);
    expect(totalForQuantity(18900, 0)).toBe(18900);
  });
});

describe("next slot", () => {
  it("finds the earliest day with a slot", () => {
    const slot = findNextSlot([
      { date: "2026-10-03", slots: [{ start: "09:00", end: "11:00" }] },
      { date: "2026-10-01", slots: [] },
      { date: "2026-10-02", slots: [{ start: "14:30", end: "16:00" }] },
    ]);
    expect(slot).toEqual({ date: "2026-10-02", start: "14:30", end: "16:00" });
    expect(findNextSlot([{ date: "2026-10-01", slots: [] }])).toBeNull();
  });
  it("formats times and days", () => {
    expect(formatSlotTime("08:00")).toBe("8am");
    expect(formatSlotTime("14:30")).toBe("2:30pm");
    expect(formatSlotDay("2026-10-01", "2026-10-01")).toBe("Today");
    expect(formatSlotDay("2026-10-02", "2026-10-01")).toBe("Tomorrow");
    expect(formatSlotDay("2026-10-05", "2026-10-01")).toMatch(/Mon 5 Oct/);
    expect(describeNextSlot({ date: "2026-10-01", start: "09:00", end: "11:00" }, "2026-10-01")).toBe("Today, 9am to 11am");
  });
});

describe("filters", () => {
  it("builds a filter href that keeps size and drops pagination", () => {
    const href = buildFilterHref(
      { width: "205", profile: "55", rim_diameter: "16", page: "3", brand: "x" },
      { tyre_type: "eco", sort: "price_asc" },
    );
    const params = new URL(href, "http://x").searchParams;
    expect(params.get("width")).toBe("205");
    expect(params.get("tyre_type")).toBe("eco");
    expect(params.get("sort")).toBe("price_asc");
    expect(params.get("page")).toBeNull();
    expect(params.get("brand")).toBeNull();
  });
  it("counts active filters excluding sort", () => {
    expect(countActiveFilters({ brand: "a", sort: "price_asc" })).toBe(1);
  });
  it("describes sizes", () => {
    expect(describeSearchSize({ width: "205", profile: "55", rim_diameter: "16" })).toBe("205/55 R16");
    expect(describeSearchSize({ rim_diameter: "17" })).toBe("R17");
  });
});

describe("effective price falls back to the catalogue list price", () => {
  const base = { id: 1, slug: "s", sku: "s", width: 205, profile: 55, rim_diameter: 16, load_index: "91", speed_rating: "V", sidewall: "standard" } as never;
  it("prefers promo, then zone price, then list_price", () => {
    expect(effectivePrice({ ...(base as object), list_price: 20000, unit_price: 19000, promotional_price: 18000 } as never)).toBe(18000);
    expect(effectivePrice({ ...(base as object), list_price: 20000, unit_price: 19000, promotional_price: null } as never)).toBe(19000);
    expect(effectivePrice({ ...(base as object), list_price: 20000 } as never)).toBe(20000);
    expect(effectivePrice(base)).toBeUndefined();
  });
});
