"use client";

import { useLinkStatus } from "next/link";

/**
 * Small inline pending indicator for a `<Link>` — must render as a
 * descendant of the `<Link>` it's indicating for (per `useLinkStatus`'s own
 * contract). Used two ways:
 *
 * 1. On pagination controls (tyre search results, reviews), where the
 *    destination route already has its own route-level `loading.tsx` (so
 *    navigation itself is never blank) but a fast-clicking user still
 *    benefits from immediate feedback that the click registered, per the
 *    task brief's "client-side pending-state UI ... for in-page transitions
 *    like paginating results."
 * 2. On `<CartLineItems>`'s link back to a tyre's PDP, where the
 *    destination route deliberately has *no* `loading.tsx` at all (see
 *    `app/tyres/[slug]/page.tsx`'s doc comment for why) — here this dot is
 *    the only loading feedback, not a supplement to a route-level skeleton.
 *    `<TyreModelCard>` uses the more prominent `LinkPendingOverlay` for the
 *    same route instead, since a whole card warrants more than a dot.
 *
 * Fixed-size and reserves its own space always (`inline-block h-2 w-2`)
 * rather than mounting/unmounting, per Next's own `useLinkStatus` guidance
 * against layout shift from inline indicators.
 */
export function LinkPendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`ml-1.5 inline-block h-2 w-2 rounded-full bg-current transition-opacity duration-150 ${
        pending ? "animate-pulse opacity-60" : "opacity-0"
      }`}
    />
  );
}
