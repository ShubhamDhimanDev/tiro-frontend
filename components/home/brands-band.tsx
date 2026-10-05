import Link from "next/link";
import { MotionPauseButton } from "@/components/ui/motion-pause-button";
import type { HomeBrand } from "@/lib/home/load";

/**
 * Yellow "Shop leading brands" band fed by `GET /brands`. Brand names are
 * typeset text (no third-party logos).
 *
 * Phones: a static, wrapped grid of chips (nothing clipped, nothing moving).
 * md+: a slow marquee with soft edge fades and a pause button (WCAG 2.2.2).
 * The marquee's second copy only closes the loop and is aria-hidden.
 * Frozen under reduced motion. Renders nothing when the API returns no brands.
 */
export function BrandsBand({ brands }: { brands: HomeBrand[] }) {
  if (brands.length === 0) return null;
  // One link list serves both layouts (a wrapped grid on phones, an inline row inside the marquee from md up), so there is a single set of links in the DOM.
  const chip =
    "flex min-h-12 items-center justify-center rounded-control border-2 border-black/80 px-4 text-base font-extrabold italic tracking-[-0.5px] text-black transition-colors hover:bg-black hover:text-gold md:h-14 md:shrink-0 md:justify-start md:rounded-none md:border-0 md:px-9 md:text-[28px] md:tracking-[-1px] md:hover:bg-transparent md:hover:text-black";
  const copyChip = "flex h-14 shrink-0 items-center px-9 text-[28px] font-extrabold italic tracking-[-1px] text-black";
  return (
    <section aria-labelledby="brands-heading" className="mt-[50px] bg-gold py-9 lg:mt-20 lg:py-12">
      <div className="container-page">
        <div className="mb-6 flex items-center gap-4">
          <span aria-hidden="true" className="h-px flex-1 bg-black/30" />
          <h2 id="brands-heading" className="text-xl font-bold tracking-[-0.5px] text-black md:text-[28px]">
            Shop leading brands
          </h2>
          <span aria-hidden="true" className="h-px flex-1 bg-black/30" />
        </div>
      </div>

      <div className="container-page md:max-w-none md:p-0">
        <div className="flex items-center gap-2">
          <div id="brands-marquee" className="marquee-fade min-w-0 flex-1 md:overflow-hidden">
            <div className="marquee-track md:flex">
              <ul className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 md:flex md:gap-0" aria-label="Brands we stock">
                {brands.map((b) => (
                  <li key={b.slug} className="flex md:block">
                    <Link href={`/brands/${b.slug}`} className={`${chip} w-full md:w-auto`}>
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="hidden md:flex" aria-hidden="true">
                {brands.map((b) => (
                  <li key={b.slug} className={copyChip}>
                    {b.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <MotionPauseButton targetId="brands-marquee" label="brands scrolling" className="mr-[var(--gutter)] hidden md:flex" />
        </div>
      </div>

      <div className="container-page mt-6 text-center">
        <Link href="/brands" className="inline-flex min-h-11 items-center font-bold text-black underline underline-offset-4">
          See all brands
        </Link>
      </div>
    </section>
  );
}
