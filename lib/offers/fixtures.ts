import type { Offer } from "./types";

/** ISO date `days` from now (UTC), so stub offers are always current. */
function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/** Stub-mode fixtures. Shapes match the Phase 6a contract; copy is invented. */
export function buildFixtureOffers(): Offer[] {
  return [
    {
      id: 1,
      slug: "bridgestone-4-for-3",
      title: "Buy 3 Bridgestone tyres, get the 4th free",
      summary: "Fit a full set of Bridgestone tyres and the cheapest one is on us.",
      brand: { name: "Bridgestone", slug: "bridgestone", logo_path: null },
      discount_description: "Fourth tyre free",
      badge_text: "4 for 3",
      code: "BRIDGESTONE4",
      starts_at: inDays(-2),
      ends_at: inDays(5),
      terms: "Stub terms. Applies to sets of four Bridgestone tyres in one order. Enter the code in your cart.",
      image_path: null,
      shop_filters: { brand: "bridgestone" },
      zone_ids: [],
    },
    {
      id: 2,
      slug: "michelin-20-off",
      title: "20% off Michelin SUV tyres",
      summary: "Save on Michelin tyres for SUVs, fitted where you are.",
      brand: { name: "Michelin", slug: "michelin", logo_path: null },
      discount_description: "20% off",
      badge_text: "20% off",
      code: "MICHELIN20",
      starts_at: inDays(-10),
      ends_at: inDays(40),
      terms: "Stub terms. Michelin SUV tyres only. Enter the code in your cart.",
      image_path: null,
      shop_filters: { brand: "michelin", category: "suv" },
      zone_ids: [],
    },
    {
      id: 3,
      slug: "welcome-10",
      title: "10% off your first order",
      summary: null,
      brand: null,
      discount_description: "10% off",
      badge_text: "10% off",
      code: "WELCOME10",
      starts_at: inDays(-30),
      ends_at: inDays(90),
      terms: null,
      image_path: null,
      shop_filters: {},
      zone_ids: [],
    },
  ];
}
