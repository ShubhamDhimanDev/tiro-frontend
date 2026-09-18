/**
 * Shared types for the customer auth boundary.
 *
 * Mirrors docs/architecture/08-customer-auth-otp.md §12 (response shapes) and
 * docs/architecture/02-api-contract.md (envelope conventions). Keep these in
 * sync with backend-agent's contract rather than inventing local variants.
 */

/** `CustomerResource` shape returned by Laravel — never includes password/hash fields. */
export interface PublicCustomer {
  id: number;
  name: string;
  email: string;
  mobile: string | null;
}

/** Success envelope for every token-issuing endpoint (register/verify, login, otp/verify, password/reset/verify). */
export interface TokenEnvelope {
  data: {
    token: string;
    token_type: string;
    /** ISO 8601 timestamp, e.g. "2027-01-08T00:00:00+00:00". */
    expires_at: string;
    customer: PublicCustomer;
  };
}

/** `{ message }` body — action-only success, and generic failure shapes (401/404). */
export interface MessageBody {
  message: string;
}

/** `{ message, errors }` — 422 validation failure. */
export interface ValidationErrorBody {
  message: string;
  errors: Record<string, string[]>;
}

/** `{ message, retry_after }` — 429 rate-limit/cooldown/lockout. `retry_after` is seconds. */
export interface RateLimitBody {
  message: string;
  retry_after: number;
}

/**
 * Uniform shape every `authBackend` method resolves to, whether the call was
 * served by the live Laravel client or the local dev stub — this is what
 * makes swapping one for the other a one-line change in `lib/auth/backend.ts`
 * rather than a rewrite of every Route Handler.
 */
export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}

export type ActionResult = BackendResponse<MessageBody | ValidationErrorBody | RateLimitBody>;
export type TokenResult = BackendResponse<
  TokenEnvelope | MessageBody | ValidationErrorBody | RateLimitBody
>;
