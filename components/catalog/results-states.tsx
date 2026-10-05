import Link from "next/link";
import { ChangeSizeSheet } from "@/components/catalog/change-size-sheet";
import type { TyreSearchFormValues } from "@/components/catalog/tyre-search-form";
import { buttonClassName } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { quoteHref, quoteHrefForValues } from "@/lib/catalog/quote";

/**
 * Empty, invalid-size and backend-error states for catalogue results.
 * Each says what happened in plain words and offers a next step.
 */

export const NO_RESULTS_MESSAGE = "No products available for this fitment. Try a different size or check back soon.";

/** A search that is well-formed but matches nothing. Actions: change size, request a quote. */
export function NoResultsState({
  message,
  values,
  showChangeSize = true,
  className,
  clearHref,
}: {
  message?: string;
  values?: TyreSearchFormValues;
  showChangeSize?: boolean;
  className?: string;
  /** When filters are active: link that drops them and keeps the size. */
  clearHref?: string;
}) {
  const text = message ?? (clearHref ? "No tyres match these filters." : NO_RESULTS_MESSAGE);
  return (
    <div
      data-testid="no-results"
      className={cx(
        "flex flex-col items-start gap-4 rounded-card border border-dashed border-line bg-surface p-6 sm:items-center sm:text-center",
        className,
      )}
    >
      <p className="text-base font-semibold text-ink">{text}</p>
      <p className="text-sm text-muted">
        We can often source other sizes and brands. Tell us what you need and we will get back to you.
      </p>
      <div className="flex flex-wrap gap-3">
        {clearHref && (
          <Link href={clearHref} className={buttonClassName({ variant: "primary" })}>
            Clear filters
          </Link>
        )}
        {showChangeSize && values && <ChangeSizeSheet values={values} variant="button" label="Try a different size" />}
        <Link
          href={quoteHrefForValues(values)}
          className={buttonClassName({ variant: values && showChangeSize ? "primary" : "secondary" })}
        >
          Request a quote
        </Link>
      </div>
    </div>
  );
}

/** A section-level empty message for one side of a staggered fitment. Single action. */
export function SideEmptyState({ message, size }: { message: string; size?: string | null }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line bg-surface p-5 text-sm text-muted">
      <p>{message}</p>
      <Link href={quoteHref(size)} className="font-semibold text-link underline underline-offset-4 hover:text-ink">
        Request a quote
      </Link>
    </div>
  );
}

/** The API rejected a filter value (422 on a non-size field, e.g. a hand-edited URL). One action: clear filters. */
export function InvalidFilterState({ message, clearHref }: { message: string; clearHref: string }) {
  return (
    <div data-testid="invalid-filter" className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-6">
      <h2 className="type-h3">Those filters can&apos;t be applied</h2>
      <p role="alert" className="text-sm msg-error">
        {message}
      </p>
      <Link href={clearHref} className={buttonClassName({ variant: "primary" })}>
        Clear filters
      </Link>
    </div>
  );
}

/** The API rejected the size (422). One action: change size. */
export function InvalidSizeState({ message, values }: { message: string; values: TyreSearchFormValues }) {
  return (
    <div data-testid="invalid-size" className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-6">
      <h2 className="type-h3">That size does not look right</h2>
      <p role="alert" className="text-sm msg-error">
        {message}
      </p>
      <p className="text-sm text-muted">
        Check the numbers on your tyre sidewall (for example 205/55 R16), or search by vehicle instead.
      </p>
      <ChangeSizeSheet values={values} variant="button" label="Change size" />
    </div>
  );
}

/** The backend failed or was unreachable. One action: try again (same URL). */
export function BackendErrorState({ message, retryHref }: { message?: string; retryHref: string }) {
  return (
    <div data-testid="backend-error" className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-6">
      <h2 className="type-h3">We could not load tyres just now</h2>
      <p role="alert" className="text-sm msg-error">
        {message ?? "Something went wrong loading results. Please try again."}
      </p>
      <Link href={retryHref} className={buttonClassName({ variant: "primary" })}>
        Try again
      </Link>
    </div>
  );
}
