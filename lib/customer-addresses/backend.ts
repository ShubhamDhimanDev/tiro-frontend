import { liveCustomerAddressesBackend } from "./backend-client";
import { stubCustomerAddressesBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub for the saved-addresses domain — same pattern as
 * `lib/customer-vehicles/backend.ts`. Live by default; set
 * `CUSTOMER_ADDRESSES_BACKEND=stub` to opt back into the in-memory stub.
 */
export const customerAddressesBackend =
  process.env.CUSTOMER_ADDRESSES_BACKEND === "stub" ? stubCustomerAddressesBackend : liveCustomerAddressesBackend;
