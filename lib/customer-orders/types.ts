import type { OrderStatus, PaymentStatus } from "@/lib/orders/types";

/**
 * Shared types for the "order/booking history" account boundary —
 * `GET /api/v1/customer/orders`.
 *
 * Mirrors docs/architecture/02-api-contract.md's "Customer account
 * endpoints" section (Phase 7, added 2026-09-24). Summary shape only —
 * deliberately not the full `OrderRecord` (`lib/orders/types.ts`), same
 * "list shape is a different, smaller shape than the detail endpoint"
 * distinction the contract itself draws. Detail view reuses
 * `GET /api/v1/orders/{order}` (`lib/orders/`) unmodified, per the task
 * brief — no new detail endpoint, so no `CustomerOrderRecord` type either,
 * only this summary.
 */

export interface CustomerOrderBookingSummary {
  scheduled_date: string;
  slot_start: string;
  slot_end: string;
}

export interface CustomerOrderSummary {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  grand_total: number;
  currency: string;
  placed_at: string;
  /** `null` is modelled defensively — `Order.booking_id` is required/non-nullable per the data model, so this should never actually be `null` in practice, but not assumed away without seeing a real response, same posture `OrderRecord.booking` documents for itself. */
  booking: CustomerOrderBookingSummary | null;
}

export interface PaginatorMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

/** Standard paginated envelope, sorted `placed_at` descending (server-side). */
export interface CustomerOrderListResponse {
  data: CustomerOrderSummary[];
  meta: PaginatorMeta;
  links: Record<string, string | null>;
}

export interface BackendResponse<T = unknown> {
  status: number;
  body: T;
}
