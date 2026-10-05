/**
 * Shared types for the price-guarantee claim boundary.
 *
 * Mirrors docs/architecture/02-api-contract.md's "Promotions &
 * Price-Guarantee endpoints" section (Phase 5, added 2026-09-22) and
 * docs/architecture/05-promotions-pricing.md's "Price-guarantee claim
 * workflow" section. Verified directly against the real backend
 * (`PriceGuaranteeClaimController`, `StorePriceGuaranteeClaimRequest`,
 * `PriceGuaranteeClaimResource`) rather than trusting the doc alone — same
 * "independently verified against the actual controller" posture every
 * other domain's `types.ts` documents for itself.
 *
 * Unlike every other domain in this app, there is **no guest path** here at
 * all — `auth:customer` is required at the route level on both endpoints,
 * enforced server-side, not just a UI convenience. `lib/price-guarantee/`
 * therefore has no manage-token/order-token equivalent; the only credential
 * is the customer's own Sanctum bearer token.
 */

export const PRICE_GUARANTEE_CLAIM_STATUSES = ["pending", "approved", "rejected"] as const;
export type PriceGuaranteeClaimStatus = (typeof PRICE_GUARANTEE_CLAIM_STATUSES)[number];

/** `POST /api/v1/price-guarantee-claims` body. `competitor_price` is integer cents, same money convention as everywhere else in this app. `order_id` present = post-purchase claim (must belong to the authenticated customer — enforced server-side as a 403, not a validation rule); omitted/`null` = pre-purchase claim against something currently in cart/being viewed. */
export interface PriceGuaranteeClaimCreateInput {
  competitor_url: string;
  competitor_price: number;
  tyre_variant_id: number;
  order_id?: number | null;
}

/** `PriceGuaranteeClaimResource` shape — same fields on both the creation response and every row in the paginated list. */
export interface PriceGuaranteeClaimRecord {
  id: number;
  status: PriceGuaranteeClaimStatus;
  competitor_url: string;
  competitor_price: number;
  tyre_variant_id: number;
  order_id: number | null;
  /** Set by an admin on approval — cents, `null` until then. */
  approved_discount_amount: number | null;
  /** Pre-purchase-claim redemption window (ISO 8601) — only ever set alongside `approved_discount_amount` for an `order_id === null` claim. `null` for post-purchase claims (those redeem immediately via the refund mechanism, no window to track) and for anything not yet approved. */
  expires_at: string | null;
  /** Stamped when the discount is actually applied — at admin-approval time for a post-purchase claim (the refund fires immediately), or at the moment a subsequent order is placed against a pre-purchase claim's `approved_discount_amount`. */
  redeemed_at: string | null;
  /** Required by the backend on reject; optional/absent on approve. */
  admin_note: string | null;
  created_at: string | null;
}

export interface PriceGuaranteeClaimCreateResponse {
  data: PriceGuaranteeClaimRecord;
}

export interface PaginatorMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

/** `GET /api/v1/price-guarantee-claims` — standard paginated envelope, the authenticated customer's own claims only. */
export interface PriceGuaranteeClaimListResponse {
  data: PriceGuaranteeClaimRecord[];
  meta: PaginatorMeta;
  links: Record<string, string | null>;
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
