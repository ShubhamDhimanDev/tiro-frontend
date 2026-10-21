"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonClassName } from "@/components/ui/button";
import { ServiceError } from "@/components/ui/service-error";
import { formatClock, formatDay, formatWindow } from "@/lib/booking/format";
import { formatDuration } from "@/lib/booking/format-duration";
import { formatMoney } from "@/lib/catalog/format-money";
import type { BookingRecord } from "@/lib/booking/types";

/**
 * An active hold (or a confirmed/other-status booking, defensively) with
 * reschedule and cancel actions. The countdown lives in `<HoldBar>` above it.
 *
 * Fee/notice-window copy is deliberately generic ("subject to our cancellation
 * policy"): the real notice-hours/fee amounts are ops-configured per
 * `CancellationPolicy` and currently zero/permissive everywhere (see
 * docs/architecture/02-api-contract.md's reschedule/cancel section), so a
 * concrete fee only shows when the server actually returns one.
 *
 * Cancelling asks once more ("Yes, cancel booking") so a stray tap can't drop
 * the held time.
 */
export function BookingHoldPanel({
  hold,
  onStartReschedule,
  reschedulePickerOpen,
  actionInFlight,
  onCancel,
  cancelling,
  actionError,
}: {
  hold: BookingRecord;
  onStartReschedule: () => void;
  reschedulePickerOpen: boolean;
  actionInFlight: boolean;
  onCancel: () => void;
  cancelling: boolean;
  actionError: string | null;
}) {
  const isHeld = hold.status === "pending_hold";
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  return (
    <section
      aria-labelledby="booking-appointment-heading"
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-rest md:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="booking-appointment-heading" className="type-h3">
          Your appointment
        </h2>
        <span className="inline-flex items-center rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold text-ink">
          {isHeld ? "Held for you, not paid yet" : hold.status === "confirmed" ? "Confirmed" : hold.status}
        </span>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Date</dt>
          <dd className="font-semibold text-ink">{formatDay(hold.scheduled_date, "long")}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Time</dt>
          <dd className="font-mono font-semibold text-ink">{formatWindow(hold.slot_start, hold.slot_end)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Fitting takes</dt>
          <dd className="font-semibold text-ink">about {formatDuration(hold.duration_minutes)}</dd>
        </div>
      </dl>

      {hold.flexible && hold.flexible_window && (
        <p data-testid="flexible-note" className="rounded-control bg-gold-soft/60 px-3 py-2 text-sm text-ink">
          <strong>Flexible arrival.</strong> You agreed to any time between {formatClock(hold.flexible_window.start)} and{" "}
          {formatClock(hold.flexible_window.end)}. The time above is the slot we have assigned. Changing the time keeps your flexible
          discount.
        </p>
      )}

      {isHeld && (
        <>
          <p className="text-sm text-muted">
            We&apos;re holding this time while you check out. Nothing is charged until you pay, and the time is released
            if the hold runs out.
          </p>
          <Link href={`/checkout?booking=${hold.id}`} className={buttonClassName({ fullWidth: true })}>
            Continue to checkout
          </Link>
        </>
      )}

      {typeof hold.cancellation_fee_amount === "number" && hold.cancellation_fee_amount > 0 && (
        <p className="text-sm text-black">
          A cancellation fee of {formatMoney(hold.cancellation_fee_amount)} applies to this change, subject to our cancellation
          policy.
        </p>
      )}
      {hold.cancellation_fee_amount === 0 && (
        <p className="text-sm text-muted">No cancellation fee applies right now, subject to our cancellation policy.</p>
      )}

      {actionError && (
        <ServiceError message={actionError} />
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
        <Button
          variant="secondary"
          onClick={onStartReschedule}
          disabled={actionInFlight || cancelling}
          aria-expanded={reschedulePickerOpen}
        >
          Change appointment time
        </Button>

        {!confirmingCancel ? (
          <Button variant="ghost" onClick={() => setConfirmingCancel(true)} disabled={actionInFlight || cancelling}>
            Cancel booking
          </Button>
        ) : (
          <div role="group" aria-label="Confirm cancellation" className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="primary"
              onClick={() => {
                setConfirmingCancel(false);
                onCancel();
              }}
              disabled={actionInFlight || cancelling}
              loading={cancelling}
            >
              {cancelling ? "Cancelling…" : "Yes, cancel booking"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmingCancel(false)} disabled={cancelling}>
              Keep my time
            </Button>
          </div>
        )}
      </div>

      <p className="text-sm text-muted">
        Changing or cancelling close to your appointment may incur a fee under our cancellation policy. If one applies, the
        amount shows here.
      </p>
    </section>
  );
}
