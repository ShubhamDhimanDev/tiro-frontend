/**
 * Shared types for the social-proof boundary, `GET /api/v1/social-proof/recent-orders`
 * (built by backend-agent). Real, recent, paid orders only: first name and
 * suburb, never anything else. The list is capped at 10 and may be empty
 * (the backend hides the feature when there are too few real orders).
 */
export interface SocialProofRow {
  first_name: string;
  suburb: string;
  state: string;
  product_label: string;
  /** ISO-8601 timestamp of the purchase. */
  purchased_at: string;
}

export interface SocialProofResponse {
  data: SocialProofRow[];
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
