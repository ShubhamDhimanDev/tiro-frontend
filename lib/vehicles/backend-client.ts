import type { BackendResponse } from "./types";

/**
 * Live wiring to Laravel's `/api/v1/vehicles/*` endpoints — see
 * docs/architecture/02-api-contract.md's "Vehicle identification & fitment
 * endpoints" section for the contract. Same conventions as
 * `lib/catalog/backend-client.ts` / `lib/location/backend-client.ts`.
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching
 * `backend/.env`'s `APP_URL` for local dev.
 *
 * Every call here is `cache: "no-store"` — unlike the catalogue domain's
 * SSG/ISR browse fetches, nothing in this domain is ever server-rendered
 * for a static first paint (see `backend.ts`'s doc comment and
 * `components/vehicles/vehicle-picker.tsx`): every step of the cascade is
 * triggered by a live user pick, so there's nothing worth caching.
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1`;

async function call(path: string, cacheInit?: RequestInit): Promise<BackendResponse<unknown>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      // Interactive picker calls stay uncached; a caller may opt into
      // ISR-style caching (e.g. the home page's makes chips) via `cacheInit`.
      ...(cacheInit ?? { cache: "no-store" }),
    });
  } catch {
    return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
  }

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveVehiclesBackend = {
  makes: (cacheInit?: RequestInit) => call(`/vehicles/makes`, cacheInit),

  /**
   * `make` is required by the contract (missing is 422). Omitting the
   * query param entirely (rather than sending `make=`) when `make` is
   * `null` so a genuinely missing param reaches Laravel as missing, not as
   * present-but-empty.
   */
  models: (make: string | null) => {
    const qs = make !== null ? `?make=${encodeURIComponent(make)}` : "";
    return call(`/vehicles/models${qs}`);
  },

  years: (make: string | null, model: string | null) => {
    const params = new URLSearchParams();
    if (make !== null) params.set("make", make);
    if (model !== null) params.set("model", model);
    return call(`/vehicles/years?${params.toString()}`);
  },

  fitment: (vehicleId: string) => call(`/vehicles/${encodeURIComponent(vehicleId)}/fitment`),
};

export type VehiclesBackend = typeof liveVehiclesBackend;
