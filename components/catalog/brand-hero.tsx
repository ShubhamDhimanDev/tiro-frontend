import type { ReactNode } from "react";
import { BrandMark } from "@/components/catalog/brand-mark";
import { InlineSizeFinder } from "@/components/catalog/inline-size-finder";
import { TierBadge } from "@/components/ui/badge";
import type { ApiTier } from "@/lib/catalog/types";

/**
 * Compact hero for the brands index and brand pages: name, a two-line intro
 * and an inline "find your size" row. No photography and no giant H1, so the
 * first tyres sit within the first screen on a phone.
 *
 * Brand pages show the uploaded logo (`logoPath`) beside the title when the
 * brand has one; the name alone carries the page otherwise.
 */
export function BrandHero({
  title,
  intro,
  brandSlug,
  logoPath,
  tier,
  modelCount,
  children,
}: {
  title: string;
  intro?: string;
  brandSlug?: string;
  /** `brands.logo_path` of the brand being shown; nothing renders when null/absent. */
  logoPath?: string | null;
  /** Curated tier from the API; no badge when absent or null. */
  tier?: ApiTier | null;
  /** Number of active patterns, when the brand detail endpoint supplied it. */
  modelCount?: number;
  children?: ReactNode;
}) {
  return (
    <section aria-label={`${title} overview`} className="border-b border-line bg-band">
      <div className="container-page flex flex-col gap-4 py-8 md:py-12 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0 lg:max-w-xl">
          <BrandMark logoPath={logoPath} name={title} decorative className="mb-3 h-16 w-40 border border-line" />
          <h1 className="type-h2">{title}</h1>
          {(tier || (modelCount ?? 0) > 0) && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
              {tier && <TierBadge tier={tier} />}
              {(modelCount ?? 0) > 0 && (
                <span>
                  {modelCount} {modelCount === 1 ? "pattern" : "patterns"} in our range
                </span>
              )}
            </p>
          )}
          {intro && <p className="mt-2 line-clamp-2 text-muted">{intro}</p>}
          {children}
        </div>
        <InlineSizeFinder brandSlug={brandSlug} className="lg:w-[30rem] lg:shrink-0" />
      </div>
    </section>
  );
}

/**
 * Pattern (model) chips: anchor links that jump to that pattern's card in the
 * grid. Horizontal scroll on phones. Only worth showing when there are enough
 * patterns to scan.
 */
export function PatternChips({ patterns }: { patterns: { slug: string; name: string }[] }) {
  return (
    <nav aria-label="Patterns" className="mb-4">
      <ul className="relative -mx-4 flex scroll-pl-4 gap-2 overflow-x-auto px-4 pb-1 pr-10 [mask-image:linear-gradient(to_right,#000_90%,transparent)] [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pr-0 md:[mask-image:none]">
        {patterns.map((p) => (
          <li key={p.slug} className="shrink-0">
            <a
              href={`#model-${p.slug}`}
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-bold text-black transition-colors hover:bg-chip"
            >
              {p.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Pattern chips only make sense with several patterns; also keeps model names from repeating on short lists. */
export const MIN_PATTERNS_FOR_CHIPS = 4;
