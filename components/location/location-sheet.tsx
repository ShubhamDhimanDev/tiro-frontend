"use client";

import { useLocation } from "@/components/location/location-provider";
import { LocationCaptureForm } from "@/components/location/location-capture-form";
import { PinIcon, TruckIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";

/**
 * The one "where should we fit your tyres" modal (phase 1). Rendered once by
 * the site header and opened ON DEMAND only: from the header pill, the mobile
 * menu, the finder, or `useLocation().openPicker()` at purchase intent. It
 * never opens on load and never blocks first paint.
 *
 * Desktop: 850px dialog, illustration panel left, form right. Phone: bottom
 * sheet sized to its content. Uses the existing capture form, serviceability
 * call and zone cookie unchanged.
 */
export function LocationSheet() {
  const { zone, clearZone, pickerOpen, closePicker } = useLocation();

  return (
    <Sheet
      open={pickerOpen}
      onClose={closePicker}
      title="Select fitting location"
      wide
      bodyClassName="p-0"
    >
      <div className="grid md:grid-cols-[320px_minmax(0,1fr)]">
        {/* Placeholder illustration: replace with a real map/van image. */}
        <div
          aria-hidden="true"
          className="relative hidden flex-col items-center justify-center gap-4 bg-gold p-8 text-black md:flex"
        >
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-white/60">
            <PinIcon className="h-24 w-24" strokeWidth={1.5} />
            <span className="absolute -bottom-2 -right-4 flex h-16 w-16 items-center justify-center rounded-full bg-black text-gold">
              <TruckIcon className="h-9 w-9" />
            </span>
          </div>
          <p className="text-center text-xl font-extrabold leading-tight tracking-[-0.5px]">Tyre fitting near you</p>
        </div>

        <div className="flex flex-col gap-4 p-5 md:p-8">
          <p className="text-[15px] text-muted">
            Enter the suburb where you would like your tyres fitted, so we can show accurate stock and fitting times.
          </p>
          {zone && (
            <p className="text-sm text-muted">
              Currently set to <span className="font-bold text-black">{zone.label}</span>.
            </p>
          )}
          <LocationCaptureForm onResolved={closePicker} />
          {zone && (
            <button
              type="button"
              onClick={async () => {
                await clearZone();
                closePicker();
              }}
              className="tap-target self-start text-sm text-muted underline underline-offset-2 hover:text-black"
            >
              Clear saved location
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
