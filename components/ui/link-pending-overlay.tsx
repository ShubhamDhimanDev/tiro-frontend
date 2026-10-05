"use client";

import { useLinkStatus } from "next/link";
import { TyreLoader } from "./tyre-loader";

/**
 * Full-card pending overlay for a `<Link>` whose destination route
 * deliberately has no route-level `loading.tsx` — currently just the tyre
 * PDP (`app/tyres/[slug]/page.tsx`; see that file's doc comment for why a
 * `loading.tsx` there breaks `notFound()`'s HTTP status).
 *
 * Unlike `LinkPendingDot` (a small supplementary "did my click register?"
 * hint for routes that *already* show their own `loading.tsx` skeleton),
 * this is the *primary* loading feedback for its destination, so it
 * reproduces the pulsing-skeleton look the removed route-level `loading.tsx`
 * used to show — just scoped to the one card that was actually clicked,
 * instead of the whole viewport.
 *
 * Must render as a descendant of the `<Link>` it's indicating for, per
 * `useLinkStatus`'s own contract. The overlay positions against the nearest
 * positioned ancestor, so the card (`relative`) is what it covers. Always
 * mounted and opacity-toggled (never conditionally rendered) so it never
 * shifts layout, per Next's own `useLinkStatus` guidance.
 */
export function LinkPendingOverlay() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-card bg-surface/80 transition-opacity duration-150 ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="absolute inset-0 animate-pulse rounded-card bg-chip motion-reduce:animate-none" />
      <span className="absolute inset-0 flex items-center justify-center">
        <TyreLoader size="md" label={null} showRoad={false} />
      </span>
    </span>
  );
}
