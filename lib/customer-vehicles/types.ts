import type { VehicleFitments } from "@/lib/vehicles/types";

/**
 * Shared types for the "saved vehicles" account boundary —
 * `/api/v1/customer/vehicles*`.
 *
 * Mirrors docs/architecture/02-api-contract.md's "Customer account
 * endpoints" section (Phase 7, added 2026-09-24) and
 * docs/architecture/01-data-model.md's `CustomerVehicle` section. Same
 * "no guest path at all, `auth:customer`-only" posture as
 * `lib/price-guarantee/types.ts` documents for itself — there is no
 * manage-token/order-token fallback on this domain, only the customer's own
 * Sanctum bearer token.
 */

/** Minimal nested `Vehicle` summary — present when `vehicle_id` is set, `null` for a customer-typed (no catalogue vehicle resolved) saved vehicle. Same "nest the parent so the caller doesn't need a second request" convention as `/api/v1/tyres`. */
export interface CustomerVehicleSummary {
  make: string;
  model: string;
  series: string | null;
  year_from: number;
  year_to: number | null;
}

/** One tyre-size block as it appears inside a saved `saved_fitment` on read. Optional/loosely-typed `load_index`/`speed_rating`/`confidence` because a customer-typed size (see `TypedFitmentSize` below) never carries `confidence` and may omit the other two — unlike `VehicleFitmentSize` (`lib/vehicles/types.ts`), which requires all three because it's always resolved from the catalogue. */
export interface SavedFitmentSizeRecord {
  width: number;
  profile: number;
  rim_diameter: number;
  load_index?: string | null;
  speed_rating?: string | null;
  confidence?: string;
}

/** Same shape family as `VehicleFitments` (`lib/vehicles/types.ts`) — keyed `all` or `front`+`rear`, or `{}` (structurally shouldn't happen on a saved row since `saved_fitment` is required at save time, but modelled defensively rather than assumed away). */
export type SavedFitmentRecord =
  | { all: SavedFitmentSizeRecord }
  | { front: SavedFitmentSizeRecord; rear: SavedFitmentSizeRecord }
  | Record<string, never>;

export interface CustomerVehicleRecord {
  id: number;
  label: string | null;
  rego: string | null;
  state: string | null;
  vin: string | null;
  vehicle_id: number | null;
  vehicle: CustomerVehicleSummary | null;
  saved_fitment: SavedFitmentRecord;
  is_default: boolean;
  created_at: string | null;
}

export interface CustomerVehicleListResponse {
  data: CustomerVehicleRecord[];
}

export interface CustomerVehicleResponse {
  data: CustomerVehicleRecord;
}

/** A customer-typed tyre size at *save* time — required integer `width`/`profile`/`rim_diameter`, optional `load_index`/`speed_rating`, no `confidence` (that field only ever comes from a catalogue-resolved `VehicleFitmentSize`). */
export interface TypedFitmentSize {
  width: number;
  profile: number;
  rim_diameter: number;
  load_index?: string;
  speed_rating?: string;
}

export type TypedFitmentInput = { all: TypedFitmentSize } | { front: TypedFitmentSize; rear: TypedFitmentSize };

/**
 * `saved_fitment`'s required, not-nullable shape at save time — one of two
 * sources per the contract: (a) `VehicleFitments`, the exact object read
 * from `GET /api/v1/vehicles/{vehicle}/fitment`'s `fitments` field and
 * passed straight through unmodified when `vehicle_id` is set (structurally
 * assignable here since `VehicleFitmentSize` is a strict superset of
 * `TypedFitmentSize`'s required fields), or (b) `TypedFitmentInput`, a
 * customer-typed size with `vehicle_id` omitted. Never reshaped by this
 * app in either case.
 */
export type SavedFitmentInput = VehicleFitments | TypedFitmentInput;

export interface CustomerVehicleCreateInput {
  label?: string | null;
  rego?: string | null;
  state?: string | null;
  vin?: string | null;
  vehicle_id?: number | null;
  saved_fitment: SavedFitmentInput;
}

export type CustomerVehicleUpdateInput = Partial<CustomerVehicleCreateInput>;

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
