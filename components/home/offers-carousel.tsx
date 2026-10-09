"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArticleImage } from "@/components/content/article-image";
import { buttonClassName } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";
import { formatOfferEnd, offerImageSrc } from "@/lib/offers/helpers";
import type { Offer } from "@/lib/offers/types";

/** Tile colours rotate by position: the API carries no colour, so this is presentation only. */
const TONES = [
  { bg: "bg-black text-white", cta: "bg-gold text-black" },
  { bg: "bg-gold text-black", cta: "bg-black text-white" },
  { bg: "bg-green text-white", cta: "bg-gold text-black" },
  { bg: "bg-black text-gold", cta: "bg-gold text-black" },
] as const;

/**
 * "Latest offers" carousel fed by `GET /offers`: native scroll-snap row (about
 * 1.3 tiles visible on a phone, 4 on desktop) with prev/next buttons. Offer
 * text is real HTML by default. An offer with a feature image shows that
 * image on its own as the whole tile (the artwork carries the headline), with
 * the offer text kept for screen readers. Renders nothing when there are no
 * live offers (the page hides the whole section).
 */
export function OffersCarousel({ offers }: { offers: Offer[] }) {
  const rowRef = useRef<HTMLUListElement>(null);

  if (offers.length === 0) return null;

  function scrollByTile(dir: 1 | -1) {
    const row = rowRef.current;
    if (!row) return;
    const tile = row.querySelector<HTMLElement>("li");
    const step = (tile?.offsetWidth ?? 260) + 16;
    row.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  const arrow =
    "flex h-11 w-11 items-center justify-center rounded-full border border-field bg-surface text-black transition-colors duration-300 hover:bg-black hover:text-white";

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4 lg:mb-8">
        <h2 id="offers-heading" className="type-h2">
          Latest offers
        </h2>
        <div className="hidden gap-2 md:flex">
          <button type="button" aria-label="Previous offers" onClick={() => scrollByTile(-1)} className={arrow}>
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Next offers" onClick={() => scrollByTile(1)} className={arrow}>
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <ul
        ref={rowRef}
        tabIndex={0}
        aria-label="Current offers"
        className="no-scrollbar -mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[var(--gutter)] px-[var(--gutter)] pb-3"
      >
        {offers.map((offer, i) => {
          const tone = TONES[i % TONES.length];
          const image = offerImageSrc(offer);
          const text = (
            <>
              <span className="text-4xl font-extrabold leading-none tracking-[-1.5px]">{offer.badge_text}</span>
              <span className="flex flex-col gap-1">
                <span className="text-lg font-bold leading-tight">{offer.title}</span>
                {offer.summary && <span className="line-clamp-3 text-sm leading-snug opacity-90">{offer.summary}</span>}
                <span className="text-xs font-medium opacity-80">{formatOfferEnd(offer.ends_at)}</span>
                <span className={cx("mt-3 inline-flex min-h-11 w-fit items-center rounded-control px-4 text-[15px] font-bold", tone.cta)}>
                  View offer
                </span>
              </span>
            </>
          );
          return (
            <li key={offer.slug} className="flex w-[74%] shrink-0 snap-start sm:w-[44%] md:w-[31%] lg:w-[calc((100%-48px)/4)]">
              {image ? (
                <Link
                  href={`/deals/${offer.slug}`}
                  className={cx(
                    "flex aspect-square w-full flex-col justify-between overflow-hidden rounded-card shadow-rest transition-transform duration-300 hover:-translate-y-0.5",
                    tone.bg,
                  )}
                >
                  <ArticleImage
                    src={image}
                    className="h-full w-full object-cover"
                    fallback={<span className="flex h-full flex-col justify-between p-5">{text}</span>}
                  />
                  <span className="sr-only">
                    {offer.title}. {offer.discount_description}. {formatOfferEnd(offer.ends_at)}. View offer
                  </span>
                </Link>
              ) : (
                <Link
                  href={`/deals/${offer.slug}`}
                  className={cx(
                    "flex min-h-[280px] w-full flex-col justify-between rounded-card p-5 shadow-rest transition-transform duration-300 hover:-translate-y-0.5",
                    tone.bg,
                  )}
                >
                  {text}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <Link href="/deals" className={buttonClassName({ variant: "ghost", size: "sm", className: "mt-2 -ml-4" })}>
        View all offers
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}
