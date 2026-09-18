import { describe, expect, it } from "vitest";
import { groupTyresByModel } from "@/lib/catalog/group-by-model";
import type { TyreListItem, TyreModelSummary } from "@/lib/catalog/types";

function model(overrides: Partial<TyreModelSummary> = {}): TyreModelSummary {
  return {
    id: 1,
    slug: "bridgestone-turanza-t005",
    name: "Turanza T005",
    brand: { id: 1, name: "Bridgestone", slug: "bridgestone", logo_path: null, country_of_origin: "Japan" },
    category: "car",
    tyre_type: "highway",
    images: [],
    ...overrides,
  };
}

function item(overrides: Partial<TyreListItem> = {}): TyreListItem {
  return {
    id: 1,
    slug: "bridgestone-turanza-t005-205-55-r16",
    sku: "SKU-1",
    width: 205,
    profile: 55,
    rim_diameter: 16,
    load_index: "91",
    speed_rating: "V",
    sidewall: "standard",
    tyre_model: model(),
    ...overrides,
  };
}

describe("groupTyresByModel", () => {
  it("groups variants under their parent model, preserving first-appearance order", () => {
    const modelA = model({ id: 1, slug: "model-a", name: "Model A" });
    const modelB = model({ id: 2, slug: "model-b", name: "Model B" });

    const items = [
      item({ id: 10, slug: "model-b-1", tyre_model: modelB }),
      item({ id: 11, slug: "model-a-1", tyre_model: modelA }),
      item({ id: 12, slug: "model-a-2", tyre_model: modelA }),
    ];

    const groups = groupTyresByModel(items);

    expect(groups).toHaveLength(2);
    expect(groups[0].model.slug).toBe("model-b");
    expect(groups[0].variants).toHaveLength(1);
    expect(groups[1].model.slug).toBe("model-a");
    expect(groups[1].variants).toHaveLength(2);
  });

  it("computes fromPrice as the lowest price among priced variants, preferring promotional_price", () => {
    const items = [
      item({ id: 1, unit_price: 20000, promotional_price: null }),
      item({ id: 2, unit_price: 30000, promotional_price: 15000 }),
    ];

    const [group] = groupTyresByModel(items);

    // Lowest of [20000 (unit), 15000 (promotional, preferred over its own unit_price)] = 15000.
    expect(group.fromPrice).toBe(15000);
  });

  it("leaves fromPrice undefined when no variant has a price (no zone resolved)", () => {
    const items = [item({ id: 1, unit_price: undefined, promotional_price: undefined })];

    const [group] = groupTyresByModel(items);

    expect(group.fromPrice).toBeUndefined();
  });

  it("returns an empty array for an empty input", () => {
    expect(groupTyresByModel([])).toEqual([]);
  });
});
