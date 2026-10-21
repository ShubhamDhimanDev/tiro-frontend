"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocation } from "@/components/location/location-provider";

/** Set this localStorage item (any value) to silence the popup, e.g. in Playwright's storage state or while testing by hand. */
export const LOCATION_PROMPT_OFF_KEY = "mts_location_prompt_off";
/** Let the page paint first, so the popup never competes with the hero image for load time. */
export const LOCATION_PROMPT_DELAY_MS = 1200;

/** True once the popup has opened during this page load, so going back to the home page in the same visit does not re-open it. */
let promptedThisLoad = false;

function silenced(): boolean {
  try {
    return window.localStorage.getItem(LOCATION_PROMPT_OFF_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Opens the shared "Select fitting location" dialog when a visitor arrives on the home page without a saved location,
 * asking for a suburb or postcode. Mounted once in the root layout; renders nothing itself (the dialog is
 * `<LocationSheet>` in the header).
 *
 * - home page only (`/`), so search visitors reach tyre pages and the catalogue unobstructed;
 * - only when no service zone is saved (the zone cookie lasts 30 days) and the zone check has finished, so it stops for
 *   good once a visitor enters a location;
 * - once per page load: a visitor who closes it is asked again on their next visit to the site, not on every
 *   navigation back to the home page;
 * - after a short delay, so it never delays first paint.
 *
 * The dialog itself is the normal `Sheet`: Escape, the close button or a tap outside dismisses it, and focus returns to
 * where it was.
 */
export function LocationAutoPrompt() {
  const { zone, loading, openPicker } = useLocation();
  const pathname = usePathname();
  const eligible = pathname === "/" && !loading && !zone;

  useEffect(() => {
    if (!eligible || promptedThisLoad || silenced()) return;
    const timer = window.setTimeout(() => {
      promptedThisLoad = true;
      openPicker();
    }, LOCATION_PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [eligible, openPicker]);

  return null;
}
