"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { bookingApi } from "@/lib/booking/client-api";
import { weekWindow } from "@/lib/booking/date-window";
import { dayParts, formatClock, formatDay, formatWindow, partOfDay } from "@/lib/booking/format";
import { formatMoney } from "@/lib/catalog/format-money";
import { formatDuration } from "@/lib/booking/format-duration";
import { ServiceError } from "@/components/ui/service-error";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";
import type { BookingAddonKey, BookingDay, BookingFlexibleOffer, BookingItemInput, BookingSlot } from "@/lib/booking/types";

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; durationMinutes: number; days: BookingDay[]; flexible: BookingFlexibleOffer | null };

/** Radio value for the flexible option (never a real "HH:MM"). */
const FLEX = "flexible";

const NO_DAYS: BookingDay[] = [];

/**
 * Focus ring for a visually hidden radio: the ring is drawn on the card that
 * follows it (`peer` sibling), matching the global gold + ink focus ring.
 */
const PEER_FOCUS =
  "peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold peer-focus-visible:shadow-[0_0_0_2px_var(--c-ink)]";

/**
 * `GET /api/v1/booking-slots`-backed picker, used for the initial "choose a
 * time" step and, unchanged, for the reschedule sub-flow (see
 * `components/booking/booking-flow.tsx`). Always a live client fetch, never
 * cached: capacity changes constantly and a stale list would let a customer pick
 * something that's no longer free.
 *
 * Choosing a time never books it. A radio choice only fills the confirm panel,
 * which spells out what happens next (held for 15 minutes, nothing charged,
 * the total) and only its button calls `onSelectSlot`. That keeps a slot from
 * being held silently by a stray tap.
 *
 * Flexible option (Phase 6a): when the API offers it for the chosen day, a
 * first card lets the customer accept any arrival time in that day window for a
 * fixed saving. It is one more choice in the same radio group, so it is
 * keyboard operable like the times. Choosing it does not hold anything either:
 * the confirm panel says what will happen first, and only its button creates the
 * hold (the server then assigns a real slot). Not offered when rescheduling
 * (`allowFlexible={false}`): a reschedule moves to a specific time and keeps any
 * existing discount.
 */
