"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { useLocation } from "@/components/location/location-provider";
import { useWeekAvailability } from "@/components/checkout/use-week-availability";
import { ServiceError } from "@/components/ui/service-error";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { ChevronLeftIcon, ChevronRightIcon, PinIcon } from "@/components/ui/icons";
import { toBookingItems } from "@/lib/cart/cart";
import { formatMoney } from "@/lib/catalog/format-money";
import { formatClock, formatWindow } from "@/lib/booking/format";
import { addDays, todayIso, weekCells } from "@/lib/checkout/dates";
import { readFittingSelection, writeFittingSelection, type FittingSelection } from "@/lib/checkout/fitting-selection";
import { DAY_PARTS, dayAvailability, groupSlots, slotsLeftLabel } from "@/lib/checkout/slots";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";
import type { BookingItemInput } from "@/lib/booking/types";

/** Persisted fitting selection, read after mount (localStorage). `ready` is false until then. */
export function useFittingSelection(): [FittingSelection | null, (next: FittingSelection | null) => void, boolean] {
  const [value, setValue] = useState<FittingSelection | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      setValue(readFittingSelection());
      setReady(true);
    });
  }, []);
  function update(next: FittingSelection | null) {
    setValue(next);
    writeFittingSelection(next);
  }
  return [value, update, ready];
}

/** "Your fitting location: Melbourne Metro  Change" strip. Opens the shared location sheet. */
export function FittingLocationStrip({ className }: { className?: string }) {
  const { zone, loading, openPicker } = useLocation();
  return (
    <div className={cx("flex min-h-12 items-center gap-3 rounded-control bg-band px-4 py-2 text-sm", className)}>
      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-white">
        <PinIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-muted">
        Your fitting location: <b className="text-black">{loading ? "Loading..." : (zone?.label ?? "Select address")}</b>
      </span>
      <button type="button" onClick={openPicker} className="-mr-2 inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-medium text-black underline underline-offset-2">
        Change
      </button>
    </div>
  );
}

const PEER_FOCUS = "has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black";

/**
 * Week strip with Prev/Next week, the seven day cells and the real times for
 * the chosen day, grouped Morning / Lunch / Afternoon, plus the flexible option.
 *
 * All of it is live (`GET /booking-slots`): a day with no free slot is
 * unavailable, a green dot means the flexible discount can be taken that day, a
 * black dot means one slot is left, and the chosen day says how many slots are
 * left. Nothing is held by choosing here; the checkout wizard holds the slot
 * when the customer continues.
 *
 * It needs a service zone and something to fit. `items` defaults to the cart;
 * the PDP passes the tyre being viewed so a customer with an empty cart still
 * sees real times for it.
 */
