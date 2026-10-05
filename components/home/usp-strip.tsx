import { StarIcon, TagIcon, TruckIcon, WrenchIcon } from "@/components/ui/icons";
import type { ReviewsSummary } from "@/lib/reviews/types";

const POINTS = [
  { label: "Fitting included", note: "Balancing and disposal too", Icon: WrenchIcon },
  { label: "Delivery included", note: "Straight to where we fit", Icon: TruckIcon },
  { label: "Price-match guarantee", note: "Cheaper elsewhere? Tell us", Icon: TagIcon },
];

/**
 * Trust strip under the hero: three inclusions plus, only when the reviews
 * API reports a real summary, the average rating. No summary, no rating tile.
 */
export function UspStrip({ summary = null }: { summary?: ReviewsSummary | null }) {
  return (
    <section aria-label="Why customers choose us" className="border-y border-line bg-band">
      <div
        className={`container-page grid grid-cols-1 gap-4 py-5 sm:grid-cols-2 lg:gap-6 ${summary ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
      >
        {POINTS.map(({ label, note, Icon }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-black">
              <Icon className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] font-bold leading-tight text-black">{label}</span>
              <span className="text-sm leading-snug text-muted">{note}</span>
            </span>
          </div>
        ))}
        {summary && (
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-gold">
              <StarIcon className="h-5 w-5 fill-current" />
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] font-bold leading-tight text-black">Rated {summary.average_rating.toFixed(1)} out of 5</span>
              <span className="text-sm leading-snug text-muted">{summary.total_count} Google reviews</span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
