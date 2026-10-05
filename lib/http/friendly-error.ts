import { PHONE_DISPLAY } from "@/lib/site/config";

/**
 * Single place that turns "something upstream broke" into customer-safe copy.
 * Used by both server proxies (`proxyResponse`, `app/api/location/check`) and
 * client helpers (`lib/*\/client-api.ts`), so a raw exception message, a
 * connection string or a stack trace can never reach the UI even if the
 * backend (or a misconfigured APP_DEBUG) sends one.
 *
 * Rule: only 422 (validation) and deliberate 4xx domain statuses carry the
 * server's own message. Anything >= 500, or a network failure (status 0), is
 * replaced with the generic message below plus a stable `code`.
 */

export const FRIENDLY_ERROR_MESSAGE = `We couldn't complete that right now. Please try again, or call us on ${PHONE_DISPLAY}.`;
export const FRIENDLY_NETWORK_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

export type FriendlyErrorBody = { message: string; code: string };

/** True when this status should never expose upstream text to a customer. */
export function isUpstreamFailure(status: number): boolean {
  return status === 0 || status >= 500;
}

/** Server-side: body to send to the browser for an upstream failure. */
export function friendlyErrorBody(status: number): FriendlyErrorBody {
  return {
    message: FRIENDLY_ERROR_MESSAGE,
    code: status === 503 || status === 0 ? "service_unavailable" : "server_error",
  };
}

/**
 * Client-side: message to show for a non-422 failure. Prefers the proxy's
 * already-sanitised body for 4xx statuses, never trusts it for 5xx.
 */
export function friendlyMessage(status: number, body: unknown, fallback = "Something went wrong. Please try again."): string {
  if (status === 0) return FRIENDLY_NETWORK_MESSAGE;
  if (isUpstreamFailure(status)) return FRIENDLY_ERROR_MESSAGE;
  const message = (body as { message?: unknown } | null)?.message;
  return typeof message === "string" && message.trim() && !looksTechnical(message) ? message : fallback;
}

/** Heuristic backstop: exception text that must never be rendered. */
function looksTechnical(message: string): boolean {
  return /tcp:\/\/|SQLSTATE|Stack trace|\bat [\w\/.]+\.php|vendor[\/]|Illuminate\|Predis|Connection refused|actively refused|ECONNREFUSED/i.test(message);
}