export function FittingDateStrip({
  value,
  onChange,
  idPrefix,
  items,
}: {
  value: FittingSelection | null;
  onChange: (next: FittingSelection | null) => void;
  idPrefix?: string;
  items?: BookingItemInput[];
}) {
  const auto = useId();
  const id = idPrefix ?? auto;
  const { zone, loading: zoneLoading, clearZone, openPicker } = useLocation();
  const { state: cart } = useCart();
  const [today, setToday] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const t = todayIso();
      setToday(t);
      setWeekStart(value?.date && value.date > t ? value.date : t);
    });
    // Initial week only: later selections must not jump the strip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cartItems = useMemo(() => toBookingItems(cart), [cart]);
  const effectiveItems = items && items.length > 0 ? items : cartItems;
  const { availability, retry } = useWeekAvailability(zone?.zoneId ?? null, effectiveItems, cart.addons, weekStart, clearZone);

  if (!today || !weekStart || zoneLoading) {
    return <div className="h-72 animate-pulse rounded-control bg-chip" aria-hidden />;
  }

  if (!zone) {
    return (
      <div data-testid="fitting-date-strip" className="flex flex-col items-start gap-3 rounded-control bg-band p-4 text-sm">
        <p className="text-black">Enter your suburb or postcode to see the fitting times available at your address.</p>
        <Button variant="black" size="sm" onClick={openPicker} className="min-h-11">
          Set your location
        </Button>
      </div>
    );
  }

  if (effectiveItems.length === 0) {
    return (
      <div data-testid="fitting-date-strip" className="rounded-control bg-band p-4 text-sm text-black">
        Add tyres to your cart to see the fitting times available for them.
      </div>
    );
  }

  const cells = weekCells(weekStart);
  const ready = availability.status === "ready" ? availability : null;
  const dayOf = (iso: string) => dayAvailability(ready?.days.find((d) => d.date === iso));
  const selected = value ? dayOf(value.date) : null;
  const canGoBack = weekStart > today;
  const monthLabel = `${cells[0].month}${cells[0].month !== cells[6].month ? ` - ${cells[6].month}` : ""}`;
  const flexOffer = ready?.flexible?.available ? ready.flexible : null;
  const groups = selected ? groupSlots(selected.slots) : null;
  const chosenSlot = value && !value.flexible ? value.slot : null;
  const flexSelected = Boolean(value?.flexible && selected?.flexible);

  function pickDate(iso: string) {
    const next = dayOf(iso);
    const keepSlot = value?.slot && next.slots.some((s) => s.start === value.slot) ? value.slot : null;
    const keepFlex = (value?.flexible || cart.flexible) && next.flexible && !keepSlot;
    onChange({ date: iso, slot: keepFlex ? null : keepSlot, flexible: Boolean(keepFlex) });
  }

  function pickSlot(start: string) {
    if (value) onChange({ date: value.date, slot: start, flexible: false });
  }

  function pickFlexible() {
    if (value) onChange({ date: value.date, slot: null, flexible: true });
  }

  return (
    <div className="flex flex-col gap-4" data-testid="fitting-date-strip">
      <p id={`${id}-label`} className="text-center text-sm font-bold text-black">
        Select a fitting date
      </p>
      <div className="overflow-hidden rounded-control border border-line">
        <div className="flex items-center justify-between bg-black px-3 text-sm text-white">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => setWeekStart(addDays(weekStart, -7) < today ? today : addDays(weekStart, -7))}
            className="inline-flex min-h-11 items-center gap-1 disabled:opacity-40"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Prev week
          </button>
          <span className="text-xs text-white/70">{monthLabel}</span>
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="inline-flex min-h-11 items-center gap-1">
            Next week
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
        <div role="radiogroup" aria-labelledby={`${id}-label`} aria-busy={availability.status === "loading"} className="grid grid-cols-7">
          {cells.map((d) => {
            const info = dayOf(d.iso);
            const isSelected = value?.date === d.iso;
            const disabled = !ready || !info.open;
            return (
              <div key={d.iso} className="min-w-0 border-r border-line last:border-r-0">
                <p className="bg-band py-1.5 text-center text-xs font-bold text-black">{d.dow}</p>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${d.dow} ${d.day} ${d.month}${ready ? (info.open ? `, ${slotsLeftLabel(info.slots.length)}` : ", unavailable") : ""}${info.flexible ? ", flexible discount" : ""}`}
                  disabled={disabled}
                  onClick={() => pickDate(d.iso)}
                  className={cx(
                    "relative flex h-16 w-full flex-col items-center justify-center text-black",
                    !ready ? "animate-pulse bg-chip" : disabled ? "bg-[#6b6b6b] text-white" : isSelected ? "bg-gold" : "bg-surface hover:bg-gold-soft",
                  )}
                >
                  <span className="text-lg font-semibold leading-none">{d.day}</span>
                  <span className="mt-1 text-[11px]">{d.month}</span>
                  {ready && info.open && (info.flexible || info.lastSlot) && (
                    <span className="absolute right-1 top-1 flex gap-0.5" aria-hidden="true">
                      {info.flexible && <span className="h-2.5 w-2.5 rounded-full bg-green" />}
                      {info.lastSlot && <span className="h-2.5 w-2.5 rounded-full bg-black" />}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-black">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-green" />
          Flexible booking discount
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-black" />1 booking slot left
        </span>
      </p>

      {availability.status === "error" && (
        <ServiceError message={availability.message} onRetry={retry} />
      )}

      {ready && !cells.some((c) => dayOf(c.iso).open) && (
        <p data-testid="no-times" className="rounded-control bg-band p-3 text-sm text-black">
          No times are free this week. Try the next week, or call us on{" "}
          <a href={PHONE_HREF} className="font-bold underline underline-offset-2">
            {PHONE_DISPLAY}
          </a>
          .
        </p>
      )}

      <fieldset className="flex flex-col gap-3" disabled={!ready}>
        <legend className="mb-1 text-sm font-bold text-black">Preferred service time</legend>
        {!selected || !groups ? (
          <p className="text-xs text-muted">Pick a date to see the times available.</p>
        ) : (
          <>
            {selected.open && (
              <p className={cx("text-xs font-bold", selected.slots.length <= 3 ? "text-black" : "text-muted")}>
                {slotsLeftLabel(selected.slots.length)} on this day.
              </p>
            )}
            {DAY_PARTS.map((part) =>
              groups[part.key].length === 0 ? null : (
                <div key={part.key} className="flex flex-col gap-2">
                  <p className="text-xs font-bold uppercase tracking-normal text-muted">{part.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {groups[part.key].map((slot) => {
                      const on = chosenSlot === slot.start;
                      return (
                        <label
                          key={slot.start}
                          className={cx(
                            "flex min-h-[48px] cursor-pointer items-center justify-center rounded-control border-2 px-2 py-2 text-sm font-bold",
                            PEER_FOCUS,
                            on ? "border-black bg-gold" : "border-line bg-surface hover:border-black",
                          )}
                        >
                          <input
                            type="radio"
                            name={`${id}-time`}
                            value={slot.start}
                            checked={on}
                            onChange={() => pickSlot(slot.start)}
                            className="sr-only"
                          />
                          <span className="type-mono">{formatClock(slot.start)}</span>
                          <span className="sr-only"> to {formatClock(slot.end)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
            {selected.flexible && flexOffer && (
              <label
                className={cx(
                  "flex min-h-[64px] cursor-pointer flex-col justify-center rounded-control border-2 px-3 py-2 text-sm",
                  PEER_FOCUS,
                  flexSelected ? "border-black bg-gold" : "border-line bg-surface hover:border-black",
                )}
              >
                <input type="radio" name={`${id}-time`} value="flexible" checked={flexSelected} onChange={pickFlexible} className="sr-only" />
                <span className="font-bold">
                  I&apos;m flexible
                  <span className="ml-1 text-xs font-bold text-green">-{formatMoney(flexOffer.discount_cents)}*</span>
                </span>
                <span className="text-xs">
                  anytime between {formatClock(selected.flexible.window_start)} and {formatClock(selected.flexible.window_end)}
                </span>
              </label>
            )}
            {selected.open && flexOffer && selected.flexible && (
              <p className="text-xs text-muted">
                *Flexible: be available any time between {formatClock(selected.flexible.window_start)} and {formatClock(selected.flexible.window_end)} and save{" "}
                {formatMoney(flexOffer.discount_cents)}. We assign the exact time.
              </p>
            )}
            {value && chosenSlot && selected.slots.find((s) => s.start === chosenSlot) && (
              <p className="sr-only" aria-live="polite">
                Selected {formatWindow(chosenSlot, selected.slots.find((s) => s.start === chosenSlot)!.end)}
              </p>
            )}
          </>
        )}
      </fieldset>
    </div>
  );
}
