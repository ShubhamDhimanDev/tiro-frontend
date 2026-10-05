import type { BackendResponse } from "./types";

/** Live wiring to `GET /api/v1/locations` and `/locations/{state}/{city}` (public, no auth). */
const LARAVEL_API_URL = process.env.LARAVEL_API_URL ?? "http://localhost:8000";
const API_BASE = `${LARAVEL_API_URL}/api/v1/locations`;

async function call(path: string, cacheInit: RequestInit = {}): Promise<BackendResponse<unknown>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" }, ...cacheInit });
  } catch {
    return { status: 503, body: { message: "We couldn't reach the server. Please try again shortly." } };
  }
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export const liveLocationsBackend = {
  tree: (cacheInit?: RequestInit) => call("", cacheInit),
  city: (state: string, city: string, cacheInit?: RequestInit) =>
    call(`/${encodeURIComponent(state)}/${encodeURIComponent(city)}`, cacheInit),
};

export type LocationsBackend = typeof liveLocationsBackend;
