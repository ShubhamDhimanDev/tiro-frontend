import { TyreResultsGrid } from "@/components/catalog/tyre-results-grid";
import { PaginationControls } from "@/components/catalog/pagination-controls";
import type { Paginator, StaggeredTyreSearchResult, TyreListItem } from "@/lib/catalog/types";

/**
 * Standard (non-staggered) results wrapper — flat paginator envelope.
 * Kept separate from `TyreSearchResultsStaggered` below per the task brief:
 * "Staggered mode gets a different response envelope than everything else
 * in this API — don't reuse your normal list-rendering component
 * unmodified." Both share the leaf `<TyreResultsGrid>` for the actual card
 * layout — that part genuinely is identical, only the envelope/pagination
 * shape differs.
 */
export function TyreSearchResults({
  result,
  buildHref,
}: {
  result: Paginator<TyreListItem>;
  buildHref: (page: number) => string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <TyreResultsGrid items={result.data} />
      <PaginationControls meta={result.meta} buildHref={buildHref} />
    </div>
  );
}

/**
 * Staggered results wrapper — `{ data: { front: {...}, rear: {...} } }`,
 * the one sanctioned exception to the flat envelope (front/rear are
 * frequently different SKUs/models entirely).
 *
 * Pagination: front and rear paginate independently — `TyreController::
 * index()` accepts distinct `front_page`/`rear_page` query params
 * (confirmed against the real backend implementation; not spelled out in
 * `docs/architecture/02-api-contract.md`'s query-param table). Each side
 * therefore gets its own `<PaginationControls>` driven by its own `meta`,
 * so paging through front results doesn't move which page of rear results
 * is shown, and vice versa.
 */
export function TyreSearchResultsStaggered({
  result,
  buildFrontHref,
  buildRearHref,
}: {
  result: StaggeredTyreSearchResult["data"];
  buildFrontHref: (page: number) => string;
  buildRearHref: (page: number) => string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Front tyres</h2>
        <TyreResultsGrid items={result.front.data} emptyMessage="No front tyres available for this fitment." />
        <PaginationControls meta={result.front.meta} buildHref={buildFrontHref} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Rear tyres</h2>
        <TyreResultsGrid items={result.rear.data} emptyMessage="No rear tyres available for this fitment." />
        <PaginationControls meta={result.rear.meta} buildHref={buildRearHref} />
      </section>
    </div>
  );
}
