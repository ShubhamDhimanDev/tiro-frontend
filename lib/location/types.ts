/**
 * Shared types for the location/serviceability boundary.
 *
 * Mirrors docs/architecture/02-api-contract.md's "Location/serviceability
 * state flow" section and the "Catalogue & location endpoints" addendum.
 * Keep in sync with backend-agent's contract rather than inventing local
 * variants — see `lib/location/backend.ts` for why this domain currently
 * defaults to a stub (backend-agent's `POST /api/v1/serviceability` isn't
 * live yet as of this build).
 */

/**
 * `POST /api/v1/serviceability` request body. Exactly one of
 * `postcode`/`suburb` is expected — the contract doesn't say which takes
 * precedence if both are sent, so the capture UI only ever sends one.
 */
export interface ServiceabilityCheckInput {
  postcode?: string;
  suburb?: string;
}

/**
 * The contract states `suggested_areas: []` without specifying the item
 * shape. Modelled as plain display strings (e.g. "Richmond VIC 3121") —
 * the most natural reading for a "not serviceable here, but nearby..."
 * suggestion list. Flagged as a judgment call — see completion report.
 */
export type SuggestedArea = string;

/** Raw `POST /api/v1/serviceability` response body (unwrapped — the contract shows no `data` envelope for this endpoint). */
export interface ServiceabilityResult {
  serviceable: boolean;
  service_zone_id: number | string | null;
  label: string | null;
  suggested_areas: SuggestedArea[];
}

/** What we actually persist client-side once serviceability resolves `true`. */
export interface ServiceZoneSnapshot {
  zoneId: string;
  label: string;
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