export function AppointmentSlotPicker({
  zoneId,
  items,
  addons,
  onSelectSlot,
  allowFlexible = true,
  onFlexibleChange,
  pendingSlot,
  refreshKey,
  onZoneRejected,
  confirmLabel = "Hold this time",
  busyLabel = "Holding…",
  confirmNote,
  totalLabel,
}: {
  zoneId: string;
  items: BookingItemInput[];
  addons: BookingAddonKey[];
  /** A normal time passes `(date, "HH:MM")`; the flexible option passes `(date, null, { flexible: true })`. */
  onSelectSlot: (date: string, slotStart: string | null, opts?: { flexible: boolean }) => void;
  /** Show the flexible option when the API offers it. Default true; false when rescheduling. */
  allowFlexible?: boolean;
  /** Tells the parent whether the flexible option is the current choice, so it can price it. */
  onFlexibleChange?: (flexible: boolean) => void;
  /** The slot currently being submitted (create/reschedule in flight) - disables the whole grid and labels the button. */
  pendingSlot: { date: string; start: string } | null;
  /** Bump this (e.g. after a 409) to force a refetch without changing any other prop. */
  refreshKey?: number;
  /** The slots fetch reported the zone as unresolvable (404): degrade to "re-check serviceability". */
  onZoneRejected: () => void;
  /** Button text for the confirm step. */
  confirmLabel?: string;
  /** Button text while the create/reschedule request is in flight. */
  busyLabel?: string;
  /** What choosing this time means (hold length, charges). Rendered in the confirm panel. */
  confirmNote?: string;
  /** Cart total to show beside the choice, e.g. "$756.00". Omit when unknown. */
  totalLabel?: string | null;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [dayChoice, setDayChoice] = useState<string | null>(null);
  const [slotChoice, setSlotChoice] = useState<{ date: string; start: string } | null>(null);

  const { dateFrom, dateTo } = weekWindow(weekOffset);
  // `items`/`addons` are compared by serialized value, not object identity.
  const itemsKey = JSON.stringify(items);
  const addonsKey = JSON.stringify(addons);
  const requestKey = `${zoneId}::${dateFrom}::${dateTo}::${itemsKey}::${addonsKey}::${refreshKey ?? 0}::${retryKey}`;

  // Keyed by `requestKey` rather than reset via a synchronous `setState` at the
  // top of the effect (`react-hooks/set-state-in-effect`): "loading" for a new
  // request is derived by comparing keys. Same pattern as `pdp-buy-context`.
  const [result, setResult] = useState<{ key: string; state: FetchState } | null>(null);

  useEffect(() => {
    let cancelled = false;

    bookingApi
      .slots({ zone: zoneId, dateFrom, dateTo, items, addons })
      .then((res) => {
        if (cancelled) return;
        if (res.kind === "success") {
          setResult({
            key: requestKey,
            state: {
              status: "ready",
              durationMinutes: res.data.data.duration_minutes,
              days: res.data.data.days,
              flexible: res.data.data.flexible ?? null,
            },
          });
        } else if (res.kind === "not_found") {
          onZoneRejected();
        } else {
          setResult({ key: requestKey, state: { status: "error", message: res.message } });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ key: requestKey, state: { status: "error", message: "Couldn't load appointment times." } });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, dateFrom, dateTo, itemsKey, addonsKey, refreshKey, onZoneRejected, requestKey]);

  const state: FetchState = result && result.key === requestKey ? result.state : { status: "loading" };
  const days = state.status === "ready" ? state.days : NO_DAYS;

  // Derived selection: the chosen day must still be in this week's data and have
  // times, else fall back to the first day that does. The chosen slot must still
  // exist in the data (a refetch after a 409 drops the one that was just lost).
  const firstOpenDay = days.find((d) => d.slots.length > 0)?.date ?? null;
  const activeDay = dayChoice && days.some((d) => d.date === dayChoice && d.slots.length > 0) ? dayChoice : firstOpenDay;
  const activeSlots: BookingSlot[] = days.find((d) => d.date === activeDay)?.slots ?? [];
  const selected =
    slotChoice && slotChoice.date === activeDay && activeSlots.some((s) => s.start === slotChoice.start)
      ? activeSlots.find((s) => s.start === slotChoice.start)!
      : null;

  // Flexible: offered when enabled overall and this day has real slots. The choice is dropped if a refetch
  // (e.g. after a 409) says the day no longer offers it.
  const dayFlexible = days.find((d) => d.date === activeDay)?.flexible;
  const flexOffer =
    allowFlexible &&
    state.status === "ready" &&
    state.flexible?.available &&
    dayFlexible?.available &&
    dayFlexible.window_start &&
    dayFlexible.window_end
      ? { window: { start: dayFlexible.window_start, end: dayFlexible.window_end }, cents: state.flexible.discount_cents }
      : null;
  const flexibleSelected = Boolean(flexOffer && slotChoice && slotChoice.date === activeDay && slotChoice.start === FLEX);

  useEffect(() => {
    onFlexibleChange?.(flexibleSelected);
  }, [flexibleSelected, onFlexibleChange]);

  const busy = pendingSlot !== null;
  const morning = activeSlots.filter((s) => partOfDay(s.start) === "morning");
  const afternoon = activeSlots.filter((s) => partOfDay(s.start) === "afternoon");

  function changeWeek(delta: number) {
    setWeekOffset((w) => Math.max(0, w + delta));
    setDayChoice(null);
    setSlotChoice(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => changeWeek(-1)} disabled={weekOffset === 0} className="min-h-11">
          Previous 7 days
        </Button>
        <p className="text-center text-sm text-muted">
          {formatDay(dateFrom)} &ndash; {formatDay(dateTo)}
        </p>
        <Button variant="ghost" size="sm" onClick={() => changeWeek(1)} className="min-h-11">
          Next 7 days
        </Button>
      </div>

      {state.status === "loading" && (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="h-20 animate-pulse rounded-card bg-chip" aria-hidden />
          <div className="h-40 animate-pulse rounded-card bg-chip" aria-hidden />
        </div>
      )}

      {state.status === "error" && (
        <ServiceError message={state.message} onRetry={() => setRetryKey((k) => k + 1)} />
      )}

      {state.status === "ready" && (
        <>
          <p className="text-sm text-muted">
            Your fitting takes about <strong className="font-semibold text-ink">{formatDuration(state.durationMinutes)}</strong>. Each
            time is the appointment window for your fitting.
          </p>

          {firstOpenDay === null ? (
            <div className="rounded-card border border-line bg-surface p-4 text-sm text-muted">
              No times are free in this 7 days. Try the next 7 days, or call us on{" "}
              <a href={PHONE_HREF} className="font-semibold text-black underline underline-offset-2">
                {PHONE_DISPLAY}
              </a>
              .
            </div>
          ) : null}

          <fieldset disabled={busy} className="min-w-0">
            <legend className="mb-2 text-sm font-semibold text-ink">1. Choose a day</legend>
            <div
              data-testid="date-strip"
              className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0"
            >
              {days.map((day) => {
                const parts = dayParts(day.date);
                const full = day.slots.length === 0;
                const checked = day.date === activeDay;
                return (
                  <label key={day.date} className="relative shrink-0 snap-start md:shrink">
                    <input
                      type="radio"
                      name="appointment-day"
                      value={day.date}
                      checked={checked}
                      disabled={full}
                      onChange={() => {
                        setDayChoice(day.date);
                        setSlotChoice(null);
                      }}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex min-h-[4.5rem] w-[4.5rem] cursor-pointer flex-col items-center justify-center rounded-card border-2 border-line bg-surface px-1 py-2 text-center transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-disabled:cursor-not-allowed peer-disabled:bg-chip peer-disabled:text-muted md:w-auto ${PEER_FOCUS}`}
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide">{parts.weekday}</span>
                      <span className="font-mono text-2xl font-bold leading-none">{parts.day}</span>
                      <span className="text-xs">{full ? "Full" : parts.month}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {activeDay && (
            <fieldset disabled={busy} className="min-w-0">
              <legend className="mb-2 text-sm font-semibold text-ink">2. Choose a time on {formatDay(activeDay, "long")}</legend>
              <div className="flex flex-col gap-4">
                {flexOffer && (
                  <label className="relative block" data-testid="flexible-option">
                    <input
                      type="radio"
                      name="appointment-slot"
                      value={FLEX}
                      checked={flexibleSelected}
                      onChange={() => setSlotChoice({ date: activeDay, start: FLEX })}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex cursor-pointer flex-col gap-1 rounded-card border-2 border-line bg-surface px-4 py-3 transition-colors hover:border-muted peer-checked:border-ink peer-checked:bg-gold-soft ${PEER_FOCUS}`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-ink">Flexible arrival</span>
                        <span className="rounded-full bg-success px-2.5 py-0.5 text-xs font-semibold text-white">
                          Save {formatMoney(flexOffer.cents)}
                        </span>
                      </span>
                      <span className="text-sm text-muted">
                        Any time between {formatClock(flexOffer.window.start)} and {formatClock(flexOffer.window.end)}. We choose a time
                        inside that window and show you the exact slot straight after. Pick this only if you can be there whenever we
                        arrive.
                      </span>
                    </span>
                  </label>
                )}
                {[
                  { label: "Morning", slots: morning },
                  { label: "Afternoon", slots: afternoon },
                ]
                  .filter((group) => group.slots.length > 0)
                  .map((group) => (
                    <div key={group.label}>
                      <p className="type-eyebrow mb-2 font-semibold text-muted">{group.label}</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {group.slots.map((slot) => (
                          <label key={slot.start} className="relative block">
                            <input
                              type="radio"
                              name="appointment-slot"
                              value={slot.start}
                              checked={selected?.start === slot.start}
                              onChange={() => setSlotChoice({ date: activeDay, start: slot.start })}
                              className="peer sr-only"
                            />
                            <span
                              className={`flex min-h-16 cursor-pointer flex-col justify-center rounded-card border-2 border-line bg-surface px-3 py-2 transition-colors hover:border-muted peer-checked:border-ink peer-checked:bg-gold-soft peer-disabled:cursor-not-allowed peer-disabled:opacity-60 ${PEER_FOCUS}`}
                            >
                              <span className="whitespace-nowrap text-[15px] font-bold tabular-nums text-ink">{formatWindow(slot.start, slot.end)}</span>
                              <span className="text-sm text-muted">about {formatDuration(state.durationMinutes)}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </fieldset>
          )}

          <ConfirmPanel
            selectedDay={activeDay}
            selected={selected}
            flexible={flexibleSelected && flexOffer ? flexOffer : null}
            busy={busy}
            pendingSlot={pendingSlot}
            confirmLabel={confirmLabel}
            busyLabel={busyLabel}
            confirmNote={confirmNote}
            totalLabel={totalLabel}
            durationMinutes={state.durationMinutes}
            onConfirm={() => {
              if (activeDay && flexibleSelected) onSelectSlot(activeDay, null, { flexible: true });
              else if (activeDay && selected) onSelectSlot(activeDay, selected.start);
            }}
          />
        </>
      )}
    </div>
  );
}

/**
 * Sticky on phones (bottom of the viewport), a plain card from `md` up. Says
 * what is chosen and what confirming does before anything is held.
 */
function ConfirmPanel({
  selectedDay,
  selected,
  flexible,
  busy,
  pendingSlot,
  confirmLabel,
  busyLabel,
  confirmNote,
  totalLabel,
  durationMinutes,
  onConfirm,
}: {
  selectedDay: string | null;
  selected: BookingSlot | null;
  flexible: { window: { start: string; end: string }; cents: number } | null;
  busy: boolean;
  pendingSlot: { date: string; start: string } | null;
  confirmLabel: string;
  busyLabel: string;
  confirmNote?: string;
  totalLabel?: string | null;
  durationMinutes: number;
  onConfirm: () => void;
}) {
  return (
    <div
      data-testid="slot-confirm"
      className="sticky bottom-0 z-30 -mx-4 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-raised md:static md:mx-0 md:rounded-card md:border md:p-4 md:shadow-rest"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 leading-snug" aria-live="polite">
          {flexible && selectedDay ? (
            <>
              <p className="font-semibold text-ink">{formatDay(selectedDay, "long")}</p>
              <p className="font-mono text-sm font-semibold text-ink">
                Any time {formatWindow(flexible.window.start, flexible.window.end)}{" "}
                <span className="font-sans font-normal text-success">(you save {formatMoney(flexible.cents)})</span>
              </p>
              {confirmNote && <p className="mt-1 text-sm text-muted">{confirmNote}</p>}
              {totalLabel && (
                <p className="text-sm text-muted">
                  Your total: <span className="font-mono font-semibold text-ink">{totalLabel}</span> inc. GST, with the flexible saving
                </p>
              )}
            </>
          ) : selected && selectedDay ? (
            <>
              <p className="font-semibold text-ink">
                {formatDay(selectedDay, "long")}
              </p>
              <p className="font-mono text-sm font-semibold text-ink">
                {formatWindow(selected.start, selected.end)} <span className="font-sans font-normal text-muted">({formatDuration(durationMinutes)})</span>
              </p>
              {confirmNote && <p className="mt-1 text-sm text-muted">{confirmNote}</p>}
              {totalLabel && (
                <p className="text-sm text-muted">
                  Your total: <span className="font-mono font-semibold text-ink">{totalLabel}</span> inc. GST
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Choose a time above. Nothing is held until you confirm.</p>
          )}
        </div>
        <Button onClick={onConfirm} disabled={(!selected && !flexible) || busy} loading={busy && pendingSlot !== null} className="w-full md:w-auto md:shrink-0">
          {busy ? busyLabel : confirmLabel}
          {!busy && (selected || flexible) && <CheckIcon aria-hidden="true" className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
