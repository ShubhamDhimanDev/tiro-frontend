/**
 * Shared types for the vehicle identification / fitment boundary.
 *
 * Mirrors docs/architecture/02-api-contract.md's "Vehicle identification &
 * fitment endpoints" section (Phase 2, added 2026-09-14). Keep in sync with
 * backend-agent's contract rather than inventing local variants — see
 * `lib/vehicles/backend.ts` for the live/stub switch.
 */

export interface MakesResponse {
  data: string[];
}

export interface ModelsResponse {
  data: string[];
}

/**
 * One candidate `Vehicle` row from `GET /api/v1/vehicles/years`. `series`/
 * `body_type` aren't documented as nullable in the contract's example, but
 * modelled as such defensively — plausible for some make/model rows to have
 * one or both unset. `year_to` is likewise modelled as nullable for a
 * still-in-production model, though the contract's example doesn't show
 * that case either. Flagged as a judgment call in the completion report.
 */
export interface VehicleYearOption {
  id: number;
  year_from: number;
  year_to: number | null;
  series: string | null;
  body_type: string | null;
}

export interface VehicleYearsResponse {
  data: VehicleYearOption[];
}

export interface ResolvedVehicle {
  id: number;
  make: string;
  model: string;
  series: string | null;
  year_from: number;
  year_to: number | null;
  body_type: string | null;
}

/**
 * `confidence`'s exact enum isn't spelled out beyond the contract's single
 * `"confirmed"` example — kept as a free string rather than a guessed union
 * so an unrecognized value from the real backend still renders instead of
 * silently failing a type check. Flagged in the completion report.
 */
export interface VehicleFitmentSize {
  width: number;
  profile: number;
  rim_diameter: number;
  load_index: string;
  speed_rating: string;
  confidence: string;
}

export interface VehicleFitmentAll {
  all: VehicleFitmentSize;
}

export interface VehicleFitmentFrontRear {
  front: VehicleFitmentSize;
  rear: VehicleFitmentSize;
}

/** `{}` is the documented zero-fitment-configured-yet state — a data-entry gap, not an error. */
export type VehicleFitments = VehicleFitmentAll | VehicleFitmentFrontRear | Record<string, never>;

export interface VehicleFitmentData {
  vehicle: ResolvedVehicle;
  is_staggered: boolean;
  fitments: VehicleFitments;
}

export interface VehicleFitmentResponse {
  data: VehicleFitmentData;
}

export function hasNoFitmentData(fitments: VehicleFitments): boolean {
  return Object.keys(fitments).length === 0;
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
