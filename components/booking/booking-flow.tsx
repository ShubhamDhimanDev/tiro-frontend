"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { useLocation } from "@/components/location/location-provider";
import { LocationGate } from "@/components/location/location-gate";
import { useCart } from "@/components/cart/cart-provider";
import { CartLineItems } from "@/components/cart/cart-line-items";
import { useCartPricing } from "@/components/cart/use-cart-pricing";
import { HoldBar } from "@/components/booking/hold-bar";
import { Button, buttonClassName } from "@/components/ui/button";
import { formatDay, formatWindow } from "@/lib/booking/format";
import { formatMoney } from "@/lib/catalog/format-money";
import { AppointmentSlotPicker } from "@/components/booking/appointment-slot-picker";
import { BookingHoldPanel } from "@/components/booking/booking-hold-panel";
import { bookingApi } from "@/lib/booking/client-api";
import { HOLD_STORAGE_KEY } from "@/lib/booking/hold-storage";
import { toBookingItems } from "@/lib/cart/cart";
import type { BookingRecord, BookingStatus } from "@/lib/booking/types";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";


/**
 * `GET /api/v1/bookings/{booking}` can report *any* `BookingStatus`, not
 * just the `pending_hold`/`confirmed` pair this flow's own mutations ever
 * produce — an admin-side dispatch-board change (cancel, mark no-show, a
 * technician arriving/completing the job) is a real, reachable case now
 * that this flow actually asks the server on load. None of those statuses
 * are ones this UI can do anything further with (`BookingHoldPanel`'s
 * reschedule/cancel actions would just 409 against any of them, same as
 * `expired` before this round), so they're treated as terminal: don't hold
 * onto the record, surface a short explanation, and fall back to the
 * "build a new booking" view. `expired` is deliberately excluded here — it
 * gets its own dedicated screen ("choose a new time") rather than this
 * generic message.
 */
const TERMINAL_STATUS_MESSAGE: Partial<Record<BookingStatus, string>> = {
  cancelled: "That booking has been cancelled.",
  completed: "That booking has already been completed — there's nothing left to change.",
  no_show: "That booking was marked as a no-show.",
  in_progress: "A technician is already on the way or on-site for that booking — it can no longer be changed here.",
};

/**
 * Just a display-cache read — deliberately does **not** try to infer
 * expiry/validity itself (an earlier version of this function discarded a
 * stale-looking cached hold client-side; that guesswork is gone now that
 * `GET /api/booking/{id}` — see the mount effect below — can just ask the
 * server for the truth instead).
 */
