import { TyreModelCard } from "@/components/catalog/tyre-model-card";
import { StarIcon, TagIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";
import type { Tier } from "@/components/ui/badge";
import type { TierPick } from "@/lib/catalog/tiers";

const TIER_HEAD: Record<Tier, { label: string; className: string; icon: React.ReactNode }> = {
  premium: { label: "Premium", className: "bg-black text-white", icon: <StarIcon className="h-5 w-5" /> },
  mid: { label: "Mid-range", className: "bg-green text-white", icon: <TagIcon className="h-5 w-5" /> },
  budget: { label: "Budget", className: "bg-gold text-black", icon: <span aria-hidden="true" className="text-lg font-extrabold leading-none">$</span> },
};

/**
 * "Top picks for <size>" (or "Recommended for your vehicle" when `vehicleContext`): Premium (black) / Mid-range (green) / Budget
 * (yellow) columns, each a coloured header over a flip card (see
 * `lib/catalog/tiers.ts` for how the picks are derived). Phones show a
 * snap-scrolling row so three tall cards do not push the grid off screen;
 * from 768px the three columns sit side by side.
 */
export function TierPicks({
  picks,
  sizeLabel,
  size,
  vehicleContext = false,
}: {
  picks: TierPick[];
  sizeLabel: string;
  /** Width / profile / rim for the vehicle strip. Omit for brand or type pages. */
  size?: { width?: string; profile?: string; rim?: string };
  /** True only when the picks come from a vehicle fitment lookup. */
  vehicleContext?: boolean;
}) {
  // Only claim "for your vehicle" when a vehicle fitment context exists; a plain size search gets "Top picks for <size>".
  const rim = size?.rim?.replace(/^R/i, "");
  const heading = vehicleContext
    ? "Recommended for your vehicle"
    : sizeLabel === "All sizes"
      ? "Our top picks"
      : `Top picks for ${sizeLabel}`;
  return (
    <section aria-labelledby="tier-picks-heading" className="mb-10">
      <h2 id="tier-picks-heading" className="type-h2 mb-4">
        {heading}
      </h2>
      {size?.width && (
        <p className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-line bg-surface px-4 py-3 text-sm">
          <TyreStripIcon />
          <span>
            Width <b>{size.width}</b>
          </span>
          {size.profile && (
            <span>
              Profile <b>{size.profile}</b>
            </span>
          )}
          {rim && (
            <span>
              Rim <b>R{rim}</b>
            </span>
          )}
          <a href="#filters" className="ml-auto font-medium text-link underline underline-offset-2">
            Not your tyre size?
          </a>
        </p>
      )}
      <ul
        aria-label={sizeLabel === "All sizes" ? "Our picks" : `Picks for ${sizeLabel}`}
        className="relative -mx-5 flex snap-x snap-mandatory scroll-pl-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0"
      >
        {picks.map(({ tier, group }) => {
          const head = TIER_HEAD[tier];
          return (
            <li
              key={tier}
              data-testid={`tier-pick-${tier}`}
              className="w-[78vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-card border border-line bg-surface shadow-rest md:w-auto md:max-w-none"
            >
              <p className={cx("flex h-[52px] items-center justify-center gap-2 text-base font-extrabold", head.className)}>
                {head.icon}
                {head.label}
              </p>
              <TyreModelCard group={group} bare priority />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TyreStripIcon() {
  return (
    <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white">
      <span className="h-3 w-3 rounded-full border-2 border-white" />
    </span>
  );
}
