"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocation } from "@/components/location/location-provider";

/** localStorage key holding the time (ms since epoch) the first-visit prompt was last shown in this browser. */
export const LOCATION_PROMPT_KEY = "mts_location_prompt_at";
/** After showing the prompt once, stay quiet for a week, whether or not the visitor filled it in. */
export const LOCATION_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** Let the page paint first, so the popup never competes with the hero image for load time. */
export const LOCATION_PROMPT_DELAY_MS = 1200;

function recentlyPrompted(): boolean {
  try {
    const at = Number(window.localStorage.getItem(LOCATION_PROMPT_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < LOCATION_PROMPT_SNOOZE_MS;
  } catch {
    // Storage blocked (private window, site data off): treat as "not shown yet" and still ask once per page load.
    return false;
  }
}

/**
 * Opens the shared "Select fitting location" dialog on a visitor's first visit to the home page, asking for a suburb or
 * postcode. Mounted once in the root layout; renders nothing itself (the dialog is `<LocationSheet>` in the header).
 *
 * Deliberately narrow, because a popup on arrival is easy to overdo:
 * - home page only (`/`), not every landing page, so search visitors reach tyre pages and the catalogue unobstructed;
 * - only when no service zone is saved yet (the zone cookie lasts 30 days), and only after the zone check has finished;
 * - at most once a week per browser, whatever the visitor does with it (the header pill and finder stay available);
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
    if (!eligible || recentlyPrompted()) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(LOCATION_PROMPT_KEY, String(Date.now()));
      } catch {
        // See recentlyPrompted(): nothing to remember it with, so it may show again on the next page load.
      }
      openPicker();
    }, LOCATION_PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [eligible, openPicker]);

  return null;
}
