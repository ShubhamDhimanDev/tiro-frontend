import { HeroArt } from "@/components/layout/hero-art";
import { HeroFinder } from "@/components/home/hero-finder";
import { CheckIcon } from "@/components/ui/icons";

const HERO_TICKS = ["At home, work or roadside", "Balancing included", "Old tyres recycled"];

/** Three static inclusions under the finder: yellow tick badge + bold label. Wraps to extra rows on narrow screens. */
function HeroTicks() {
  return (
    <ul aria-label="Included with every fitting" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px] font-bold text-black">
      {HERO_TICKS.map((label) => (
        <li key={label} className="flex items-center gap-2">
          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold">
            <CheckIcon className="h-4 w-4" strokeWidth={3} />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Home hero. Mobile order: headline, finder card, inclusions, then the van photo
 * (no artwork above the finder, so "Find tyres" stays on the first screen).
 * Desktop: copy + finder on the left, chevrons and van art right.
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
          <HeroFinder regoEnabled={regoEnabled} />
          <HeroTicks />
        </div>
        <HeroArt mobile />
      </div>
    </section>
  );
}
