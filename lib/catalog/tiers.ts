import type { Tier } from "@/components/ui/badge";
import type { TyreModelGroup } from "./group-by-model";

export interface TierPick {
  tier: Tier;
  group: TyreModelGroup;
}

export interface TierResult {
  /** Exactly three picks ordered premium, mid, budget, or `[]` when three cannot be made (badges may still apply). */
  picks: TierPick[];
  /** Tier for every priced model in the result set, keyed by `model.slug`. */
  byModel: Record<string, Tier>;
}

/** Fewer distinct priced models than this and a three-way split is meaningless. */
export const MIN_MODELS_FOR_TIERS = 3;

/** The API's curated tier for a model, when it has one (`tyre_model.tier`, else the item's own `tier`, else the brand's). */
export function apiTierOf(group: TyreModelGroup): Tier | null {
  return group.model.tier ?? group.variants[0]?.tier ?? group.model.brand.tier ?? null;
}

/**
 * Tiers for a page of results. Prefers the API's curated `tier` (Phase 6a,
 * from `brands.tier`): a model with one gets that badge, and when premium, mid
 * and budget are each present the picks are the first model of each tier in
 * result order. Models the API leaves unclassified get no badge (mixing two
 * methods on one page would label things inconsistently). Only when the API has
 * classified nothing on the page does it fall back to the price-based
 * derivation in `derivePriceTiers`. Returns `null` when neither gives anything.
 */
export function deriveTiers(groups: TyreModelGroup[]): TierResult | null {
  const apiByModel: Record<string, Tier> = {};
  const firstOfTier = new Map<Tier, TyreModelGroup>();
  for (const group of groups) {
    const tier = apiTierOf(group);
    if (!tier) continue;
    apiByModel[group.model.slug] = tier;
    if (!firstOfTier.has(tier)) firstOfTier.set(tier, group);
  }

  const apiPicks: TierPick[] | null =
    firstOfTier.has("premium") && firstOfTier.has("mid") && firstOfTier.has("budget")
      ? (["premium", "mid", "budget"] as const).map((tier) => ({ tier, group: firstOfTier.get(tier)! }))
      : null;

  if (Object.keys(apiByModel).length === 0) return derivePriceTiers(groups);
  return { picks: apiPicks ?? [], byModel: apiByModel };
}

/**
 * Price-based Premium / Mid-range / Budget picks from a page of results: the
 * fallback when the API has not classified any brand on the page. The model with the highest "from" price is Premium, the lowest is
 * Budget, and Mid-range is the remaining model whose price sits closest to the
 * midpoint of those two. Every other priced model gets a tier from its price
 * rank (top third premium, middle third mid, bottom third budget) so cards can
 * carry a badge.
 *
 * Returns `null` when tiers can't be honestly derived: fewer than three priced
 * models (results without a resolved location carry no price, so ISR brand and
 * type pages never get tiers), or every model costs the same. Scope is the
 * models on the current page; a different page can rank differently.
 */
export function derivePriceTiers(groups: TyreModelGroup[]): TierResult | null {
  const priced = groups
    .map((group, index) => ({ group, index, price: group.fromPrice }))
    .filter((entry): entry is { group: TyreModelGroup; index: number; price: number } => typeof entry.price === "number");

  if (priced.length < MIN_MODELS_FOR_TIERS) return null;

  // Highest price first; original order breaks ties so the result is stable.
  const ranked = [...priced].sort((a, b) => b.price - a.price || a.index - b.index);
  const premium = ranked[0];
  const budget = ranked[ranked.length - 1];
  if (premium.price === budget.price) return null;

  const target = (premium.price + budget.price) / 2;
  const middle = ranked.slice(1, -1);
  const mid = middle.reduce((best, entry) =>
    Math.abs(entry.price - target) < Math.abs(best.price - target) ? entry : best,
  );

  const byModel: Record<string, Tier> = {};
  ranked.forEach((entry, rank) => {
    const share = rank / ranked.length;
    byModel[entry.group.model.slug] = share < 1 / 3 ? "premium" : share < 2 / 3 ? "mid" : "budget";
  });
  byModel[premium.group.model.slug] = "premium";
  byModel[mid.group.model.slug] = "mid";
  byModel[budget.group.model.slug] = "budget";

  return {
    picks: [
      { tier: "premium", group: premium.group },
      { tier: "mid", group: mid.group },
      { tier: "budget", group: budget.group },
    ],
    byModel,
  };
}
