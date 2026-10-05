import { withApiNav, NAV_GROUPS, type NavGroup } from "@/lib/site/nav";
import { flattenCities, loadLocationTree } from "@/lib/locations/helpers";
import { formatOfferEnd } from "@/lib/offers/helpers";
import { loadOffers } from "@/lib/offers/load";

/**
 * Nav groups with live data (cities for "Where we go", the soonest-ending
 * offer for the Deals promo tile). Server-only; both fetches are ISR-cached
 * and fail soft to the static groups.
 */
export async function loadNavGroups(): Promise<NavGroup[]> {
  const [tree, offers] = await Promise.all([loadLocationTree(), loadOffers()]);
  const featured = offers[0];
  return withApiNav(NAV_GROUPS, {
    cities: flattenCities(tree).map(({ state, city, href }) => ({ name: city.name, stateCode: state.code, href })),
    promo: featured
      ? {
          href: `/deals/${featured.slug}`,
          eyebrow: formatOfferEnd(featured.ends_at),
          title: featured.badge_text,
          body: featured.title,
          cta: "See the offer",
        }
      : null,
  });
}
