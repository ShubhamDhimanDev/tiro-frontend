import { liveEnquiriesBackend } from "./backend-client";
import { stubEnquiriesBackend } from "./backend-stub";

/** Switch point for the enquiries domain. Live by default; `ENQUIRIES_BACKEND=stub` opts into the stub. */
export const enquiriesBackend = process.env.ENQUIRIES_BACKEND === "stub" ? stubEnquiriesBackend : liveEnquiriesBackend;
