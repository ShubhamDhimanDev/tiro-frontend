/**
 * Plain-language copy for auth failures: what happened and what to do next.
 * The login "wrong credentials" message is deliberately generic (it must read
 * the same whether or not the email is registered), so it lives here once.
 * Server-authored messages for validation and "no account" cases are kept as
 * they are because they carry specifics the client does not know.
 */
export type AuthFailure =
  | { kind: "invalid_credentials"; message: string }
  | { kind: "rate_limited"; message: string; retryAfter?: number }
  | { kind: "unknown_error"; status: number; message: string }
  | { kind: "validation_error"; message: string }
  | { kind: "not_found"; message: string };

export const GENERIC_VALIDATION_MESSAGE = "Please check the form and try again.";

export function authErrorMessage(result: AuthFailure): string {
  switch (result.kind) {
    case "invalid_credentials":
      return "That email and password don't match. Check both and try again, or reset your password.";
    case "rate_limited":
      return "Too many attempts. Wait a moment, then try again.";
    case "unknown_error":
      return result.status === 0
        ? "We couldn't reach the server. Check your connection and try again."
        : "Something went wrong on our side. Try again in a moment, or call us if it keeps happening.";
    case "validation_error":
      return result.message && result.message !== GENERIC_VALIDATION_MESSAGE
        ? result.message
        : "Some details need fixing. Check the highlighted fields and try again.";
    case "not_found":
      return result.message;
  }
}
