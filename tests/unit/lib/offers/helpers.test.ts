import { describe, expect, it } from "vitest";
import { daysLeft, formatOfferEnd, isEndingSoon, offerShopHref, offerTypeKey, offerTypeLabel, sortByEnd } from "@/lib/offers/helpers";

const NOW = new Date("2026-10-01T03:00:00Z");

describe("offer dates", () => {
  it("counts whole days to the end date, inclusive of the end day", () => {
    expect(daysLeft("2026-10-01", NOW)).toBe(0);
    expect(daysLeft("2026-10-08", NOW)).toBe(7);
    expect(daysLeft("2026-09-30", NOW)).toBe(-1);
  });

  it("flags offers ending within two weeks, not ended ones or far-off ones", () => {
    expect(isEndingSoon({ ends_at: "2026-10-10" }, NOW)).toBe(true);
    expect(isEndingSoon({ ends_at: "2026-10-15" }, NOW)).toBe(true);
    expect(isEndingSoon({ ends_at: "2026-10-16" }, NOW)).toBe(false);
    expect(isEndingSoon({ ends_at: "2026-09-30" }, NOW)).toBe(false);
  });

  it("formats the end date as plain text without timezone drift", () => {
    expect(formatOfferEnd("2026-12-30")).toBe("Ends 30 Dec");
    expect(formatOfferEnd("2026-01-01T00:00:00+00:00")).toBe("Ends 1 Jan");
  });

  it("sorts soonest first", () => {
    expect(sortByEnd([{ ends_at: "2026-12-30" }, { ends_at: "2026-10-05" }]).map((o) => o.ends_at)).toEqual(["2026-10-05", "2026-12-30"]);
  });
});

describe("offerShopHref", () => {
  it("passes brand and category straight onto the listing", () => {
    expect(offerShopHref({ shop_filters: { brand: "michelin", category: "suv" } })).toBe("/tyres?brand=michelin&category=suv");
    expect(offerShopHref({ shop_filters: { brand: "bridgestone" } })).toBe("/tyres?brand=bridgestone");
  });
  it("links to the plain listing when the offer is not scoped", () => {
    expect(offerShopHref({ shop_filters: {} })).toBe("/tyres");
  });
  it("ignores keys it does not know", () => {
    expect(offerShopHref({ shop_filters: { brand: "x", zone: "9" } as never })).toBe("/tyres?brand=x");
  });
});

describe("offer type facet", () => {
  it("uses the category, else all tyres", () => {
    expect(offerTypeKey({ shop_filters: { category: "suv" } })).toBe("suv");
    expect(offerTypeKey({ shop_filters: {} })).toBe("all");
    expect(offerTypeLabel("all")).toBe("All tyres");
    expect(offerTypeLabel("suv")).toBe("SUV");
  });
});

describe("formatOfferEnd year handling", () => {
  it("adds the year when the end date is not in the current year, drops it when it is", async () => {
    const { vi } = await import("vitest");
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-05T03:00:00Z"));
      expect(formatOfferEnd("2027-01-01")).toBe("Ends 1 Jan 2027");
      expect(formatOfferEnd("2027-01-01T00:00:00+00:00")).toBe("Ends 1 Jan 2027");
      expect(formatOfferEnd("2025-12-31")).toBe("Ends 31 Dec 2025");
      expect(formatOfferEnd("2026-12-30")).toBe("Ends 30 Dec");
      expect(formatOfferEnd("garbage")).toBe("Ends soon");
    } finally {
      vi.useRealTimers();
    }
  });
});
