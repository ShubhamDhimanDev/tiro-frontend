"use client";

import { useLocation } from "@/components/location/location-provider";
import { ChevronDownIcon, PinIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";

/** Text shown on the chip / menu field. Exported for tests. */
export function locationLabel(zone: { label: string } | null): string {
  return zone ? `Fitting in ${zone.label}` : "Set your location";
}

/**
 * Location pill. Never blocks the page: it only reads the resolved zone and
 * opens the shared location modal (`<LocationSheet>`) on click.
 *
 * `variant="chip"` is the 48px grey tile in the desktop header row;
 * `variant="field"` is the full-width row used in the mobile strip and menu.
 */
export function LocationChip({
  variant = "chip",
  onBeforeOpen,
  className,
}: {
  variant?: "chip" | "field";
  /** Called just before the picker opens (the menu closes itself here). */
  onBeforeOpen?: () => void;
  className?: string;
}) {
  const { zone, loading, openPicker } = useLocation();

  // Reserve the resolved size while the mount-time zone check is in flight
  // so the header does not shift when it lands.
  if (loading) {
    return (
      <div
        aria-hidden="true"
        className={cx("h-12 rounded-card bg-chip", variant === "chip" ? "w-60" : "w-full", className)}
      />
    );
  }

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={locationLabel(zone)}
      onClick={() => {
        onBeforeOpen?.();
        openPicker();
      }}
      className={cx(
        "flex min-h-12 items-center gap-2 rounded-card bg-chip px-3.5 text-left text-sm font-semibold text-black transition-colors duration-300 hover:bg-line",
        variant === "chip" ? "w-60 shrink-0 xl:w-72" : "w-full",
        className,
      )}
    >
      <PinIcon className={cx("h-5 w-5 shrink-0", zone ? "text-green" : "text-black")} />
      <span aria-hidden="true" className="min-w-0 flex-1 truncate">
        <span className="sm:hidden">{zone ? locationLabel(zone) : "Set location"}</span>
        <span className="hidden sm:inline">{locationLabel(zone)}</span>
      </span>
      <ChevronDownIcon className={cx("h-4 w-4 shrink-0 text-muted", variant === "field" && "max-lg:hidden")} />
    </button>
  );
}
