"use client";

import type { CustomerVehicleCreateInput, CustomerVehicleListResponse, CustomerVehicleResponse, CustomerVehicleUpdateInput } from "./types";
import { FRIENDLY_NETWORK_MESSAGE, friendlyMessage } from "@/lib/http/friendly-error";

/**
 * Typed client-side helper for this app's own `/api/customer/vehicles*`
 * Route Handlers — mirrors `lib/price-guarantee/client-api.ts`'s shape.
 * The browser never calls Laravel directly (only a server-side Route
 * Handler can read the httpOnly session cookie to attach the customer's
 * bearer token — same reasoning as every other authenticated domain in
 * this app).
 *
 * `unauthenticated` (not `forbidden`) for "no session" — same distinction
 * `lib/price-guarantee/client-api.ts` documents: there's no guest/manage-
 * token fallback on this domain at all, so a missing session is a hard
 * `401`, not a "wrong credential for this specific resource" `403`.
 * `not_found` covers both a genuinely nonexistent id and a mismatched-
 * ownership id — per the contract, this domain has no separate `403`
 * ownership branch, every scoping failure is a plain `404`.
 */
export type CustomerVehiclesApiResult<T> =
  | { kind: "success"; status: 200 | 201 | 204; data: T }
  | { kind: "unauthenticated"; status: 401; message: string }
  | { kind: "not_found"; status: 404; message: string }
  | { kind: "validation_error"; status: 422; message: string; errors: Record<string, string[]> }
  | { kind: "unknown_error"; status: number; message: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<CustomerVehiclesApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch {
    return { kind: "unknown_error", status: 0, message: FRIENDLY_NETWORK_MESSAGE };
  }

  // A `204 No Content` (delete) has no JSON body at all — `.json()` throws,
  // caught the same as a malformed body, resolving to `{}` either way.
  const body = await res.json().catch(() => ({}));

  switch (res.status) {
    case 200:
    case 201:
    case 204:
      return { kind: "success", status: res.status as 200 | 201 | 204, data: body as T };
    case 401:
      return { kind: "unauthenticated", status: 401, message: body.message ?? "You need to be signed in to do that." };
    case 404:
      return { kind: "not_found", status: 404, message: body.message ?? "Not found." };
    case 422:
      return {
        kind: "validation_error",
        status: 422,
        message: body.message ?? "Please check the form and try again.",
        errors: body.errors ?? {},
      };
    default:
      return { kind: "unknown_error", status: res.status, message: friendlyMessage(res.status, body) };
  }
}

export const customerVehiclesApi = {
  list: () => request<CustomerVehicleListResponse>("/api/customer/vehicles", { method: "GET" }),

  create: (body: CustomerVehicleCreateInput) =>
    request<CustomerVehicleResponse>("/api/customer/vehicles", { method: "POST", body: JSON.stringify(body) }),

  update: (id: number, body: CustomerVehicleUpdateInput) =>
    request<CustomerVehicleResponse>(`/api/customer/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  remove: (id: number) => request<Record<string, never>>(`/api/customer/vehicles/${id}`, { method: "DELETE" }),

  setDefault: (id: number) => request<CustomerVehicleResponse>(`/api/customer/vehicles/${id}/set-default`, { method: "POST" }),
};
