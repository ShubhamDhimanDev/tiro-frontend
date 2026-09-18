"use client";

import { useEffect, useState } from "react";
import { useLocation } from "@/components/location/location-provider";
import { LocationGate } from "@/components/location/location-gate";
import { formatMoney } from "@/lib/catalog/format-money";
import { StockBadge } from "@/components/catalog/stock-badge";
import type { TyreAvailability } from "@/lib/catalog/types";

/**
 * PDP price/stock section. Deliberately its own client-fetch, separate from
 * the SSG/ISR static-content fetch that produced the rest of the page —
 * `GET /api/v1/tyres/{slug}/availability?zone=` is "always a live
 * client-side fetch, never statically cached, never baked into the SSG
 * page" per the task brief and docs/architecture/02-api-contract.md.
 *
 * Wrapped in `<LocationGate>`: if no zone is resolved yet, this is the
 * trigger to prompt for location rather than silently omitting price/stock.
 */
export function PdpAvailability({ slug }: { slug: string }) {
  return (
    <LocationGate prompt="Enter your location to see price and availability for this tyre.">
      {(zoneId) => <AvailabilityFetch slug={slug} zoneId={zoneId} />}
    </LocationGate>
  );
}

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TyreAvailability };

function AvailabilityFetch({ slug, zoneId }: { slug: string; zoneId: string }) {
  const { clearZone } = useLocation();
  const requestKey = `${slug}::${zoneId}`;
  // Keyed by `requestKey` rather than reset via a synchronous `setState` at
  // the top of the effect (which `react-hooks/set-state-in-effect` flags as
  // a cascading-render risk) — the "loading" state for a new `slug`/`zoneId`
  // pair is derived below by comparing keys instead.
  const [result, setResult] = useState<{ key: string; state: FetchState } | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/catalog/tyres/${encodeURIComponent(slug)}/availability?zone=${encodeURIComponent(zoneId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (cancelled) return;

        if (res.status === 404) {
          // Stale/tampered/unknown zone id — degrade to "re-check
          // serviceability" (clearing re-renders the parent <LocationGate>
          // back into its capture-form state) rather than silently falling
          // through to an unscoped result.
          await clearZone();
          return;
        }

        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          setResult({ key: requestKey, state: { status: "ready", data: body.data as TyreAvailability } });
        } else {
          setResult({
            key: requestKey,
            state: { status: "error", message: body.message ?? "Couldn't load price and availability." },
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ key: requestKey, state: { status: "error", message: "Couldn't load price and availability." } });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, zoneId, requestKey, clearZone]);

  const state: FetchState = result && result.key === requestKey ? result.state : { status: "loading" };

  if (state.status === "loading") {
    return <div className="h-16 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" aria-hidden />;
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {state.message}
      </p>
    );
  }

  const { data } = state;

  if (data.stock_status === "unavailable_in_zone") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        This tyre isn&apos;t currently available in your area. Try a different location, or check back soon.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        {data.promotional_price ? (
          <>
            <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {formatMoney(data.promotional_price, data.currency)}
            </span>
            <span className="text-sm text-zinc-500 line-through dark:text-zinc-400">
              {formatMoney(data.unit_price, data.currency)}
            </span>
          </>
        ) : (
          <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {formatMoney(data.unit_price, data.currency)}
          </span>
        )}
        <span className="text-xs text-zinc-500 dark:text-zinc-400">per tyre, fitted</span>
      </div>
      <StockBadge status={data.stock_status} />
      {data.service_fee > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Plus a {formatMoney(data.service_fee, data.currency)} service fee for your area.
        </p>
      )}
    </div>
  );
}
