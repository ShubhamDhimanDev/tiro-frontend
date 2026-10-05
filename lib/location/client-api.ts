"use client";

import type { ServiceZoneSnapshot, ServiceabilityResult } from "./types";
import { FRIENDLY_NETWORK_MESSAGE, friendlyMessage } from "@/lib/http/friendly-error";

/**
 * Typed client-side helper for this app's own `/api/location/*` Route
 * Handlers — mirrors `lib/auth/client-api.ts`'s shape so every consumer
 * handles success/failure the same way instead of re-deriving it from a
 * raw `Response`.
 */

export type LocationApiResult<T> =
  | { kind: "success"; status: 200; data: T }
  | { kind: "validation_error"; status: 422; message: string; errors: Record<string, string[]> }
  | { kind: "unknown_error"; status: number; message: string };

/** Client-side abort so a hung backend never leaves the form on "Checking..." forever. */
const REQUEST_TIMEOUT_MS = 10_000;

async function request<T>(path: string, init: RequestInit): Promise<LocationApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    return { kind: "unknown_error", status: 0, message: FRIENDLY_NETWORK_MESSAGE };
  }

  if (res.status === 204) {
    return { kind: "success", status: 200, data: undefined as T };
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

export const locationApi = {
  check: (input: { postcode?: string; suburb?: string }) =>
    request<ServiceabilityResult>("/api/location/check", { method: "POST", body: JSON.stringify(input) }),

  session: () => request<{ zone: ServiceZoneSnapshot | null }>("/api/location/session", { method: "GET" }),

  clear: () => request<undefined>("/api/location/clear", { method: "DELETE" }),
};
