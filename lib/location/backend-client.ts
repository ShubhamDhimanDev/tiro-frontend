import type { ServiceabilityCheckInput, ServiceabilityResult, BackendResponse } from "./types";

/**
 * Live wiring to Laravel's `POST /api/v1/serviceability` — see
 * docs/architecture/02-api-contract.md's "Location/serviceability state
 * flow" and "Catalogue & location endpoints" sections for the contract.
 * Not yet exercised against a running backend (see `backend.ts` — this
 * domain defaults to the stub until backend-agent's endpoint lands).
 *
 * `LARAVEL_API_URL` defaults to `http://localhost:8000`, matching
 * `backend/.env`'s `APP_URL` for local dev — same convention as
 * `lib/auth/backend-client.ts`.
 */

const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";

async function check(input: ServiceabilityCheckInput): Promise<BackendResponse<ServiceabilityResult>> {
  let res: Response;
  try {
    res = await fetch(`${LARAVEL_API_URL}/api/v1/serviceability`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return {
      status: 503,
      body: {
        serviceable: false,
        service_zone_id: null,
        label: null,
        suggested_areas: [],
      },
    };
  }

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveLocationBackend = { check };
export type LocationBackend = typeof liveLocationBackend;
