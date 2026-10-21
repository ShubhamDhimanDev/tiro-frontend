"use client";

import { useCoverage } from "@/components/location/coverage-provider";
import { RecycleIcon, ShieldIcon, TagIcon, TruckIcon } from "@/components/ui/icons";
import { HOME_TRUST_POINTS } from "@/lib/home/content";
import { trustedTitle } from "@/lib/locations/coverage";

const ICONS = { trusted: ShieldIcon, delivery: TruckIcon, prices: TagIcon, recycling: RecycleIcon };

/**
 * Trust strip under the hero: four points on the light band. The first one names the served area from the admin's
 * coverage (`useCoverage()` + `trustedTitle`, filled by the root layout), so no place is written in the component. A
 * client component only to read that context: it still renders on the server and the pages stay static. Shared by the
 * home, location, services and info pages. The Google rating is not repeated here; it shows in the reviews section.
 */
export function UspStrip() {
  const trusted = trustedTitle(useCoverage());
  return (
    <section aria-label="Why customers choose us" className="border-y border-line bg-band">
      <ul className="container-page grid grid-cols-1 gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {HOME_TRUST_POINTS.map(({ id, label, note }) => {
          const Icon = ICONS[id];
          return (
            <li key={id} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-black">
                <Icon className="h-5 w-5" />
              </span>
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
