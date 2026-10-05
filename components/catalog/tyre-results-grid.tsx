import type { ReactNode } from "react";
import { groupTyresByModel } from "@/lib/catalog/group-by-model";
import { prepareResults, sortGroups } from "@/lib/catalog/extra-filters";
import { deriveTiers } from "@/lib/catalog/tiers";
import { RevealItem, RevealList } from "@/components/motion/reveal";
import { TyreModelCard } from "@/components/catalog/tyre-model-card";
import { NoResultsState } from "@/components/catalog/results-states";
import type { TyreListItem } from "@/lib/catalog/types";
import type { BookingPosition } from "@/lib/booking/types";

/**
 * Shared leaf for rendering a flat `TyreListItem[]` as flip cards in a semantic
 * list: one column on phones, two from 576px, three from 992px. Used by the
 * standard and staggered results wrappers and by the brand / type /
 * latest-release pages.
 *
 * Items go through `prepareResults` first (a no-op against the live API:
 * placeholder prices only with `NEXT_PUBLIC_CATALOG_MOCKS=on`, client-side
 * filters only on the stub backend), then are grouped per pattern and sorted
 * for the price sorts.
 *
 * A syntactically valid search that matches nothing is a normal `200` with
 * `data: []`, not an error: it renders `emptyState` (default: the no-results
 * state with a "Request a quote" action).
 *
 * `allowPriority` (default `true`): whether this grid's own first card may
 * claim the LCP-priority image slot. `position`: cart position for Add (`front`
 * / `rear` add an axle pair on staggered results).
 */
export function TyreResultsGrid({
  items,
  values = {},
  emptyMessage,
  emptyState,
  allowPriority = true,
  position = "all",
  label = "Tyre results",
  anchorIds = false,
}: {
  items: TyreListItem[];
  /** URL values: sort and the extra filters. */
  values?: Record<string, string | undefined>;
  emptyMessage?: string;
  emptyState?: ReactNode;
  allowPriority?: boolean;
  position?: BookingPosition;
  label?: string;
  /** Give each card an `#model-{slug}` anchor (for pattern chips). Off by default: staggered results would repeat ids. */
  anchorIds?: boolean;
}) {
  const prepared = prepareResults(items, values);
  if (prepared.length === 0) {
    return <>{emptyState ?? <NoResultsState message={emptyMessage} showChangeSize={false} />}</>;
  }

  const groups = sortGroups(groupTyresByModel(prepared), values.sort);
  const tiers = deriveTiers(groups)?.byModel;

  return (
    <RevealList as="ul" label={label} className="grid gap-4 min-[576px]:grid-cols-2 lg:grid-cols-3">
      {groups.map((group, index) => (
        <RevealItem
          as="li"
          soft
          key={group.model.slug + group.variants[0].slug}
          id={anchorIds ? `model-${group.model.slug}` : undefined}
          className="scroll-mt-24"
        >
          <TyreModelCard
            group={group}
            priority={allowPriority && index < 6}
            tier={tiers?.[group.model.slug]}
            position={position}
          />
        </RevealItem>
      ))}
    </RevealList>
  );
}
