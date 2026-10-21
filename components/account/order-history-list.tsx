"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { customerOrdersApi } from "@/lib/customer-orders/client-api";
import { formatMoney } from "@/lib/catalog/format-money";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { EmptyState, ErrorNote, ListSkeleton, SignInPrompt } from "@/components/account/account-parts";
import type { CustomerOrderSummary } from "@/lib/customer-orders/types";
import type { OrderStatus, PaymentStatus } from "@/lib/orders/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Payment pending",
  confirmed: "Confirmed",
  payment_failed: "Payment failed",
  refund_required: "Refund required",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

/** Semantic colours: green good, yellow wash waiting, black needs action, quiet for closed. */
export const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending_payment: "warning",
  confirmed: "success",
  payment_failed: "danger",
  refund_required: "danger",
  completed: "ink",
  cancelled: "neutral",
  refunded: "neutral",
  partially_refunded: "neutral",
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; orders: CustomerOrderSummary[] };

/**
 * "My orders" — `GET /api/v1/customer/orders`, summary rows only (sorted
 * `placed_at` descending, server-side), each linking to `/orders/{id}` for
 * the full detail (`<OrderStatusView>`). Each row is one link (the whole
 * card) with a "View" affordance, so the row stays a single tab stop. No
 * pagination controls: page 1 only, as before.
 */
export function OrderHistoryList() {
  const { customer, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (authLoading || !customer) return;
    let cancelled = false;

    customerOrdersApi.list().then((result) => {
      if (cancelled) return;
      if (result.kind === "success") {
        setState({ status: "ready", orders: result.data.data });
        return;
      }
      setState({ status: "error", message: result.message });
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, customer]);

  if (authLoading) return <ListSkeleton />;

  if (!customer) return <SignInPrompt message="Sign in to see your order history." />;

  if (state.status === "loading") return <ListSkeleton />;

  if (state.status === "error") return <ErrorNote message={state.message} />;

  if (state.orders.length === 0) {
    return (
      <EmptyState
        image="empty-orders"
        title="You haven't placed any orders yet."
        action={
          <Link href="/tyres" className={buttonClassName()}>
            Find your tyres
          </Link>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="order-history-list">
      {state.orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/orders/${order.id}`}
            className="group flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-rest transition-shadow hover:shadow-raised md:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="type-mono text-base font-bold text-ink">{order.order_number}</span>
              <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-0.5 text-sm text-muted">
                <p>
                  Placed {new Date(order.placed_at).toLocaleDateString("en-AU")} · {PAYMENT_STATUS_LABEL[order.payment_status]}
                </p>
                {order.booking && (
                  <p>
                    Appointment: {order.booking.scheduled_date} · {order.booking.slot_start}–{order.booking.slot_end}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="type-mono text-lg font-bold text-ink">{formatMoney(order.grand_total, order.currency)}</span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-link group-hover:underline">
                  View
                  <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
