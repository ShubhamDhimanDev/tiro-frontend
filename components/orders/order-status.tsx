"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { ordersApi } from "@/lib/orders/client-api";
import { CartTotalsSummary } from "@/components/cart/cart-totals";
import { TyreImage } from "@/components/catalog/tyre-image";
import { Button, buttonClassName } from "@/components/ui/button";
import { CalendarIcon, CheckIcon, PhoneIcon } from "@/components/ui/icons";
import { StatePanel } from "@/components/ui/state-panel";
import { formatDay, formatWindow } from "@/lib/booking/format";
import { writeStoredHold } from "@/lib/booking/hold-storage";
import { formatMoney } from "@/lib/catalog/format-money";
import { splitTyreLabel } from "@/lib/cart/label";
import { buildIcs, downloadIcs } from "@/lib/orders/ics";
import { readOrderRecap, type OrderRecap } from "@/lib/orders/recap";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF, SITE_NAME } from "@/lib/site/config";
import type { OrderRecord, OrderStatus } from "@/lib/orders/types";

/** Short-poll window for `payment_status` still being `pending` right after redirect back from Stripe: `payment_intent.succeeded` is confirmed asynchronously by the webhook, so it can lag this page's first load by a few seconds. Not specified by the contract; judgment call. */
export const POLL_ATTEMPTS = 4;
export const POLL_INTERVAL_MS = 3000;

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

type LoadState =
  | { status: "loading" }
  | { status: "forbidden"; message: string }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; data: OrderRecord };

/** Which confirmation state an order is in. Exported for tests. */
export type OrderPhase = "confirmed" | "pending" | "failed" | "closed";

export function orderPhase(order: Pick<OrderRecord, "status" | "payment_status">): OrderPhase {
  if (order.status === "confirmed" || order.status === "completed" || order.payment_status === "paid") return "confirmed";
  if (order.status === "payment_failed" || order.payment_status === "failed") return "failed";
  if (order.status === "pending_payment" || order.payment_status === "pending") return "pending";
  return "closed";
}

function minutesBetween(start: string, end: string): number {
  const toMinutes = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
  };
  return Math.max(0, toMinutes(end) - toMinutes(start));
}

/** What to do before the technician arrives. Kept short and practical. */
export const PREP_CHECKLIST = [
  "Clear some space around your car so the technician can reach every wheel.",
  "Have your car keys ready, and the locking wheel nut key if you have one.",
  "Park on level ground where the technician can work safely.",
  "Check which tyres are being replaced (front, rear or all four) so you can confirm on the day.",
];

/**
 * `GET /api/v1/orders/{order}` client-side, via this app's own
 * `/api/orders/{id}` Route Handler. Only a server-side proxy can attach the
 * httpOnly guest-token cookie, and state should always be re-verified against
 * the server rather than trusted from whatever checkout had in memory.
 *
 * Doubles as the guest order-tracking view: a guest who completed checkout in
 * this browser already has the httpOnly `order_token` cookie, so revisiting this
 * URL authenticates the same way an authenticated customer's bearer token
 * would. A guest on a *different* browser/device can't recover access yet
 * (`Booking.manage_token` has the same gap until the confirmation email/SMS
 * exists); that's the 403 state below, not a silent dead end.
 *
 * States: loading, forbidden, not found, error (with retry), and for a loaded
 * order: confirmed (success), payment pending (polls a few times, then says so),
 * payment failed, or closed (cancelled/refunded).
 *
 * The API doesn't return tyre names or the address, so those come from a
 * display-only recap saved in sessionStorage at checkout (`lib/orders/recap.ts`)
 * and are simply omitted when it isn't there.
 */
