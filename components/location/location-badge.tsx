"use client";

import { useState } from "react";
import { useLocation } from "@/components/location/location-provider";
import { LocationCaptureForm } from "@/components/location/location-capture-form";

/**
 * Header widget: shows the resolved zone label, or a "Set your location"
 * prompt. Expands the capture form inline on click — kept deliberately
 * simple (no modal/overlay library in this project yet).
 */
export function LocationBadge() {
  const { zone, loading, clearZone } = useLocation();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="h-8 w-32" aria-hidden />;
  }

  return (
    <div className="relative text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path
            fillRule="evenodd"
            d="M9.69 18.933a.75.75 0 0 0 .62 0c.058-.026.128-.06.208-.104a12.045 12.045 0 0 0 1.792-1.223C13.89 16.117 16 13.505 16 10a6 6 0 1 0-12 0c0 3.505 2.11 6.117 3.69 7.606a12.045 12.045 0 0 0 1.792 1.223 6.13 6.13 0 0 0 .208.104ZM10 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
            clipRule="evenodd"
          />
        </svg>
        {zone ? <span>Delivering to {zone.label}</span> : <span>Set your location</span>}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-md border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          {zone && (
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              Currently set to <span className="font-medium text-zinc-900 dark:text-zinc-100">{zone.label}</span>.
            </p>
          )}
          <LocationCaptureForm onResolved={() => setOpen(false)} />
          {zone && (
            <button
              type="button"
              onClick={async () => {
                await clearZone();
                setOpen(false);
              }}
              className="mt-3 text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Clear saved location
            </button>
          )}
        </div>
      )}
    </div>
  );
}
