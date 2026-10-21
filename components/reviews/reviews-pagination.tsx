import Link from "next/link";
import { LinkPendingDot } from "@/components/ui/link-pending-dot";
import type { ReviewsMeta } from "@/lib/reviews/types";

/**
 * A near-duplicate of `components/catalog/pagination-controls.tsx`, kept
 * separate rather than shared: the Reviews domain's paginator shape has no
 * `last_page` (it's derived here from `total`/`per_page`) and this app's
 * established convention is flat, independent domains rather than cross-
 * domain UI coupling (see frontend/CLAUDE.md's Phase 7 section for the same
 * "a third narrow variant beats bolting a second shape onto an existing
 * one" reasoning applied elsewhere in this codebase).
 *
 * Layout: one centred cluster, Previous, page numbers, Next (all >=44px).
 */
export function ReviewsPagination({ meta, buildHref }: { meta: ReviewsMeta; buildHref: (page: number) => string }) {
  const lastPage = Math.max(1, Math.ceil(meta.total / meta.per_page));
  if (lastPage <= 1) return null;

  const current = meta.current_page;
  const hasPrev = current > 1;
  const hasNext = current < lastPage;

  // First, last and a window around the current page, with gaps collapsed to an ellipsis.
  const pages: (number | "gap")[] = [];
  for (let p = 1; p <= lastPage; p++) {
    if (p === 1 || p === lastPage || Math.abs(p - current) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }

  const stepClass =
    "flex min-h-11 items-center px-3 font-semibold text-black underline decoration-gold decoration-[3px] underline-offset-4 hover:text-muted";
  const disabledStep = "flex min-h-11 items-center px-3 font-semibold text-disabled-text opacity-70";
  const numClass =
    "flex h-11 min-w-11 items-center justify-center rounded-control border-2 border-line px-2 font-semibold text-black hover:bg-chip";

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1 text-sm" aria-label="Reviews pagination">
      {hasPrev ? (
        <Link href={buildHref(current - 1)} rel="prev" className={stepClass}>
          Previous
          <LinkPendingDot />
        </Link>
      ) : (
        <span aria-hidden="true" className={disabledStep}>
          Previous
        </span>
      )}
      <ul className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">
              &hellip;
            </li>
          ) : (
            <li key={p}>
              {p === current ? (
                <span aria-current="page" className="flex h-11 min-w-11 items-center justify-center rounded-control border-2 border-black bg-black px-2 font-bold text-white">
                  {p}
                </span>
              ) : (
                <Link href={buildHref(p)} aria-label={`Page ${p}`} className={numClass}>
                  {p}
                </Link>
              )}
            </li>
          ),
        )}
      </ul>
      {hasNext ? (
        <Link href={buildHref(current + 1)} rel="next" className={stepClass}>
          Next
          <LinkPendingDot />
        </Link>
      ) : (
        <span aria-hidden="true" className={disabledStep}>
          Next
        </span>
      )}
    </nav>
  );
}
