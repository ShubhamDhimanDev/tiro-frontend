"use client";

import type { PublicCustomer } from "./types";
import { FRIENDLY_NETWORK_MESSAGE, friendlyMessage } from "@/lib/http/friendly-error";

/**
 * Typed client-side helper for calling this app's own `/api/auth/*` Route
 * Handlers (never Laravel directly — see lib/auth/cookies.ts). Every auth
 * form in `components/auth/` goes through this so the four failure shapes
 * from docs/architecture/08-customer-auth-otp.md §12 are handled the same
 * way everywhere instead of each form re-deriving them from a raw Response.
 */

export type AuthApiResult<T> =
  | { kind: "success"; status: 200; data: T }
  | { kind: "invalid_credentials"; status: 401; message: string }
  | { kind: "not_found"; status: 404; message: string }
  | { kind: "validation_error"; status: 422; message: string; errors: Record<string, string[]> }
  | { kind: "rate_limited"; status: 429; message: string; retryAfter: number }
  | { kind: "unknown_error"; status: number; message: string };

async function request<T>(path: string, init: RequestInit): Promise<AuthApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
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

  switch (res.status) {
    case 200:
      return { kind: "success", status: 200, data: body as T };
    case 401:
      return { kind: "invalid_credentials", status: 401, message: body.message ?? "Invalid email or password." };
    case 404:
      return { kind: "not_found", status: 404, message: body.message ?? "Not found." };
    case 422:
      return {
        kind: "validation_error",
        status: 422,
        message: body.message ?? "Please check the form and try again.",
        errors: body.errors ?? {},
      };
    case 429:
      return {
        kind: "rate_limited",
        status: 429,
        message: body.message ?? "Too many attempts. Please wait and try again.",
        retryAfter: typeof body.retry_after === "number" ? body.retry_after : 30,
      };
    default:
      return { kind: "unknown_error", status: res.status, message: friendlyMessage(res.status, body) };
  }
}

export interface MessageData {
  message: string;
}

export interface SessionData {
  customer: PublicCustomer;
}

export const authApi = {
  register: (email: string, password: string) =>
    request<MessageData>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),

  registerVerify: (email: string, code: string) =>
    request<SessionData>("/api/auth/register/verify", { method: "POST", body: JSON.stringify({ email, code }) }),

  login: (email: string, password: string) =>
    request<SessionData>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  otpRequest: (email: string) =>
    request<MessageData>("/api/auth/otp/request", { method: "POST", body: JSON.stringify({ email }) }),

  otpVerify: (email: string, code: string) =>
    request<SessionData>("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ email, code }) }),

  passwordResetRequest: (email: string) =>
    request<MessageData>("/api/auth/password/reset/request", { method: "POST", body: JSON.stringify({ email }) }),

  passwordResetVerify: (email: string, code: string, newPassword: string) =>
    request<SessionData>("/api/auth/password/reset/verify", {
      method: "POST",
      body: JSON.stringify({ email, code, new_password: newPassword }),
    }),

  logout: () => request<undefined>("/api/auth/session", { method: "DELETE" }),

  logoutEverywhere: () => request<undefined>("/api/auth/sessions", { method: "DELETE" }),
};
