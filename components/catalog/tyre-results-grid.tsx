import { groupTyresByModel } from "@/lib/catalog/group-by-model";
import { TyreModelCard } from "@/components/catalog/tyre-model-card";
import type { TyreListItem } from "@/lib/catalog/types";

/**
 * Shared leaf building block for rendering a flat `TyreListItem[]` as
 * grouped "from $X" cards. Used by both the standard and staggered results
 * wrappers (`tyre-search-results.tsx`) — the wrappers differ (staggered has
 * two independently-paginated sides), this grid doesn't need to.
 *
 * A syntactically valid search that matches nothing is a normal `200`/
 * `data: []`, not an error — requirements §3.1's "clearly explain when no
 * products are available".
 */
export function TyreResultsGrid({ items, emptyMessage }: { items: TyreListItem[]; emptyMessage?: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {emptyMessage ?? "No products available for this fitment. Try a different size or check back soon."}
      </div>
    );
  }

  const groups = groupTyresByModel(items);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {groups.map((group) => (
        <TyreModelCard key={group.model.slug + group.variants[0].slug} group={group} />
      ))}
    </div>
  );
}
