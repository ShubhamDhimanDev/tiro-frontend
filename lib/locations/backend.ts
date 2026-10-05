import { liveLocationsBackend } from "./backend-client";
import { stubLocationsBackend } from "./backend-stub";

/**
 * Switch point for the state > city tree. Live by default;
 * `LOCATIONS_BACKEND=stub` opts into the fixtures.
 */
export const locationsBackend = process.env.LOCATIONS_BACKEND === "stub" ? stubLocationsBackend : liveLocationsBackend;
