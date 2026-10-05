import type { ReactNode } from "react";

/**
 * Listing header: H1 (with an optional live result count) and intro on the
 * left, actions (Change size chip) on the right, optional trust row below.
 * No hero band: on a phone the first tyres sit within the first screen.
 *
 * The count is a polite live region so a screen reader hears it after a filter
 * or page change.
 */
export function ListingHeader({
  title,
  count,
  intro,
  actions,
  children,
}: {
  title: string;
  count?: string;
  intro?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pb-6 md:pb-8">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="type-h2">{title}</h1>
          {intro && <p className="mt-2 max-w-2xl text-muted">{intro}</p>}
          {count !== undefined && (
            <p role="status" aria-live="polite" data-testid="result-count" className="mt-2 text-sm font-medium text-black">
              {count}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
