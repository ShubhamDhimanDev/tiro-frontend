import { liveSocialProofBackend } from "./backend-client";
import { stubSocialProofBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the empty-list stub
 * for the social-proof domain, same pattern as every other domain's
 * `backend.ts`. Live is the default; `SOCIAL_PROOF_BACKEND=stub` opts out.
 */
export const socialProofBackend = process.env.SOCIAL_PROOF_BACKEND === "stub" ? stubSocialProofBackend : liveSocialProofBackend;
