import { StarIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";
import { TRUST_BADGES, type TrustBadge } from "@/lib/site/trust-badges";
import type { ReviewsSummary } from "@/lib/reviews/types";

/**
 * Third-party trust badges (awards, accreditation, review platforms) from
 * `lib/site/trust-badges.ts`, plus an optional review summary tile. Renders
 * nothing while there are no badges and no summary, so it is safe to mount
 * before the business holds any real badges. Callers that already show the
 * rating elsewhere on the page should omit `summary`.
 */
export function TrustStrip({
  summary = null,
  badges = TRUST_BADGES,
  className,
}: {
  summary?: ReviewsSummary | null;
  badges?: TrustBadge[];
  className?: string;
}) {
  if (badges.length === 0 && !summary) return null;
  return (
    <section aria-label="Trust and accreditation" className={cx("container-page pt-[50px] lg:pt-20", className)}>
      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 rounded-card border border-line bg-band px-5 py-5">
        {summary && (
          <li className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-gold">
              <StarIcon className="h-5 w-5 fill-current" />
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] font-bold leading-tight text-black">Rated {summary.average_rating.toFixed(1)} out of 5</span>
              <span className="text-sm leading-snug text-muted">{summary.total_count} Google reviews</span>
            </span>
          </li>
        )}
        {badges.map((b) => {
          // eslint-disable-next-line @next/next/no-img-element -- badge artwork has unknown, varying dimensions
          const img = <img src={b.src} alt={b.label} loading="lazy" className="h-12 w-auto" />;
          return <li key={b.label}>{b.href ? <a href={b.href} target="_blank" rel="noopener noreferrer">{img}</a> : img}</li>;
        })}
      </ul>
    </section>
  );
}