function readStoredHold(): BookingRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(HOLD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookingRecord;
    return typeof parsed.id === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function persistHold(hold: BookingRecord | null): void {
  if (typeof window === "undefined") return;
  if (hold === null) {
    window.sessionStorage.removeItem(HOLD_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify(hold));
  }
}

/**
 * Orchestrates the whole booking-hold lifecycle: pick a slot -> create a
 * hold -> optionally reschedule/cancel it.
 *
 * Cart contents come from `useCart()` (`lib/cart/cart.ts`) — Phase 4's real
 * cart, still frontend-state/localStorage-backed by design (there's no
 * server-side `Cart` entity, and none is being added — see
 * docs/architecture/02-api-contract.md's "Cart-to-checkout sequencing"
 * section). This flow itself is otherwise unchanged from Phase 3: pick a
 * slot -> `POST /api/v1/bookings` turns the cart into a `pending_hold`
 * `Booking`, which becomes the durable cart from that point on (checkout
 * never re-accepts a raw `items[]` array).
 *
 * The other gap flagged in the previous round — no independent way to read
 * a booking's live state, only ever learning it from a mutation response —
 * is now closed: `GET /api/v1/bookings/{booking}` (added 2026-09-21) is
 * read-only current state with the same guest/owner dual auth as
 * reschedule/cancel. The mount effect below calls it (via `bookingApi.show`,
 * proxied through `/api/booking/{id}` so the guest manage-token header can
 * be attached server-side) whenever a cached booking id is found in
 * `sessionStorage`, and replaces the cached record with the authoritative
 * response — so a reload (or an admin-side dispatch-board change) is
 * reflected here, not just whatever the last mutation happened to return.
 * `sessionStorage` is still only ever a *display* cache bridging that one
 * request, and this still isn't a bookmarkable/emailable "manage your
 * booking" link — the id has to already be known client-side (from this
 * session's own create/reschedule/cancel calls) for there to be anything to
 * fetch in the first place.
 */
export function BookingFlow() {
  const { state: cart, hydrated: cartHydrated, setPromoCode } = useCart();
  const { clearZone } = useLocation();

  const [hold, setHold] = useState<BookingRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showReschedulePicker, setShowReschedulePicker] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{ date: string; start: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Set when `POST /bookings` rejects the promo code (422 `errors.promo_code`): offers to drop it. */
  const [promoProblem, setPromoProblem] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    // Deferred to a microtask for the same reason
    // `components/cart/cart-provider.tsx`'s mount effect is — see
    // that file's comment. The `bookingApi.show()` call inside is genuinely
    // async (a real network round trip), so this isn't just working around
    // the lint rule the way the plain-localStorage-read providers are — it
    // would need a microtask/promise boundary here regardless.
    queueMicrotask(async () => {
      const cached = readStoredHold();
      if (!cached) {
        setHydrated(true);
        return;
      }

      const result = await bookingApi.show(cached.id);
      if (result.kind === "success") {
        const record = result.data.data;
        if (record.status === "pending_hold" || record.status === "confirmed" || record.status === "expired") {
          setHold(record);
          persistHold(record);
        } else {
          // Terminal status this flow can't do anything further with — see
          // `TERMINAL_STATUS_MESSAGE`'s doc comment.
          setHold(null);
          persistHold(null);
          setActionError(TERMINAL_STATUS_MESSAGE[record.status] ?? `That booking's status is now "${record.status}".`);
        }
      } else if (result.kind === "not_found") {
        setHold(null);
        persistHold(null);
      } else {
        // Couldn't confirm live state (403 = can't verify ownership in this
        // browser/device, or a transient network/unknown error) — fall back
        // to the cached snapshot rather than losing it outright. Any actual
        // reschedule/cancel attempt still gets a fresh, authoritative
        // 403/404 from the server if it comes to that (see
        // handleReschedule/handleCancel below); this is just what renders
        // in the meantime.
        setHold(cached);
      }
      setHydrated(true);
    });
  }, []);

  const items = toBookingItems(cart);
  const addons = cart.addons;
  const hasCartContents = items.length > 0 || addons.length > 0;

  // A new error moves focus to the message so a screen reader user and a keyboard user land on it.
  useEffect(() => {
    if (actionError || promoProblem) alertRef.current?.focus();
  }, [actionError, promoProblem]);

  const promoCode = cart.promoCode;

  const handleCreate = useCallback(
    async (zoneId: string, date: string, slotStart: string | null, flexible: boolean) => {
      setPendingSlot({ date, start: slotStart ?? "flexible" });
      setActionError(null);
      setPromoProblem(null);

      const result = await bookingApi.create(
        {
          service_zone_id: zoneId,
          scheduled_date: date,
          // Flexible: no slot, the server assigns one. Otherwise the chosen time.
          ...(flexible ? { flexible: true } : { slot_start: slotStart ?? undefined }),
          ...(promoCode ? { promo_code: promoCode } : {}),
          items,
          addons,
        },
        idempotencyKeyRef.current
      );

      setPendingSlot(null);

      if (result.kind === "success") {
        setHold(result.data.data);
        persistHold(result.data.data);
        return;
      }
      if (result.kind === "conflict") {
        // 409 also covers a flexible day with nothing left to assign. Refetch so the list is current.
        setActionError(`${result.message} We've refreshed the times, so choose again.`);
        setRefreshKey((k) => k + 1);
        return;
      }
      if (result.kind === "validation_error" && result.errors.promo_code?.length) {
        setPromoProblem(result.errors.promo_code[0]);
        return;
      }
      if (result.kind === "validation_error" && result.errors.flexible?.length) {
        setActionError("Flexible arrival isn't available for that day any more. Choose a specific time instead.");
        setRefreshKey((k) => k + 1);
        return;
      }
      if (result.kind === "not_found") {
        // Zone was rejected server-side (stale/tampered) — degrade to
        // re-check serviceability, same posture as `<PdpAvailability>`.
        await clearZone();
        return;
      }
      setActionError(result.message);
    },
    [items, addons, clearZone, promoCode]
  );

  const handleReschedule = useCallback(
    async (date: string, slotStart: string | null) => {
      if (!hold || !slotStart) return;
      setPendingSlot({ date, start: slotStart });
      setActionError(null);

      const result = await bookingApi.reschedule(hold.id, { scheduled_date: date, slot_start: slotStart });

      setPendingSlot(null);

      if (result.kind === "success") {
        setHold(result.data.data);
        persistHold(result.data.data);
        setShowReschedulePicker(false);
        return;
      }
      if (result.kind === "conflict") {
        setActionError(result.message);
        setRefreshKey((k) => k + 1);
        return;
      }
      if (result.kind === "not_found") {
        setActionError("We couldn't find this booking anymore — it may have already expired.");
        setHold(null);
        persistHold(null);
        return;
      }
      if (result.kind === "forbidden") {
        setActionError(
          "We couldn't verify you're allowed to manage this booking. Try again from the same browser/device you booked with, or sign in if you have an account."
        );
        return;
      }
      setActionError(result.message);
    },
    [hold]
  );

  const handleCancel = useCallback(async () => {
    if (!hold) return;
    setCancelling(true);
    setActionError(null);

    const result = await bookingApi.cancel(hold.id);
    setCancelling(false);

    if (result.kind === "success" || result.kind === "not_found") {
      setHold(null);
      persistHold(null);
      setShowReschedulePicker(false);
      // A fresh checkout attempt after cancelling is a new attempt, not a
      // retry of the one that just ended.
      idempotencyKeyRef.current = crypto.randomUUID();
      return;
    }
    setActionError(result.message);
  }, [hold]);

  const handleHoldExpired = useCallback(() => {
    setHold((prev) => (prev ? { ...prev, status: "expired" } : prev));
  }, []);

  const handleStartOver = useCallback(() => {
    setHold(null);
    persistHold(null);
    setActionError(null);
    idempotencyKeyRef.current = crypto.randomUUID();
  }, []);

  if (!hydrated || cartHydrated === false) {
    return <div className="h-48 animate-pulse rounded-card bg-chip" aria-hidden />;
  }

  if (hold) {
    // `hold` never holds a terminal-and-not-`expired` status (cancelled/
    // completed/no_show/in_progress): the mount effect and `handleCancel` both
    // null it out immediately instead, see `TERMINAL_STATUS_MESSAGE`.
    // `create`/`reschedule` responses are only ever `pending_hold`/`confirmed`.
    //
    // Deliberately just `hold.status === "expired"`, not a `Date.now()` recheck
    // here (an impure call during render is a real `react-hooks/purity`
    // violation). Two things set it: the mount effect's `GET /api/booking/{id}`
    // reporting authoritative `expired`, or (for a hold that's still live when
    // this mounts but runs out while the customer sits on the page)
    // `<HoldCountdown>`'s `onExpire` -> `handleHoldExpired`.
    const isExpired = hold.status === "expired";

    if (isExpired) {
      return (
        <div
          role="alert"
          data-testid="hold-expired"
          className="flex flex-col items-start gap-4 rounded-card border-[3px] border-black bg-gold-soft p-4 shadow-rest md:p-6"
        >
          <div>
            <h2 className="type-h3">Your held time ran out</h2>
            <p className="mt-1 text-muted">
              We&apos;ve released it for other customers. Nothing has been charged. Your tyres are still in your cart, so
              you can pick another time.
            </p>
          </div>
          <Button onClick={handleStartOver}>Pick another time</Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {hold.status === "pending_hold" && hold.hold_expires_at && (
          <HoldBar
            expiresAt={hold.hold_expires_at}
            onExpire={handleHoldExpired}
            detail={`${formatDay(hold.scheduled_date)}, ${formatWindow(hold.slot_start, hold.slot_end)}`}
            action={
              <Link href={`/checkout?booking=${hold.id}`} className={buttonClassName({ size: "sm", className: "shrink-0" })}>
                Checkout
              </Link>
            }
          />
        )}
        <BookingHoldPanel
          hold={hold}
          onStartReschedule={() => setShowReschedulePicker((v) => !v)}
          reschedulePickerOpen={showReschedulePicker}
          actionInFlight={pendingSlot !== null}
          onCancel={handleCancel}
          cancelling={cancelling}
          actionError={actionError}
        />
        {showReschedulePicker && (
          <section
            aria-labelledby="booking-reschedule-heading"
            className="rounded-card border border-line bg-surface p-4 shadow-rest md:p-6"
          >
            <h2 id="booking-reschedule-heading" className="type-h3 mb-4">
              Pick a new time
            </h2>
            <LocationGate>
              {(zoneId) => (
                <AppointmentSlotPicker
                  zoneId={zoneId}
                  items={items}
                  addons={addons}
                  pendingSlot={pendingSlot}
                  refreshKey={refreshKey}
                  onSelectSlot={handleReschedule}
                  allowFlexible={false}
                  onZoneRejected={clearZone}
                  confirmLabel="Move my appointment"
                  busyLabel="Moving&hellip;"
                  confirmNote={
                    hold.flexible
                      ? "This moves your booking to the time above. Your flexible discount stays."
                      : "This moves your booking to the time above."
                  }
                />
              )}
            </LocationGate>
          </section>
        )}
        <CartLineItems editable={false} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Rendered unconditionally (not nested inside the branches below): a
          terminal-status message from the mount effect (see
          `TERMINAL_STATUS_MESSAGE`) must still show even when the current cart
          is empty, which is exactly the case right after landing here from a
          booking that turned out to be cancelled/completed elsewhere. */}
      {(actionError || promoProblem) && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          data-testid="booking-alert"
          className="msg-error msg-error-box text-sm outline-none"
        >
          <div className="flex min-w-0 flex-col items-start gap-3">
          <p>{promoProblem ? `${promoProblem} Your time hasn't been held.` : actionError}</p>
          {!promoProblem && (
            <a href={PHONE_HREF} className="inline-flex min-h-11 items-center font-bold text-black underline underline-offset-2">
              Need a hand? Call {PHONE_DISPLAY}
            </a>
          )}
          {promoProblem && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setPromoCode(null);
                setPromoProblem(null);
              }}
            >
              Remove the code and continue
            </Button>
          )}
          </div>
        </div>
      )}

      {!hasCartContents ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-card border border-line bg-surface px-6 py-12 text-center shadow-rest">
          <div>
            <h2 className="type-h3">Add tyres to pick a time</h2>
            <p className="mt-1 text-muted">Times depend on what we&apos;re fitting, so choose your tyres first.</p>
          </div>
          <Link href="/tyres" className={buttonClassName({ fullWidth: true })}>
            Find tyres
          </Link>
        </div>
      ) : (
        <>
          <CartLineItems editable={false} />
          <section
            aria-labelledby="booking-pick-heading"
            className="rounded-card border border-line bg-surface p-4 shadow-rest md:p-6"
          >
            <h2 id="booking-pick-heading" className="type-h3 mb-4">
              Pick a time
            </h2>
            <LocationGate prompt="Enter your suburb or postcode to see appointment times.">
              {(zoneId) => (
                <PickerWithTotal
                  zoneId={zoneId}
                  items={items}
                  addons={addons}
                  pendingSlot={pendingSlot}
                  refreshKey={refreshKey}
                  onSelectSlot={(date, slotStart, opts) => handleCreate(zoneId, date, slotStart, Boolean(opts?.flexible))}
                  onZoneRejected={clearZone}
                />
              )}
            </LocationGate>
          </section>
        </>
      )}
    </div>
  );
}

/** The slot picker plus the live cart total, so the price is visible next to the choice. */
function PickerWithTotal(props: Omit<ComponentProps<typeof AppointmentSlotPicker>, "confirmNote" | "totalLabel" | "onFlexibleChange">) {
  // Choosing the flexible option previews the total with its discount (`cart/calculate` `flexible: true`).
  const [flexible, setFlexible] = useState(false);
  const calc = useCartPricing(props.zoneId, props.onZoneRejected, { flexible });
  const totalLabel = calc.status === "ready" ? formatMoney(calc.data.grand_total, calc.data.currency) : null;
  return (
    <AppointmentSlotPicker
      {...props}
      onFlexibleChange={setFlexible}
      totalLabel={totalLabel}
      confirmNote="We'll hold this time for 15 minutes while you check out. Nothing is charged until you pay."
    />
  );
}
