import type { CityDetail, LocationState } from "./types";

/**
 * Stub-mode tree. Zone id 1 matches the catalogue stub's `FIXTURE_ZONE_ID`, so
 * "set my area" from a city page works against the other stubs.
 */
export const FIXTURE_LOCATION_TREE: LocationState[] = [
  {
    code: "NSW",
    name: "New South Wales",
    slug: "nsw",
    city_count: 1,
    suburb_count: 2,
    cities: [
      {
        name: "Sydney",
        slug: "sydney",
        service_zone_id: 2,
        service_zone_ids: [2],
        suburb_count: 2,
        suburbs: [
          { name: "Bondi", slug: "bondi", postcode: "2026", service_zone_id: 2 },
          { name: "Sydney", slug: "sydney", postcode: "2000", service_zone_id: 2 },
        ],
      },
    ],
  },
  {
    code: "VIC",
    name: "Victoria",
    slug: "vic",
    city_count: 2,
    suburb_count: 5,
    cities: [
      {
        name: "Geelong",
        slug: "geelong",
        service_zone_id: 4,
        service_zone_ids: [4],
        suburb_count: 2,
        suburbs: [
          { name: "Geelong", slug: "geelong", postcode: "3220", service_zone_id: 4 },
          { name: "Newcomb", slug: "newcomb", postcode: "3219", service_zone_id: 4 },
        ],
      },
      {
        name: "Melbourne",
        slug: "melbourne",
        service_zone_id: 1,
        service_zone_ids: [1],
        suburb_count: 3,
        suburbs: [
          { name: "Melbourne", slug: "melbourne", postcode: "3000", service_zone_id: 1 },
          { name: "Richmond", slug: "richmond", postcode: "3121", service_zone_id: 1 },
          { name: "St Kilda", slug: "st-kilda", postcode: "3182", service_zone_id: 1 },
        ],
      },
    ],
  },
];

export function buildFixtureCityDetail(stateSlug: string, citySlug: string): CityDetail | null {
  const state = FIXTURE_LOCATION_TREE.find((s) => s.slug === stateSlug.toLowerCase());
  const city = state?.cities.find((c) => c.slug === citySlug);
  if (!state || !city) return null;
  const { suburbs, ...summary } = city;
  return {
    state: { code: state.code, name: state.name, slug: state.slug },
    city: summary,
    suburbs,
    coverage: {
      zones: [
        {
          id: city.service_zone_id,
          name: `${city.name} Metro`,
          type: "radius",
          radius_km: 25,
          operating_hours: {
            mon: { open: "07:00", close: "18:00" },
            tue: { open: "07:00", close: "18:00" },
            sat: { open: "08:00", close: "16:00" },
            sun: null,
          },
        },
      ],
      notes: [`${city.name} Metro: we travel up to 25 km from our ${city.name} base.`, "Closed on Sun."],
    },
    content: null,
  };
}
