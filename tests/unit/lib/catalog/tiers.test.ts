import { describe, expect, it } from "vitest";
import { deriveTiers } from "@/lib/catalog/tiers";
import type { TyreModelGroup } from "@/lib/catalog/group-by-model";

function group(slug: string, fromPrice?: number): TyreModelGroup {
  return {
    model: {
      id: 1,
      slug,
      name: slug,
      brand: { id: 1, name: "B", slug: "b", logo_path: null, country_of_origin: null },
      category: "car",
      tyre_type: "highway",
      images: [],
    },
    variants: [],
    fromPrice,
  };
}

describe("deriveTiers", () => {
  it("returns null with fewer than three priced models", () => {
    expect(deriveTiers([group("a", 100), group("b", 200)])).toBeNull();
    expect(deriveTiers([group("a", 100), group("b"), group("c", 300)])).toBeNull();
  });

  it("returns null when every model costs the same", () => {
    expect(deriveTiers([group("a", 100), group("b", 100), group("c", 100)])).toBeNull();
  });

  it("picks highest as premium, lowest as budget, and the closest to the midpoint as mid-range", () => {
    const result = deriveTiers([group("a", 20000), group("b", 32000), group("c", 29000), group("d", 21000)])!;
    expect(result.picks.map((p) => [p.tier, p.group.model.slug])).toEqual([
      ["premium", "b"],
      ["mid", "c"],
      ["budget", "a"],
    ]);
    expect(result.byModel).toMatchObject({ b: "premium", a: "budget", c: "mid" });
    expect(Object.keys(result.byModel)).toHaveLength(4);
  });

  it("with exactly three models each gets its own tier", () => {
    const result = deriveTiers([group("x", 300), group("y", 100), group("z", 200)])!;
    expect(result.byModel).toEqual({ x: "premium", y: "budget", z: "mid" });
  });
});
