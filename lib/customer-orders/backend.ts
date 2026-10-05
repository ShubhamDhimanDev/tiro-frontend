import { liveCustomerOrdersBackend } from "./backend-client";
import { stubCustomerOrdersBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub for the order/booking history domain — same pattern as every other
 * Phase 7 domain. Live by default; set `CUSTOMER_ORDERS_BACKEND=stub` to
 * opt back into the in-memory stub.
 */
export const customerOrdersBackend =
  process.env.CUSTOMER_ORDERS_BACKEND === "stub" ? stubCustomerOrdersBackend : liveCustomerOrdersBackend;
