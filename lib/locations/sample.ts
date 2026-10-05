import { SAMPLE_CONTENT_ENABLED } from "@/lib/site/sample";
import { locationsBackend } from "./backend";
import { LOCATIONS_TAG } from "./tags";
import type { CityDetail, LocationState, LocationsResponse } from "./types";

/**
 * SAMPLE coverage tree for design review: 5 states, 10 cities, a handful of
 * suburbs each. NOT a statement of where we operate. Used only when the API
 * returns no locations and `SAMPLE_CONTENT` is not `off` (see lib/site/sample.ts).
 */
type Seed = { state: [code: string, name: string, slug: string]; cities: { name: string; suburbs: [string, string][] }[] };

const SEEDS: Seed[] = [
  {
    state: ["NSW", "New South Wales", "nsw"],
    cities: [
      { name: "Sydney", suburbs: [["Sydney", "2000"], ["Bondi", "2026"], ["Parramatta", "2150"], ["Bankstown", "2200"], ["Chatswood", "2067"], ["Manly", "2095"], ["Penrith", "2750"], ["Randwick", "2031"], ["Mascot", "2020"], ["Blacktown", "2148"]] },
      { name: "Wollongong", suburbs: [["Wollongong", "2500"], ["Fairy Meadow", "2519"], ["Shellharbour", "2529"], ["Dapto", "2530"]] },
      { name: "Central Coast", suburbs: [["Gosford", "2250"], ["Terrigal", "2260"], ["Wyong", "2259"], ["The Entrance", "2261"]] },
    ],
  },
  {
    state: ["VIC", "Victoria", "vic"],
    cities: [
      { name: "Melbourne", suburbs: [["Melbourne", "3000"], ["Richmond", "3121"], ["St Kilda", "3182"], ["Footscray", "3011"], ["Brighton", "3186"], ["Box Hill", "3128"], ["Preston", "3072"], ["Dandenong", "3175"]] },
      { name: "Geelong", suburbs: [["Geelong", "3220"], ["Newcomb", "3219"], ["Belmont", "3216"], ["Highton", "3216"]] },
    ],
  },
  {
    state: ["QLD", "Queensland", "qld"],
    cities: [
      { name: "Brisbane", suburbs: [["Brisbane City", "4000"], ["South Brisbane", "4101"], ["Chermside", "4032"], ["Indooroopilly", "4068"], ["Sunnybank", "4109"], ["Carindale", "4152"]] },
      { name: "Gold Coast", suburbs: [["Surfers Paradise", "4217"], ["Southport", "4215"], ["Robina", "4226"], ["Burleigh Heads", "4220"]] },
      { name: "Sunshine Coast", suburbs: [["Maroochydore", "4558"], ["Caloundra", "4551"], ["Noosa Heads", "4567"], ["Buderim", "4556"]] },
    ],
  },
  {
    state: ["WA", "Western Australia", "wa"],
    cities: [{ name: "Perth", suburbs: [["Perth", "6000"], ["Fremantle", "6160"], ["Joondalup", "6027"], ["Subiaco", "6008"], ["Cannington", "6107"], ["Rockingham", "6168"]] }],
  },
  {
    state: ["SA", "South Australia", "sa"],
    cities: [{ name: "Adelaide", suburbs: [["Adelaide", "5000"], ["Glenelg", "5045"], ["Norwood", "5067"], ["Salisbury", "5108"], ["Marion", "5043"], ["Unley", "5061"]] }],
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
