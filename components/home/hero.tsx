import { HeroArt } from "@/components/layout/hero-art";
import { HeroFinder } from "@/components/home/hero-finder";
import { CheckIcon } from "@/components/ui/icons";
import { HERO_TICKS } from "@/lib/home/content";

/** Three static ticks under the finder. Nothing rotates or animates, so there is nothing to pause. */
function HeroTicks() {
  return (
    <ul aria-label="Included with every fitting" className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-bold text-black">
      {HERO_TICKS.map((tick) => (
        <li key={tick} className="flex items-center gap-2">
          <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          {tick}
        </li>
      ))}
    </ul>
  );
}

/**
 * Home hero. Mobile order: headline, finder card, ticks, then the van photo
 * (no artwork above the finder, so "Find tyres" stays on the first screen).
 * Desktop: copy + finder on the left; the van photo bleeds to the right edge of the section behind a white fade.
 * The finder drops its suburb chip here (the header location pill already captures it); city pages keep it.
 */
export function Hero({ regoEnabled }: { regoEnabled: boolean }) {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden bg-surface">
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-8 md:py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-6 lg:py-16">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 id="hero-heading" className="type-display !leading-[1.16] lg:!text-[clamp(44px,4.4vw,56px)]">
              Tyres fitted <span className="brand-highlight inline-block whitespace-nowrap !leading-[1.12] [background-size:100%_100%]">where you are.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Pick your tyres online. We fit them at your home or work, with balancing and old-tyre recycling included.
            </p>
          </div>
          <HeroFinder regoEnabled={regoEnabled} showLocation={false} />
          <HeroTicks />
        </div>
        <HeroArt mobile bleed />
      </div>
    </section>
  );
}
