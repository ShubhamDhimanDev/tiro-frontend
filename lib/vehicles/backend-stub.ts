import { FIXTURE_MAKES, FIXTURE_MODELS_BY_MAKE, FIXTURE_VEHICLES } from "./fixtures";
import type { BackendResponse } from "./types";

/**
 * In-memory dev/test stub for `/api/v1/vehicles/*`, opt-in only via
 * `VEHICLES_BACKEND=stub` — see `backend.ts`. Unlike the catalogue/location
 * domains at the point they were first built, this domain's four real
 * endpoints were independently verified live (read the real controller,
 * not just a status report) before this round was dispatched, so live is
 * the default and this stub exists purely for isolated component tests
 * that shouldn't depend on a running Laravel process.
 *
 * Behaviour mirrors the documented edge cases: `make`/`model` missing is
 * 422, an unrecognized `make` is 200 with `data: []` (not 404), an unknown
 * vehicle id's fitment is 404, and a vehicle with no `VehicleFitment` rows
 * yet returns 200 with `fitments: {}` — see `fixtures.ts`'s Toyota Corolla
 * (id 38) for that last case.
 */

function validationError(errors: Record<string, string[]>): BackendResponse<unknown> {
  return { status: 422, body: { message: "The given data was invalid.", errors } };
}

function notFound(message = "Not found."): BackendResponse<unknown> {
  return { status: 404, body: { message } };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature parity with the live client
async function makes(_cacheInit?: RequestInit): Promise<BackendResponse<unknown>> {
  return { status: 200, body: { data: FIXTURE_MAKES } };
}

async function models(make: string | null): Promise<BackendResponse<unknown>> {
  if (!make) return validationError({ make: ["The make field is required."] });
  const list = FIXTURE_MODELS_BY_MAKE[make] ?? [];
  return { status: 200, body: { data: list } };
}

async function years(make: string | null, model: string | null): Promise<BackendResponse<unknown>> {
  const errors: Record<string, string[]> = {};
  if (!make) errors.make = ["The make field is required."];
  if (!model) errors.model = ["The model field is required."];
  if (Object.keys(errors).length > 0) return validationError(errors);

  const rows = FIXTURE_VEHICLES.filter((v) => v.make === make && v.model === model)
    .slice()
    .sort((a, b) => b.year_from - a.year_from)
    .map(({ id, year_from, year_to, series, body_type }) => ({ id, year_from, year_to, series, body_type }));

  return { status: 200, body: { data: rows } };
}

async function fitment(vehicleId: string): Promise<BackendResponse<unknown>> {
  const id = Number(vehicleId);
  const vehicle = Number.isInteger(id) ? FIXTURE_VEHICLES.find((v) => v.id === id) : undefined;
  if (!vehicle) return notFound("Vehicle not found.");

  return {
    status: 200,
    body: {
      data: {
        vehicle: {
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          series: vehicle.series,
          year_from: vehicle.year_from,
          year_to: vehicle.year_to,
          body_type: vehicle.body_type,
        },
        is_staggered: vehicle.is_staggered,
        fitments: vehicle.fitments,
      },
    },
  };
}

export const stubVehiclesBackend = { makes, models, years, fitment };
export type VehiclesBackend = typeof stubVehiclesBackend;
