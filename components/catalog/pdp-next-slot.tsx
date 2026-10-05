"use client";

import { useEffect, useState } from "react";
import { useLocation } from "@/components/location/location-provider";
import { usePdpBuy } from "@/components/catalog/pdp-buy-context";
import { CalendarIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { bookingApi } from "@/lib/booking/client-api";
import { weekWindow } from "@/lib/booking/date-window";
import { describeNextSlot, findNextSlot, type NextSlot } from "@/lib/catalog/next-slot";

type SlotState =
  | { status: "loading" }
  | { status: "ready"; slot: NextSlot | null; todayIso: string }
  | { status: "error" };

/**
 * "Next available fitting" preview from the existing booking-slots endpoint
 * (`bookingApi.slots`, proxied through `/api/booking/slots`): the first open
 * slot in the next 7 days for this tyre and quantity in the resolved zone.
 * A preview only: nothing is held, and the customer picks the real time in the
 * booking flow.
 *
 * Quantity changes refetch after a short debounce (job duration depends on it).
 */
export function PdpNextSlot() {
  const { openPicker } = useLocation();
  const { zoneId, zoneLabel, tyreVariantId, quantity, position } = usePdpBuy();
  const [debouncedQty, setDebouncedQty] = useState(quantity);
  const [result, setResult] = useState<{ key: string; state: SlotState } | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQty(quantity), 300);
    return () => window.clearTimeout(id);
  }, [quantity]);

  const key = zoneId ? `${zoneId}::${tyreVariantId}::${debouncedQty}::${position}` : null;

  useEffect(() => {
    if (!zoneId || !key) return;
    let cancelled = false;
    const { dateFrom, dateTo } = weekWindow(0);

    bookingApi
      .slots({ zone: zoneId, dateFrom, dateTo, items: [{ tyre_variant_id: tyreVariantId, quantity: debouncedQty, position }], addons: [] })
      .then((res) => {
        if (cancelled) return;
        if (res.kind === "success") {
          setResult({ key, state: { status: "ready", slot: findNextSlot(res.data.data.days), todayIso: dateFrom } });
        } else {
          setResult({ key, state: { status: "error" } });
        }
      })
      .catch(() => {
        if (!cancelled) setResult({ key, state: { status: "error" } });
      });

    return () => {
      cancelled = true;
    };
  }, [zoneId, key, tyreVariantId, debouncedQty, position]);

  const state: SlotState = result && result.key === key ? result.state : { status: "loading" };

  return (
    <div className="flex min-h-[4.5rem] items-start gap-3 rounded-control border border-line bg-band p-3" data-testid="pdp-next-slot">
      <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
      <div className="min-w-0 flex-1" aria-live="polite">
        {state.status === "loading" && (
          <>
            <Skeleton className="mb-2 h-4 w-32" />
            <Skeleton className="h-5 w-48" />
          </>
        )}
        {state.status === "ready" && state.slot && (
          <>
            <p className="text-sm text-muted">Next available fitting</p>
            <p className="font-semibold text-ink">{describeNextSlot(state.slot, state.todayIso)}</p>
          </>
        )}
        {state.status === "ready" && !state.slot && (
          <p className="text-sm text-ink">
            No fitting times in the next 7 days. Add to cart to see later dates when you book.
          </p>
        )}
        {state.status === "error" && (
          <p className="text-sm text-ink">Fitting times will show when you book.</p>
        )}
        <p className="mt-1 text-xs text-muted">
          {zoneLabel ? `Your area: ${zoneLabel}` : "Your area"}
          {" · "}
          <button
            type="button"
            onClick={openPicker}
            className="font-semibold text-link underline underline-offset-2 hover:text-ink"
          >
            Change area
          </button>
        </p>
      </div>
    </div>
  );
}
