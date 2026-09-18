"use client";

import { useEffect, useState } from "react";
import { useLocation } from "@/components/location/location-provider";
import { LocationCaptureForm } from "@/components/location/location-capture-form";

/**
 * Shown on the search results page when the server-side render detected the
 * saved zone cookie was rejected by the catalog endpoint (stale/tampered/
 * unknown zone id). Results are still rendered — unscoped, no price/stock
 * (never an unfiltered *priced* result) — with this banner prompting a
 * re-check, per the contract's "degrade to re-check serviceability, never
 * silently fall through to an unfiltered nationwide result".
 *
 * Also clears the now-known-bad zone cookie client-side on mount so it
 * doesn't keep failing silently on every subsequent SSR page load.
 */
export function StaleZoneNotice() {
  const { clearZone } = useLocation();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void clearZone();
    // Intentionally runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
      <p className="mb-3 text-sm text-amber-800 dark:text-amber-300">
        We couldn&apos;t confirm your saved service area, so prices and stock aren&apos;t shown below. Please re-check your
        location.
      </p>
      <LocationCaptureForm onResolved={() => setDismissed(true)} />
    </div>
  );
}
