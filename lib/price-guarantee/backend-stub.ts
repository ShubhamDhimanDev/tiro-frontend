import type { PriceGuaranteeBackend } from "./backend-client";
import type { BackendResponse, PriceGuaranteeClaimCreateInput, PriceGuaranteeClaimRecord } from "./types";

/**
 * In-memory dev/test stub for `POST`/`GET /api/v1/price-guarantee-claims`,
 * opt-in via `PRICE_GUARANTEE_BACKEND=stub` — see `backend.ts` for why live
 * is the default. Good enough to exercise the submit-form and claims-list UI
 * end-to-end without a running Laravel process.
 *
 * Simplification, flagged rather than silently faked: this stub has no real
 * Sanctum session to check `token` against, so it doesn't scope claims by
 * customer identity the way the real backend's `customer_id` filter does —
 * every claim ever created against this stub (regardless of which token
 * created it) shows up in every `list()` call. `token` is still a required
 * parameter (mirroring the live client's signature) purely so the calling
 * Route Handler's own "no session cookie -> 401 before ever reaching the
 * backend" short-circuit is exercised identically in both modes.
 */

const claims: PriceGuaranteeClaimRecord[] = [];
let nextId = 900;

function paginate(): BackendResponse<unknown> {
  return {
    status: 200,
    body: {
      data: [...claims].reverse(),
      meta: { current_page: 1, per_page: 20, total: claims.length, last_page: 1 },
      links: { first: null, last: null, prev: null, next: null },
    },
  };
}

export const stubPriceGuaranteeBackend: PriceGuaranteeBackend = {
  async create(_token: string, body: PriceGuaranteeClaimCreateInput) {
    if (!body.competitor_url || !body.competitor_price || body.competitor_price <= 0 || !body.tyre_variant_id) {
      return {
        status: 422,
        body: {
          message: "The given data was invalid.",
          errors: { competitor_price: ["The competitor price field must be a positive integer."] },
        },
      };
    }

    const claim: PriceGuaranteeClaimRecord = {
      id: nextId++,
      status: "pending",
      competitor_url: body.competitor_url,
      competitor_price: body.competitor_price,
      tyre_variant_id: body.tyre_variant_id,
      order_id: body.order_id ?? null,
      approved_discount_amount: null,
      expires_at: null,
      redeemed_at: null,
      admin_note: null,
      created_at: new Date().toISOString(),
    };
    claims.push(claim);

    return { status: 201, body: { data: claim } };
  },

  async list(_token: string, _page?: number) {
    return paginate();
  },
};
