/**
 * Fallback for the `{children}` slot of the account shell — the nav and title
 * stay visible; only the section content shows this skeleton. Every section
 * renders its own tighter skeleton once its client-side fetch starts.
 */
export default function AccountSectionLoading() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="h-12 w-40 animate-pulse rounded-full bg-chip" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-card bg-chip" />
      ))}
    </div>
  );
}