export function OrderStatusView({
  orderId,
  onOrderNumber,
  onOrder,
}: {
  orderId: number;
  onOrderNumber?: (orderNumber: string) => void;
  /** Called with every freshly loaded order (for example to clear the cart once it is confirmed). */
  onOrder?: (order: OrderRecord) => void;
}) {
  const { customer } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [waitedOut, setWaitedOut] = useState(false);
  const [recap, setRecap] = useState<OrderRecap | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    queueMicrotask(() => setRecap(readOrderRecap(orderId)));
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await ordersApi.show(orderId);
      if (cancelled) return;

      if (result.kind === "success") {
        const order = result.data.data;
        setState({ status: "ready", data: order });
        onOrderNumber?.(order.order_number);
        onOrder?.(order);

        if (order.payment_status === "pending") {
          if (attemptRef.current < POLL_ATTEMPTS) {
            attemptRef.current += 1;
            window.setTimeout(() => {
              if (!cancelled) void load();
            }, POLL_INTERVAL_MS);
          } else {
            setWaitedOut(true);
          }
        } else {
          setWaitedOut(false);
        }
        return;
      }
      if (result.kind === "forbidden") {
        setState({
          status: "forbidden",
          message:
            "We can't verify you're allowed to view this order from this browser or device. If you checked out as a guest, open the link from your confirmation on the device you booked with, or sign in if you have an account.",
        });
        return;
      }
      if (result.kind === "not_found") {
        setState({ status: "not_found", message: "We couldn't find that order." });
        return;
      }
      setState({ status: "error", message: result.message });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId, refreshKey, onOrderNumber, onOrder]);

  function retry() {
    attemptRef.current = 0;
    setWaitedOut(false);
    setState({ status: "loading" });
    setRefreshKey((k) => k + 1);
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="h-40 animate-pulse rounded-card bg-chip" aria-hidden />
        <div className="h-56 animate-pulse rounded-card bg-chip" aria-hidden />
      </div>
    );
  }

  if (state.status !== "ready") {
    const isForbidden = state.status === "forbidden";
    return (
      <StatePanel
        tone={state.status === "error" ? "error" : "warning"}
        title={isForbidden ? "We can't show this order here" : state.status === "not_found" ? "Order not found" : "We couldn't load your order"}
        role="alert"
        testId="order-load-problem"
        actions={
          <>
            {state.status === "error" && <Button onClick={retry}>Try again</Button>}
            {isForbidden && (
              <Link href="/login" className={buttonClassName()}>
                Sign in
              </Link>
            )}
            <a href={PHONE_HREF} className={buttonClassName({ variant: "secondary" })}>
              <PhoneIcon aria-hidden="true" className="h-5 w-5" />
              Call {PHONE_DISPLAY}
            </a>
          </>
        }
      >
        {state.message}
      </StatePanel>
    );
  }

  const order = state.data;
  const phase = orderPhase(order);

  function manageBooking() {
    if (!recap || !order.booking) return;
    // Opens the existing reschedule/cancel screen on this booking. Its own
    // load asks the server for the authoritative state.
    writeStoredHold({
      id: recap.bookingId,
      status: "confirmed",
      scheduled_date: order.booking.scheduled_date,
      slot_start: order.booking.slot_start,
      slot_end: order.booking.slot_end,
      duration_minutes: minutesBetween(order.booking.slot_start, order.booking.slot_end),
      hold_expires_at: null,
    });
    router.push("/booking");
  }

  return (
    <div className="flex flex-col gap-6">
      <OrderHeadline order={order} phase={phase} waitedOut={waitedOut} onRefresh={retry} />

      {order.booking && phase !== "failed" && (
        <AppointmentCard order={order} booking={order.booking} recap={recap} canCalendar={phase === "confirmed" || phase === "pending"} />
      )}

      {phase === "confirmed" && <PrepChecklist />}

      {order.line_items && order.line_items.length > 0 && (
        <TyresCard order={order} recap={recap} signedIn={Boolean(customer)} />
      )}

      <section className="rounded-card border border-line bg-surface p-4 shadow-rest md:p-6">
        <CartTotalsSummary totals={order} flexibleDiscount={order.flexible_discount} label="Payment summary" />
      </section>

      {phase === "confirmed" && order.booking && (
        <section
          aria-labelledby="order-manage-heading"
          className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-rest md:p-6"
        >
          <h2 id="order-manage-heading" className="type-h3">
            Need to change something?
          </h2>
          {recap ? (
            <>
              <p className="text-muted">You can move your appointment to another time or cancel it.</p>
              <div>
                <Button variant="secondary" onClick={manageBooking}>
                  Manage booking
                </Button>
              </div>
            </>
          ) : (
            <p className="text-muted">
              Call us on{" "}
              <a href={PHONE_HREF} className="font-semibold text-black underline underline-offset-2">
                {PHONE_DISPLAY}
              </a>{" "}
              ({HOURS_LINE}) and we&apos;ll change or cancel your booking.
            </p>
          )}
        </section>
      )}

      {!customer && phase === "confirmed" && (
        <p className="text-sm text-muted">
          Want to track your bookings in one place?{" "}
          <Link href="/register" className="font-semibold text-black underline underline-offset-2">
            Create an account
          </Link>{" "}
          (optional).
        </p>
      )}
    </div>
  );
}

