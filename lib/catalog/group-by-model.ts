import type { TyreListItem, TyreModelSummary } from "./types";

/**
 * `/api/v1/tyres` results are `TyreVariant`-level (one row per sellable
 * size); each item nests its parent `tyre_model` "so frontend-agent can
 * group into 'from $X' cards client-side without a separate model-level
 * endpoint" (docs/architecture/02-api-contract.md). This is that grouping.
 *
 * Groups are ordered by first appearance in `items` (i.e. whatever order
 * the API/stub already returned) so this doesn't silently re-sort a
 * server-ranked result set.
 */
export interface TyreModelGroup {
  model: TyreModelSummary;
  variants: TyreListItem[];
  /** Lowest price (promo, zone or list price) among variants that have one — `undefined` if none do. */
  fromPrice?: number;
}

export function groupTyresByModel(items: TyreListItem[]): TyreModelGroup[] {
  const order: string[] = [];
  const groups = new Map<string, TyreModelGroup>();

  for (const item of items) {
    const key = item.tyre_model.slug;
    let group = groups.get(key);
    if (!group) {
      group = { model: item.tyre_model, variants: [] };
      groups.set(key, group);
      order.push(key);
    }
    group.variants.push(item);
  }

  for (const group of groups.values()) setFromPrice(group);

  return order.map((key) => groups.get(key)!);
}

/**
 * One single-variant group per item, in the order given: what the product
 * cards render, so every size/load/speed of a pattern gets its own card
 * instead of a size picker inside one card. Use `groupTyresByModel` for
 * anything that is about patterns (tiers, pattern chips).
 */
export function groupTyresByVariant(items: TyreListItem[]): TyreModelGroup[] {
  return items.map(variantGroup);
}

/** A group holding just this one variant. */
export function variantGroup(item: TyreListItem): TyreModelGroup {
  return setFromPrice({ model: item.tyre_model, variants: [item] });
}

function setFromPrice(group: TyreModelGroup): TyreModelGroup {
  const prices = group.variants
    .map((v) => v.promotional_price ?? v.unit_price ?? v.list_price)
    .filter((p): p is number => typeof p === "number");
  if (prices.length > 0) group.fromPrice = Math.min(...prices);
  return group;
}
