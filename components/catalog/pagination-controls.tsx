import Link from "next/link";
import type { PaginatorMeta } from "@/lib/catalog/types";

export function PaginationControls({ meta, buildHref }: { meta: PaginatorMeta; buildHref: (page: number) => string }) {
  if (meta.last_page <= 1) return null;

  const hasPrev = meta.current_page > 1;
  const hasNext = meta.current_page < meta.last_page;

  return (
    <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
      {hasPrev ? (
        <Link href={buildHref(meta.current_page - 1)} className="text-zinc-700 underline underline-offset-2 dark:text-zinc-300">
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-zinc-500 dark:text-zinc-400">
        Page {meta.current_page} of {meta.last_page}
      </span>
      {hasNext ? (
        <Link href={buildHref(meta.current_page + 1)} className="text-zinc-700 underline underline-offset-2 dark:text-zinc-300">
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
