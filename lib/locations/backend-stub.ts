import { buildFixtureCityDetail, FIXTURE_LOCATION_TREE } from "./fixtures";
import type { LocationsBackend } from "./backend-client";

/** In-memory stub for `/api/v1/locations*`, opt-in via `LOCATIONS_BACKEND=stub`. */
export const stubLocationsBackend: LocationsBackend = {
  async tree(_cacheInit?: RequestInit) {
    void _cacheInit;
    return { status: 200, body: { data: FIXTURE_LOCATION_TREE } };
  },
  async city(state: string, city: string, _cacheInit?: RequestInit) {
    void _cacheInit;
    const detail = buildFixtureCityDetail(state, city);
    return detail ? { status: 200, body: { data: detail } } : { status: 404, body: { message: "Not Found" } };
  },
};
