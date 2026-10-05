import { SAMPLE_CONTENT_ENABLED } from "@/lib/site/sample";
import type { Offer } from "./types";
import { loadOffer, loadOffers } from "./load";

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/**
 * SAMPLE offers for design review. Invented headlines, no real discounts.
 * Used only when the API has no live offers and `SAMPLE_CONTENT` is not `off`.
 */
export function buildSampleOffers(): Offer[] {
  const base = { image_path: null, zone_ids: [] as number[], starts_at: inDays(-3) };
  return [
    {
      ...base,
      id: 9001,
      slug: "sample-4-for-3",
      title: "Buy 3 premium tyres, get the 4th free",
      summary: "Fit a full set from selected premium brands and the cheapest tyre is on us.",
      brand: { name: "Bridgestone", slug: "bridgestone", logo_path: null },
      discount_description: "Fourth tyre free",
      badge_text: "4 for 3",
      code: null,
      ends_at: inDays(9),
      terms: "Sample terms. Sets of four tyres of the same pattern in one order. Cheapest tyre is free.",
      shop_filters: { brand: "bridgestone" },
    },
    {
      ...base,
      id: 9002,
      slug: "sample-flexible-10",
      title: "$10 off when you book flexible",
      summary: "Be available between 8am and 5pm and take $10 off your fitting.",
      brand: null,
      discount_description: "$10 off your fitting",
      badge_text: "$10 off",
      code: null,
      ends_at: inDays(60),
      terms: "Sample terms. Applies once per order when the flexible time option is chosen.",
      shop_filters: {},
    },
    {
      ...base,
      id: 9003,
      slug: "sample-suv-20-off",
      title: "20% off SUV and 4WD tyres",
      summary: "All-terrain and highway tyres for SUVs and utes, fitted where you are.",
      brand: { name: "Michelin", slug: "michelin", logo_path: null },
      discount_description: "20% off",
      badge_text: "20% off",
      code: "SUV20",
      ends_at: inDays(25),
      terms: "Sample terms. Selected SUV tyres only. Enter the code in your cart.",
      shop_filters: { brand: "michelin", category: "suv" },
    },
    {
      ...base,
      id: 9004,
      slug: "sample-gift-card",
      title: "Up to $100 gift card with a set of four",
      summary: "Claim a gift card when you fit a full set of selected mid-range tyres.",
      brand: { name: "Continental", slug: "continental", logo_path: null },
      discount_description: "Gift card",
      badge_text: "Gift card",
      code: null,
      ends_at: inDays(40),
      terms: "Sample terms. Gift card issued after fitting, subject to eligible tyre models.",
      shop_filters: { brand: "continental" },
    },
    {
      ...base,
      id: 9005,
      slug: "sample-price-drop",
      title: "Price drop on popular patterns",
      summary: "Lower prices on some of our most-fitted tyres this month.",
      brand: { name: "Pirelli", slug: "pirelli", logo_path: null },
      discount_description: "Lower prices",
      badge_text: "Price drop",
      code: null,
      ends_at: inDays(12),
      terms: null,
      shop_filters: { brand: "pirelli" },
    },
    {
      ...base,
      id: 9006,
      slug: "sample-clearance",
      title: "Clearance on last season tyres",
      summary: "Last-chance prices on selected patterns while stock lasts.",
      brand: null,
      discount_description: "Clearance prices",
      badge_text: "Clearance",
      code: null,
      ends_at: inDays(6),
      terms: "Sample terms. While stock lasts.",
      shop_filters: {},
    },
  ];
}

export type OffersResult = { offers: Offer[]; sample: boolean };

/** Live offers when there are any, else the marked sample set. Never throws. */
export async function loadOffersOrSample(): Promise<OffersResult> {
  const live = await loadOffers();
  if (live.length > 0) return { offers: live, sample: false };
  return SAMPLE_CONTENT_ENABLED ? { offers: buildSampleOffers(), sample: true } : { offers: [], sample: false };
}

/** One offer by slug: live first, then the sample set (only while sample content is on). */
export async function loadOfferOrSample(slug: string): Promise<{ offer: Offer; sample: boolean } | null> {
  const live = await loadOffer(slug);
  if (live) return { offer: live, sample: false };
  if (!SAMPLE_CONTENT_ENABLED) return null;
  const hit = buildSampleOffers().find((o) => o.slug === slug);
  return hit ? { offer: hit, sample: true } : null;
}
