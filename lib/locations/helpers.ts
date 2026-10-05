import { locationsBackend } from "./backend";
import { LOCATIONS_TAG } from "./tags";
import type { LocationState, LocationsResponse } from "./types";

export const cityHref = (stateSlug: string, citySlug: string) => `/locations/${stateSlug}/${citySlug}`;

/** All served cities flattened, with their state, in state then city order. */
export function flattenCities(tree: LocationState[]) {
  return tree.flatMap((state) => state.cities.map((city) => ({ state, city, href: cityHref(state.slug, city.slug) })));
}

/**
 * Fetches the tree for ISR pages and shell chrome (footer, mega menu, home).
 * Never throws: an API failure returns `[]` so every consumer renders its
 * graceful empty state instead of breaking the page.
 */
export async function loadLocationTree(revalidate = 3600): Promise<LocationState[]> {
  const result = await locationsBackend.tree({ next: { revalidate, tags: [LOCATIONS_TAG] } });
  if (result.status !== 200) return [];
  const data = (result.body as LocationsResponse).data;
  return Array.isArray(data) ? data : [];
}
