import { HeroArt } from "@/components/layout/hero-art";
import { HeroFinder } from "@/components/home/hero-finder";
import { MotionPauseButton } from "@/components/ui/motion-pause-button";
import { CheckIcon } from "@/components/ui/icons";

/** Rotating "FREE ..." line. Decorative (hidden from AT); the static copy is read instead. */
function UspLine() {
  const phrases = ["tyre fitting wherever you are", "delivery to your door", "wheel balancing", "tyre fitting wherever you are"];
  return (
    <div id="usp-line" className="flex items-start gap-2 md:items-center text-[15px] font-bold text-black">
      <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold">
        <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <span className="sr-only">Free tyre fitting, delivery and wheel balancing</span>
      {/* Phones: one static, wrapping line (nothing clipped or moving). md+: the rotating line. */}
      <span aria-hidden="true" className="min-w-0 flex-1 leading-snug md:hidden">
        FREE tyre fitting, delivery and balancing
      </span>
      <span aria-hidden="true" className="hidden h-6 min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap leading-6 md:flex">
        <span className="leading-6">FREE</span>
        <span className="usp-rotator block h-6 min-w-0 overflow-hidden leading-6">
          {phrases.map((p, i) => (
            <span key={i} className="block h-6 truncate leading-6">
              {p}
            </span>
          ))}
        </span>
      </span>
      <MotionPauseButton targetId="usp-line" label="the rotating offer text" className="-my-2.5 ml-auto hidden md:flex" />
    </div>
  );
}

/**
 * Home hero. Mobile order: headline, finder card, USP line (no artwork above
 * the finder). Desktop: copy + finder on the left, chevrons and van art right.
 */
export function Hero({ regoEnabled }: { regoEnabled: boolean }) {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden bg-surface">
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-8 md:py-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-6 lg:py-16">
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
          <UspLine />
        </div>
        <HeroArt />
      </div>
    </section>
  );
}
