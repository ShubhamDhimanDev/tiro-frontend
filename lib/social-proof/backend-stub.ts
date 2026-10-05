import type { BackendResponse, SocialProofResponse } from "./types";

/**
 * Dev/test stub, opt-in via `SOCIAL_PROOF_BACKEND=stub`. Deliberately returns
 * an EMPTY list: social proof must only ever come from real orders, so there
 * are no fixture rows (fabricated proof is a misleading-conduct risk).
 */
async function recentOrders(): Promise<BackendResponse<SocialProofResponse>> {
  return { status: 200, body: { data: [] } };
}

export const stubSocialProofBackend = { recentOrders };