function OrderHeadline({
  order,
  phase,
  waitedOut,
  onRefresh,
}: {
  order: OrderRecord;
  phase: OrderPhase;
  waitedOut: boolean;
  onRefresh: () => void;
}) {
  const number = (
    <span data-testid="order-number" className="font-mono font-semibold text-ink">
      {order.order_number}
    </span>
  );
  const chip = (
    <span className="mt-2 inline-flex w-fit items-center rounded-full bg-chip px-3 py-1 text-xs font-semibold text-ink">
      {STATUS_LABEL[order.status]}
    </span>
  );

  if (phase === "confirmed") {
    return (
      <StatePanel tone="success" title="You're booked in" testId="order-confirmed" role="status" icon={<CheckIcon className="h-5 w-5" />}>
        <p>Order {number}. We&apos;ve sent a confirmation to your email.</p>
        {chip}
      </StatePanel>
    );
  }

  if (phase === "pending") {
    return (
      <StatePanel
        tone="info"
        title={waitedOut ? "Still waiting on your payment" : "Confirming your payment"}
        testId="order-pending"
        role="status"
        actions={<Button variant="secondary" onClick={onRefresh}>Refresh status</Button>}
      >
        <p>
          Order {number}. {waitedOut ? (
            <>
              Your payment provider hasn&apos;t confirmed it yet. If you were charged, your booking will confirm shortly. Call
              us on{" "}
              <a href={PHONE_HREF} className="font-semibold text-black underline underline-offset-2">
                {PHONE_DISPLAY}
              </a>{" "}
              if it doesn&apos;t.
            </>
          ) : (
            "This can take a few seconds. This page updates by itself."
          )}
        </p>
        {chip}
      </StatePanel>
    );
  }

  if (phase === "failed") {
    return (
      <StatePanel
        tone="error"
        title="Your payment didn't go through"
        testId="order-failed"
        actions={
          <>
            <Link href="/cart" className={buttonClassName()}>
              Back to cart
            </Link>
            <a href={PHONE_HREF} className={buttonClassName({ variant: "secondary" })}>
              <PhoneIcon aria-hidden="true" className="h-5 w-5" />
              Call {PHONE_DISPLAY}
            </a>
          </>
        }
      >
        <p>
          Order {number} wasn&apos;t paid. Start again from your cart with another payment method, or call us and we&apos;ll help
          you finish.
        </p>
        {chip}
      </StatePanel>
    );
  }

  return (
    <StatePanel tone="info" title={`Order ${STATUS_LABEL[order.status].toLowerCase()}`} testId="order-closed" role="status">
      <p>
        Order {number} is {STATUS_LABEL[order.status].toLowerCase()}. Questions? Call us on{" "}
        <a href={PHONE_HREF} className="font-semibold text-black underline underline-offset-2">
          {PHONE_DISPLAY}
        </a>
        .
      </p>
    </StatePanel>
  );
}

