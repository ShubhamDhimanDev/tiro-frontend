import { SAMPLE_CONTENT_ENABLED } from "@/lib/site/sample";
import { locationsBackend } from "./backend";
import { LOCATIONS_TAG } from "./tags";
import type { CityDetail, LocationState, LocationsResponse } from "./types";

/**
 * SAMPLE coverage tree for design review: Melbourne only, a handful of
 * suburbs. NOT a statement of where we operate: the real service area is
 * whatever the admin panel serves (`GET /api/v1/locations`). Used only when the
 * API returns no locations and `SAMPLE_CONTENT` is `on` (see lib/site/sample.ts).
 */
type Seed = { state: [code: string, name: string, slug: string]; cities: { name: string; suburbs: [string, string][] }[] };

const SEEDS: Seed[] = [
  {
    state: ["VIC", "Victoria", "vic"],
    cities: [
      { name: "Melbourne", suburbs: [["Melbourne", "3000"], ["Richmond", "3121"], ["St Kilda", "3182"], ["Footscray", "3011"], ["Brighton", "3186"], ["Box Hill", "3128"], ["Preston", "3072"], ["Dandenong", "3175"]] },
    ],
  },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

let zone = 100;
export const SAMPLE_LOCATION_TREE: LocationState[] = SEEDS.map(({ state: [code, name, slug], cities }) => {
  const built = cities.map((c) => {
    const zoneId = ++zone;
    const suburbs = c.suburbs.map(([n, postcode]) => ({ name: n, slug: slugify(n), postcode, service_zone_id: zoneId }));
    return { name: c.name, slug: slugify(c.name), service_zone_id: zoneId, service_zone_ids: [zoneId], suburb_count: suburbs.length, suburbs };
  });
  return { code, name, slug, city_count: built.length, suburb_count: built.reduce((n, c) => n + c.suburb_count, 0), cities: built };
});

export function buildSampleCityDetail(stateSlug: string, citySlug: string): CityDetail | null {
  const state = SAMPLE_LOCATION_TREE.find((s) => s.slug === stateSlug.toLowerCase());
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
          radius_km: 30,
          operating_hours: {
            mon: { open: "07:00", close: "18:00" },
            tue: { open: "07:00", close: "18:00" },
            wed: { open: "07:00", close: "18:00" },
            thu: { open: "07:00", close: "18:00" },
            fri: { open: "07:00", close: "18:00" },
            sat: { open: "08:00", close: "16:00" },
            sun: null,
          },
        },
      ],
      notes: [
        `${city.name} Metro: sample coverage, roughly 30 km from the city centre.`,
        "Outer suburbs may have longer lead times. Enter your suburb to confirm.",
      ],
    },
    content: null,
  };
}

export type TreeResult = { tree: LocationState[]; sample: boolean };

/**
 * The location tree for the content pages: the API tree when it has any, else
 * the marked sample tree. Never throws.
 */
export async function loadLocationTreeOrSample(revalidate = 3600): Promise<TreeResult> {
  try {
    const result = await locationsBackend.tree({ next: { revalidate, tags: [LOCATIONS_TAG] } });
    if (result.status === 200) {
      const data = (result.body as LocationsResponse).data;
      if (Array.isArray(data) && data.length > 0) return { tree: data, sample: false };
    }
  } catch {
    // fall through to the sample
  }
  return SAMPLE_CONTENT_ENABLED ? { tree: SAMPLE_LOCATION_TREE, sample: true } : { tree: [], sample: false };
}
