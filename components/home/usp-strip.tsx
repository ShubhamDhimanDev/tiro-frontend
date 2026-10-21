"use client";

import { useCoverage } from "@/components/location/coverage-provider";
import { RecycleIcon, ShieldIcon, TagIcon, TruckIcon } from "@/components/ui/icons";
import { HOME_TRUST_POINTS } from "@/lib/home/content";
import { trustedTitle } from "@/lib/locations/coverage";

const ICONS = { trusted: ShieldIcon, delivery: TruckIcon, prices: TagIcon, recycling: RecycleIcon };

/**
 * Trust strip under the hero: four plain points with red icons and thin dividers on the light band. The first one names
 * the admin's served area (`useCoverage()` + `trustedTitle`, filled by the root layout), so no place is written in the
 * component. A client component only to read that context: it still renders on the server and the pages stay static. Shared
 * by the location, services and info pages. The Google rating is not repeated here; it shows in the reviews section.
 */
export function UspStrip() {
  const trusted = trustedTitle(useCoverage());
  return (
    <section aria-label="Why customers choose us" className="border-y border-line bg-band">
      <ul className="container-page grid grid-cols-1 gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {HOME_TRUST_POINTS.map(({ id, label, note }) => {
          const Icon = ICONS[id];
          return (
            <li key={id} className="flex items-center gap-3 lg:border-l lg:border-line lg:pl-6 lg:first:border-l-0 lg:first:pl-0">
              <Icon className="h-8 w-8 shrink-0 text-accent" />
              <span className="flex flex-col">
                <span className="text-[15px] font-bold leading-tight text-black">{label ?? trusted}</span>
                <span className="text-sm leading-snug text-muted">{note}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