function AppointmentCard({
  order,
  booking,
  recap,
  canCalendar,
}: {
  order: OrderRecord;
  booking: NonNullable<OrderRecord["booking"]>;
  recap: OrderRecap | null;
  canCalendar: boolean;
}) {
  function addToCalendar() {
    const ics = buildIcs({
      uid: `order-${order.id}@tiromobiletyres`,
      title: `${SITE_NAME}: tyre fitting`,
      date: booking.scheduled_date,
      start: booking.slot_start,
      end: booking.slot_end,
      description: `Order ${order.order_number}. Questions? Call ${PHONE_DISPLAY}.`,
      location: recap?.address,
    });
    if (ics) downloadIcs(`tyre-fitting-${order.order_number}.ics`, ics);
  }

  return (
    <section
      aria-labelledby="order-appointment-heading"
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-rest md:p-6"
    >
      <h2 id="order-appointment-heading" className="type-h3">
        Your appointment
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Date</dt>
          <dd className="font-semibold text-ink">{formatDay(booking.scheduled_date, "long")}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Technician window</dt>
          <dd className="font-mono font-semibold text-ink">{formatWindow(booking.slot_start, booking.slot_end)}</dd>
        </div>
        {recap?.address && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted">Where</dt>
            <dd className="font-semibold text-ink">{recap.address}</dd>
          </div>
        )}
      </dl>
      {canCalendar && (
        <div>
          <Button variant="secondary" onClick={addToCalendar}>
            <CalendarIcon aria-hidden="true" className="h-5 w-5" />
            Add to calendar
          </Button>
        </div>
      )}
    </section>
  );
}

function PrepChecklist() {
  return (
    <section aria-labelledby="order-prep-heading" className="rounded-card border border-line bg-surface p-4 shadow-rest md:p-6">
      <h2 id="order-prep-heading" className="type-h3">
        Before we arrive
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {PREP_CHECKLIST.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <CheckIcon aria-hidden="true" className="h-4 w-4" />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TyresCard({ order, recap, signedIn }: { order: OrderRecord; recap: OrderRecap | null; signedIn: boolean }) {
  const recapByVariant = useMemo(() => new Map((recap?.tyres ?? []).map((t) => [t.tyre_variant_id, t])), [recap]);
  return (
    <section aria-labelledby="order-items-heading" className="rounded-card border border-line bg-surface p-4 shadow-rest md:p-6">
      <h2 id="order-items-heading" className="type-h3 mb-3">
        Your tyres
      </h2>
      <ul className="flex flex-col divide-y divide-line">
        {order.line_items!.map((line) => {
          const known = recapByVariant.get(line.tyre_variant_id);
          const { name, size } = known ? splitTyreLabel(known.label) : { name: `Tyre #${line.tyre_variant_id}`, size: null };
          return (
            <li key={line.tyre_variant_id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <TyreImage src={known?.image} alt="" sizes="56px" className="h-14 w-14 shrink-0 rounded-control" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug text-ink">{name}</p>
                  <p className="text-sm text-muted">
                    {size && <span className="type-mono">{size} &middot; </span>}
                    Qty {line.quantity}
                  </p>
                </div>
                <span className="shrink-0 font-mono font-semibold text-ink">{formatMoney(line.line_total, order.currency)}</span>
              </div>
              {/* Post-purchase price-guarantee claim entry point: authenticated customers only (no guest path, see docs/architecture/05-promotions-pricing.md), so omitted for a guest tracking their order via `order_token`. Same posture as <PdpPriceMatchLink>. */}
              {signedIn && (
                <Link
                  href={`/price-guarantee-claims/new?${new URLSearchParams({
                    tyre_variant_id: String(line.tyre_variant_id),
                    order_id: String(order.id),
                    label: `Tyre variant #${line.tyre_variant_id} (order ${order.order_number})`,
                  }).toString()}`}
                  className="tap-target inline-flex w-fit items-center text-sm font-semibold text-black underline underline-offset-2"
                >
                  Claim price match
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
