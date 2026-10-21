"use client";

import { useRef } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/catalog/brand-mark";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { HomeBrand } from "@/lib/home/load";

const arrow =
  "hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-field bg-surface text-black transition-colors duration-300 hover:bg-black hover:text-white md:flex";

/**
 * Light brand-logo strip directly under the trust strip, fed by `GET /brands`. No heading, no red band and nothing moving:
 * a native scroll-snap row (swipe on phones, prev/next buttons from md up, same as the offers carousel) plus "See all
 * brands". A brand with an uploaded logo shows the logo alone (its `alt` is the link name); a brand without one, or whose
 * image fails to load, shows its name as text so the link never goes blank. Renders nothing when the API returns no brands.
 */
export function BrandsBand({ brands }: { brands: HomeBrand[] }) {
  const rowRef = useRef<HTMLUListElement>(null);

  if (brands.length === 0) return null;

  function scrollRow(dir: 1 | -1) {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section aria-label="Brands we stock" className="border-b border-line bg-surface">
      <div className="container-page flex flex-col gap-1 py-4 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button type="button" aria-label="Previous brands" onClick={() => scrollRow(-1)} className={arrow}>
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <ul ref={rowRef} tabIndex={0} aria-label="Brands we stock" className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory items-center gap-2 overflow-x-auto">
            {brands.map((b) => (
              <li key={b.slug} className="shrink-0 snap-start">
                <Link href={`/brands/${b.slug}`} className="flex min-h-14 items-center justify-center rounded-control px-2 transition-colors duration-300 hover:bg-chip">
                  <BrandMark logoPath={b.logo} name={b.name} className="h-11 w-28">
                    <span className="px-2 text-lg font-extrabold italic tracking-[-0.5px] text-black">{b.name}</span>
                  </BrandMark>
                </Link>
              </li>
            ))}
          </ul>
          <button type="button" aria-label="Next brands" onClick={() => scrollRow(1)} className={arrow}>
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
        <Link href="/brands" className="inline-flex min-h-11 shrink-0 items-center justify-center font-bold text-black underline decoration-accent underline-offset-4 hover:bg-accent hover:text-white md:px-2">
          See all brands
        </Link>
      </div>
    </section>
  );
}
