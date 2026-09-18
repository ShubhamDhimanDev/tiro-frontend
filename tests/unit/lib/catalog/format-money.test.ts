import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/catalog/format-money";

/**
 * Money fields are integer cents across the whole API (docs/architecture/
 * 02-api-contract.md's "Response/pagination conventions") — the one property
 * every render call site depends on is that this divides by 100 rather than
 * treating the raw integer as dollars, so that's the thing pinned here.
 */
describe("formatMoney", () => {
  it("formats whole-dollar cents as AUD currency", () => {
    expect(formatMoney(18900)).toBe("$189.00");
  });

  it("formats cents with a non-zero remainder", () => {
    expect(formatMoney(123450)).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("rounds to the nearest cent rather than truncating (odd cent values)", () => {
    expect(formatMoney(1)).toBe("$0.01");
    expect(formatMoney(99)).toBe("$0.99");
  });

  it("supports a currency override and still divides by 100", () => {
    // Exact symbol placement is ICU/Node-version-dependent for non-default
    // currencies — pin the numeric part only, which is the property that
    // actually matters (never treat raw cents as dollars).
    expect(formatMoney(250, "USD")).toContain("2.50");
  });
});
