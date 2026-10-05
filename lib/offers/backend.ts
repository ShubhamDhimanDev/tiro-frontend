import { liveOffersBackend } from "./backend-client";
import { stubOffersBackend } from "./backend-stub";

/**
 * Switch point for the offers domain. Live by default (Phase 6a endpoints
 * exist); `OFFERS_BACKEND=stub` opts into the fixtures.
 */
export const offersBackend = process.env.OFFERS_BACKEND === "stub" ? stubOffersBackend : liveOffersBackend;
