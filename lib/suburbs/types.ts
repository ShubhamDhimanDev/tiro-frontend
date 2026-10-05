/**
 * Shared types for the `GET /api/v1/suburbs` boundary — resolving a Google
 * Places-picked address into the `Suburb.id` `POST /api/v1/orders`'s
 * `address.suburb_id` requires.
 *
 * Mirrors docs/architecture/02-api-contract.md's "`GET /api/v1/suburbs` —
 * resolving a `Suburb.id`" section (added 2026-09-22). Keep in sync with
 * backend-agent's contract rather than inventing local variants — see
 * `lib/suburbs/backend.ts` for the live/stub switch.
 */

/** One candidate row. `state` is the short code (`State.code`, e.g. `"VIC"`) — same format as Google Places' `administrative_area_level_1` short name. */
export interface SuburbRecord {
  id: number;
  name: string;
  state: string;
  postcode: string;
}

/**
 * Unpaginated, same posture as `/vehicles/makes` — small, bounded result
 * set. `data: []` is the documented "valid input, no match" case, not an
 * error. More than one row is the documented "same name+postcode pair
 * exists in two different states" ambiguous case — not collapsed
 * server-side, the caller (`lib/checkout/address.ts`'s `resolveSuburbId()`)
 * disambiguates client-side using each row's `state`.
 */
export interface SuburbsResponse {
  data: SuburbRecord[];
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}

/**
 * One typeahead suggestion from `GET /api/v1/suburbs/search?q=` (Phase 7). `id` is
 * the `Suburb.id` an order's `address.suburb_id` needs; `serviceable` says whether
 * we fit tyres there (same resolver as `POST /serviceability`).
 */
export interface SuburbSuggestion {
  id: number;
  name: string;
  state: string;
  postcode: string;
  label: string;
  serviceable: boolean;
  service_zone_id: number | null;
}

export interface SuburbSearchResponse {
  data: SuburbSuggestion[];
}
