"use client";

import type { SuburbSearchResponse, SuburbsResponse } from "./types";
import { FRIENDLY_NETWORK_MESSAGE, friendlyMessage } from "@/lib/http/friendly-error";

/**
 * Typed client-side helper for this app's own `/api/suburbs` Route Handler
 * — mirrors `lib/vehicles/client-api.ts`'s shape. Every call here is
 * triggered by a live Google Places pick in checkout's address step
 * (`lib/checkout/address.ts`'s `resolveSuburbId()`) — never server-rendered,
 * same "browser calls this app's proxy, never Laravel directly" posture as
 * every other domain in this app.
 */

export type SuburbsApiResult<T> =
  | { kind: "success"; status: 200; data: T }
  | { kind: "validation_error"; status: 422; message: string; errors: Record<string, string[]> }
  | { kind: "unknown_error"; status: number; message: string };

async function request<T>(path: string): Promise<SuburbsApiResult<T>> {
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

export const suburbsApi = {
  lookup: (postcode: string, name: string) =>
    request<SuburbsResponse>(`/api/suburbs?postcode=${encodeURIComponent(postcode)}&name=${encodeURIComponent(name)}`),

  /** Typeahead for the fitting address: suburb or postcode prefix, 2 characters or more. */
  search: (q: string) => request<SuburbSearchResponse>(`/api/suburbs/search?q=${encodeURIComponent(q)}`),
};
