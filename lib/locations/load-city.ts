import { locationsBackend } from "./backend";
import { buildSampleCityDetail, loadLocationTreeOrSample } from "./sample";
import { LOCATIONS_TAG, cityTag } from "./tags";
import type { CityDetail, CityDetailResponse } from "./types";

/**
 * City detail for the location pages. Live API first; while the API has no
 * location tree at all (design phase) the marked sample city is used instead.
 * Returns `null` for a pair that is not a served city.
 */
export async function loadCityDetail(state: string, city: string): Promise<{ detail: CityDetail; sample: boolean } | null> {
  const { sample } = await loadLocationTreeOrSample();
  if (sample) {
    const detail = buildSampleCityDetail(state, city);
    return detail ? { detail, sample: true } : null;
  }
  const result = await locationsBackend.city(state, city, {
    next: { revalidate: 3600, tags: [LOCATIONS_TAG, cityTag(state, city)] },
  });
  if (result.status !== 200) return null;
  const detail = (result.body as CityDetailResponse).data ?? null;
  return detail ? { detail, sample: false } : null;
}
