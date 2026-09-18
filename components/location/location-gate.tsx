"use client";

import { useLocation } from "@/components/location/location-provider";
import { LocationCaptureForm } from "@/components/location/location-capture-form";

/**
 * Gates zone-dependent content behind a resolved service zone. Used by the
 * PDP's availability section: "if serviceability hasn't been resolved yet
 * when a user lands on a PDP, this is the trigger to prompt for location
 * before showing price/stock, not a silent omission" (task brief).
 *
 * `children` is a render-prop so callers get the resolved zone id directly
 * instead of re-reading context.
 */
export function LocationGate({
  children,
  prompt = "Enter your location to see price and availability.",
}: {
  children: (zoneId: string) => React.ReactNode;
  prompt?: string;
}) {
  const { zone, loading } = useLocation();

  if (loading) {
    return <div className="h-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" aria-hidden />;
  }

  if (!zone) {
    return (
      <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{prompt}</p>
        <LocationCaptureForm />
      </div>
    );
  }

  return <>{children(zone.zoneId)}</>;
}
