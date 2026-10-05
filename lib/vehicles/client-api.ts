"use client";

import type { MakesResponse, ModelsResponse, VehicleFitmentResponse, VehicleYearsResponse } from "./types";
import { FRIENDLY_NETWORK_MESSAGE, friendlyMessage } from "@/lib/http/friendly-error";

/**
 * Typed client-side helper for this app's own `/api/vehicles/*` Route
 * Handlers — mirrors `lib/location/client-api.ts`'s shape so every consumer
 * handles success/failure the same way instead of re-deriving it from a raw
 * `Response`.
 *
 * Every call here is triggered by a live user interaction in
 * `<VehiclePicker>` (make/model/year selects, then the resolved-vehicle
 * fitment fetch) — never server-rendered, same "browser calls this app's
 * proxy, never Laravel directly" posture as the PDP availability fetch
 * (`lib/catalog/backend-client.ts` / `app/api/catalog/tyres/[slug]/availability/route.ts`).
 */

export type VehiclesApiResult<T> =
  | { kind: "success"; status: 200; data: T }
  | { kind: "not_found"; status: 404; message: string }
  | { kind: "validation_error"; status: 422; message: string; errors: Record<string, string[]> }
  | { kind: "unknown_error"; status: number; message: string };

async function request<T>(path: string): Promise<VehiclesApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, { headers: { Accept: "application/json" }, cache: "no-store" });
  } catch {
    return { kind: "unknown_error", status: 0, message: FRIENDLY_NETWORK_MESSAGE };
  }

  const body = await res.json().catch(() => ({}));

  if (res.status === 200) {
    return { kind: "success", status: 200, data: body as T };
  }
  if (res.status === 404) {
    return { kind: "not_found", status: 404, message: body.message ?? "Not found." };
  }
  if (res.status === 422) {
    return {
      kind: "validation_error",
      status: 422,
      message: body.message ?? "Please check your input and try again.",
      errors: body.errors ?? {},
    };
  }
  return { kind: "unknown_error", status: res.status, message: friendlyMessage(res.status, body) };
}

export const vehiclesApi = {
  makes: () => request<MakesResponse>("/api/vehicles/makes"),

  models: (make: string) => request<ModelsResponse>(`/api/vehicles/models?make=${encodeURIComponent(make)}`),

  years: (make: string, model: string) =>
    request<VehicleYearsResponse>(`/api/vehicles/years?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`),

  fitment: (vehicleId: number) => request<VehicleFitmentResponse>(`/api/vehicles/${vehicleId}/fitment`),
};
