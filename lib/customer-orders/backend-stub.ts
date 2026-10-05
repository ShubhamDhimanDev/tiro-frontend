import type { CustomerOrdersBackend } from "./backend-client";

/**
 * In-memory dev/test stub for `GET /api/v1/customer/orders`, opt-in via
 * `CUSTOMER_ORDERS_BACKEND=stub` — see `backend.ts` for why live is the
 * default. Deliberately decoupled from `lib/orders/backend-stub.ts`'s own
 * in-memory orders (same "explicitly decoupled" posture
 * `lib/cart/backend-stub.ts` documents for its relationship to
 * `lib/booking/backend-stub.ts`) — this always returns an empty page, good
 * enough to exercise `<OrderHistoryList>`'s empty state without
 * replicating order-creation state across two unrelated stubs.
 */
export const stubCustomerOrdersBackend: CustomerOrdersBackend = {
  async list(_token: string, _page?: number) {
    return {
      status: 200,
      body: { data: [], meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 }, links: { first: null, last: null, prev: null, next: null } },
    };
  },
};
