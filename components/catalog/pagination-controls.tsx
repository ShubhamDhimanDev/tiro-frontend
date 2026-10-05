import Link from "next/link";
import { LinkPendingDot } from "@/components/ui/link-pending-dot";
import type { PaginatorMeta } from "@/lib/catalog/types";

const pageLink =
  "inline-flex min-h-11 items-center rounded-full border-2 border-ink px-5 text-sm font-semibold uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-white";

export function PaginationControls({ meta, buildHref }: { meta: PaginatorMeta; buildHref: (page: number) => string }) {
  if (meta.last_page <= 1) return null;

  const hasPrev = meta.current_page > 1;
  const hasNext = meta.current_page < meta.last_page;

  return (
    <nav className="flex items-center justify-between gap-3 pt-2 text-sm" aria-label="Pagination">
      {hasPrev ? (
        <Link href={buildHref(meta.current_page - 1)} className={pageLink}>
          Previous
          <LinkPendingDot />
        </Link>
      ) : (
        <span />
      )}
      <span className="font-mono text-muted">
        Page {meta.current_page} of {meta.last_page}
      </span>
      {hasNext ? (
        <Link href={buildHref(meta.current_page + 1)} className={pageLink}>
          Next
          <LinkPendingDot />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
