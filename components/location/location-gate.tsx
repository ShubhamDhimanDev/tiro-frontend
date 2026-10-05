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
    return <div className="h-24 animate-pulse rounded-card bg-chip" aria-hidden />;
  }

  if (!zone) {
    return (
      <div className="rounded-card border border-line bg-surface p-4">
        <p className="mb-3 text-muted">{prompt}</p>
        <LocationCaptureForm />
      </div>
    );
  }

  return <>{children(zone.zoneId)}</>;
}
