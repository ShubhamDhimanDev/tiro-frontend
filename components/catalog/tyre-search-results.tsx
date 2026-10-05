import { TyreResultsGrid } from "@/components/catalog/tyre-results-grid";
import { PaginationControls } from "@/components/catalog/pagination-controls";
import { NoResultsState, SideEmptyState } from "@/components/catalog/results-states";
import type { TyreSearchFormValues } from "@/components/catalog/tyre-search-form";
import { buildFilterHref, countActiveFilters } from "@/lib/catalog/filters";
import { formatQuoteSize } from "@/lib/catalog/quote";
import type { Paginator, StaggeredTyreSearchResult, TyreListItem } from "@/lib/catalog/types";

/**
 * Standard (non-staggered) results wrapper: flat paginator envelope.
 * Kept separate from `TyreSearchResultsStaggered` below because staggered mode
 * has a different response envelope; both share the leaf `<TyreResultsGrid>`
 * for the card layout, only the envelope and pagination differ.
 */
export function TyreSearchResults({
  result,
  buildHref,
  values,
}: {
  result: Paginator<TyreListItem>;
  buildHref: (page: number) => string;
  values: TyreSearchFormValues;
}) {
  const v = values as Record<string, string | undefined>;
  const clearHref = countActiveFilters(v) > 0 ? buildFilterHref(v, {}) : undefined;
  return (
    <div className="flex flex-col gap-4">
      <TyreResultsGrid items={result.data} values={v} emptyState={<NoResultsState values={values} clearHref={clearHref} />} />
      <PaginationControls meta={result.meta} buildHref={buildHref} />
    </div>
  );
}

/**
 * Staggered results wrapper: `{ data: { front: {...}, rear: {...} } }`, the one
 * sanctioned exception to the flat envelope (front and rear are frequently
 * different SKUs or models entirely).
 *
 * Front and rear paginate independently via two query params
 * (`front_page` / `rear_page`, see search-params.ts), so each side gets its own
 * `<PaginationControls>` driven by its own `meta`. Cards on each side add a
 * front or rear axle pair to the cart.
 */
export function TyreSearchResultsStaggered({
  result,
  buildFrontHref,
  buildRearHref,
  values,
}: {
  values?: Record<string, string | undefined>;
  result: StaggeredTyreSearchResult["data"];
  buildFrontHref: (page: number) => string;
  buildRearHref: (page: number) => string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3" aria-labelledby="front-tyres-heading">
        <h2 id="front-tyres-heading" className="type-h3 border-b border-line pb-2">
          Front tyres
        </h2>
        <TyreResultsGrid
          items={result.front.data}
          values={values}
          label="Front tyre results"
          position="front"
          emptyState={<SideEmptyState
              message="No front tyres available for this fitment."
              size={formatQuoteSize(values?.front_width, values?.front_profile, values?.front_rim_diameter)}
            />}
        />
        <PaginationControls meta={result.front.meta} buildHref={buildFrontHref} />
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="rear-tyres-heading">
        <h2 id="rear-tyres-heading" className="type-h3 border-b border-line pb-2">
          Rear tyres
        </h2>
        <TyreResultsGrid
          items={result.rear.data}
          values={values}
          label="Rear tyre results"
          position="rear"
          allowPriority={false}
          emptyState={<SideEmptyState
              message="No rear tyres available for this fitment."
              size={formatQuoteSize(values?.rear_width, values?.rear_profile, values?.rear_rim_diameter)}
            />}
        />
        <PaginationControls meta={result.rear.meta} buildHref={buildRearHref} />
      </section>
    </div>
  );
}
