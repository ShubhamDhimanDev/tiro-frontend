"use client";

import { useEffect, useState } from "react";
import { bookingApi } from "@/lib/booking/client-api";
import { addDays } from "@/lib/checkout/dates";
import type { BookingAddonKey, BookingDay, BookingFlexibleOffer, BookingItemInput } from "@/lib/booking/types";

export type WeekAvailability =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; durationMinutes: number; days: BookingDay[]; flexible: BookingFlexibleOffer | null };

/**
 * Real availability for the seven days from `weekStart`
 * (`GET /api/v1/booking-slots`, via `/api/booking/slots`). Always a live client
 * fetch, never cached: capacity changes constantly and a stale list would let a
 * customer pick something that is no longer free.
 *
 * `idle` while there is no zone or nothing to fit; `retry()` refetches after an
 * error. A zone the API rejects (404) calls `onZoneRejected` so the caller can
 * send the customer back to location entry.
 */
export function useWeekAvailability(
  zoneId: string | null,
  items: BookingItemInput[],
  addons: BookingAddonKey[],
  weekStart: string | null,
  onZoneRejected: () => void,
): { availability: WeekAvailability; retry: () => void } {
  const [retryKey, setRetryKey] = useState(0);
  const itemsKey = JSON.stringify(items);
  const addonsKey = JSON.stringify(addons);
  const active = Boolean(zoneId && weekStart && items.length > 0);
  const requestKey = `${zoneId}::${weekStart}::${itemsKey}::${addonsKey}::${retryKey}`;
  const [result, setResult] = useState<{ key: string; state: WeekAvailability } | null>(null);

  useEffect(() => {
    if (!active || !zoneId || !weekStart) return;
    let cancelled = false;

    bookingApi
      .slots({ zone: zoneId, dateFrom: weekStart, dateTo: addDays(weekStart, 6), items, addons })
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
        if (!cancelled) setResult({ key: requestKey, state: { status: "error", message: "Couldn't load fitting times." } });
      });

    return () => {
      cancelled = true;
    };
    // `items`/`addons` are compared through their serialised keys, not identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, zoneId, weekStart, itemsKey, addonsKey, retryKey, onZoneRejected, requestKey]);

  const availability: WeekAvailability = !active ? { status: "idle" } : result && result.key === requestKey ? result.state : { status: "loading" };
  return { availability, retry: () => setRetryKey((k) => k + 1) };
}
