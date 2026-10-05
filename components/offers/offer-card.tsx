import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { formatOfferEnd, offerShopHref } from "@/lib/offers/helpers";
import type { Offer } from "@/lib/offers/types";

export type OfferTone = "sticker" | "green" | "black" | "yellow";

export const TONES: Record<OfferTone, string> = {
  sticker: "bg-green text-white",
  green: "bg-green text-white",
  black: "bg-ink text-white",
  yellow: "bg-gold text-black",
};

/** Tile colour from the badge wording: "4 for 3" green sticker, discounts green, gift cards black, the rest yellow. */
export function offerTone(badge: string): OfferTone {
  const b = badge.toLowerCase();
  if (b.split(/\s+/).includes("for")) return "sticker";
  if (/%|\$|off/.test(b)) return "green";
  if (/gift|premium|new/.test(b)) return "black";
  return "yellow";
}

/**
 * One offer as real HTML (not a poster image): brand, what you get, end date,
 * the code when there is one, a terms disclosure and "Shop this offer".
 *
 * Terms use a native `<details>` so they work without JavaScript and are
 * keyboard operable by default. Terms text is plain text from the API.
 */
export function OfferCard({
  offer,
  endsSoon = false,
  headingLevel = 3,
  compact = false,
  className,
}: {
  offer: Offer;
  endsSoon?: boolean;
  headingLevel?: 2 | 3;
  /** Home row: no terms disclosure, so cards stay one height. Terms are on the detail page. */
  compact?: boolean;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const tone = offerTone(offer.badge_text);
  return (
    <article
      data-testid="offer-card"
      data-offer-slug={offer.slug}
      className={cx("flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-rest", className)}
    >
      {/* Promo tile: the badge is real text, not baked into an image. */}
      <div className={cx("relative flex min-h-[124px] flex-col justify-between gap-3 p-5", TONES[tone])}>
        <span className="text-[34px] font-extrabold leading-none tracking-[-1.5px]">{offer.badge_text}</span>
        <span className="flex flex-wrap items-center gap-2">
          {endsSoon && <Badge tone="gold" className="ring-1 ring-black">Ends soon</Badge>}
          {offer.brand && <span className="text-sm font-bold">{offer.brand.name}</span>}
        </span>
      </div>

      <div className="flex grow flex-col gap-3 p-5">
        <div className="flex grow flex-col gap-1.5">
          <Heading className="type-h3">{offer.title}</Heading>
          <p className="font-semibold text-ink">{offer.discount_description}</p>
          {offer.summary && <p className="text-muted">{offer.summary}</p>}
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="sr-only">End date</dt>
            <dd className="font-medium text-ink">{formatOfferEnd(offer.ends_at)}</dd>
          </div>
          {offer.code && (
            <div className="flex items-center gap-1.5">
              <dt className="text-muted">Code</dt>
              <dd className="rounded bg-chip px-2 py-0.5 font-mono font-semibold text-ink">{offer.code}</dd>
            </div>
          )}
          {offer.zone_ids.length > 0 && (
            <div>
              <dt className="sr-only">Where it applies</dt>
              <dd className="text-muted">Selected areas only</dd>
            </div>
          )}
        </dl>

        {offer.terms && !compact && (
          <details className="group rounded-control border border-line px-3 text-sm">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              Terms and conditions
              <span aria-hidden="true" className="text-lg leading-none transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="whitespace-pre-line pb-3 text-muted">{offer.terms}</p>
          </details>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href={offerShopHref(offer)} className={buttonClassName({ size: "sm" })}>
            Shop this offer
          </Link>
          <Link
            href={`/deals/${offer.slug}`}
            aria-label={`Details for ${offer.title}`}
            className="inline-flex min-h-11 items-center font-bold text-black underline decoration-gold decoration-[3px] underline-offset-4 hover:text-muted"
          >
            Offer details
          </Link>
        </div>
      </div>
    </article>
  );
}
