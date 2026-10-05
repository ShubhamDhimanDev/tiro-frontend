import type { ReactNode } from "react";
import { TierPicks } from "@/components/catalog/tier-picks";
import { TyreResultsGrid } from "@/components/catalog/tyre-results-grid";
import { groupTyresByModel } from "@/lib/catalog/group-by-model";
import { prepareResults } from "@/lib/catalog/extra-filters";
import { deriveTiers } from "@/lib/catalog/tiers";
import type { TyreListItem } from "@/lib/catalog/types";

/**
 * Body of the static browse pages (tyre type, brand, latest releases): optional
 * "Recommended" tier columns, then "Browse our full range". These pages are
 * ISR and carry no zone, so prices are the design-phase placeholders from
 * `lib/catalog/mock-merchandising.ts` until phase 7.
 */
export function BrowseListing({
  items,
  label,
  showTiers = false,
  anchorIds = false,
  emptyState,
  heading = "Browse our full range",
}: {
  items: TyreListItem[];
  label: string;
  showTiers?: boolean;
  anchorIds?: boolean;
  emptyState?: ReactNode;
  heading?: string;
}) {
  const prepared = prepareResults(items);
  const picks = showTiers ? deriveTiers(groupTyresByModel(prepared))?.picks : undefined;
  return (
    <>
      {picks && picks.length === 3 && <TierPicks picks={picks} sizeLabel="All sizes" />}
      <section aria-labelledby="browse-range-heading">
        <h2 id="browse-range-heading" className="type-h2 mb-5">
          {heading}
        </h2>
        <TyreResultsGrid items={prepared} label={label} anchorIds={anchorIds} emptyState={emptyState} />
      </section>
    </>
  );
}
