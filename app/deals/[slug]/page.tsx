import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleImage } from "@/components/content/article-image";
import { HomeSection } from "@/components/home/home-section";
import { offerTone, TONES } from "@/components/offers/offer-card";
import { CtaBands } from "@/components/page/cta-bands";
import { PageHero } from "@/components/page/page-hero";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { formatOfferDate, formatOfferEnd, isEndingSoon, offerImageSrc, offerShopHref } from "@/lib/offers/helpers";
import { OfferJsonLd } from "@/components/seo/json-ld";
import { NOT_FOUND_METADATA, pageMetadata } from "@/lib/site/seo";
import { SITE_NAME } from "@/lib/site/config";
import { loadOffers } from "@/lib/offers/load";
import { buildSampleOffers, loadOfferOrSample } from "@/lib/offers/sample";
import { SAMPLE_CONTENT_ENABLED, SAMPLE_NOTE } from "@/lib/site/sample";

/**
 * Offer detail, ISR. `GET /api/v1/offers/{slug}` returns 404 for an offer that
 * is unknown, not public, ended or used up, and so does this page: an ended
 * offer drops off within the revalidate window rather than staying live.
 * While the API has no offers, the marked sample offers (lib/offers/sample.ts)
 * resolve here too, for design review.
 */
export const dynamicParams = true;
export const revalidate = 900; // literal on purpose: Next reads segment config statically. Matches OFFERS_REVALIDATE.

export async function generateStaticParams() {
  const live = await loadOffers();
  const slugs = live.map((o) => o.slug);
  if (live.length === 0 && SAMPLE_CONTENT_ENABLED) slugs.push(...buildSampleOffers().map((o) => o.slug));
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hit = await loadOfferOrSample(slug);
  if (!hit) return NOT_FOUND_METADATA;
  const { offer } = hit;
  return pageMetadata({ title: offer.title, description: offer.summary ?? `${offer.discount_description}. ${formatOfferEnd(offer.ends_at)}.`, path: `/deals/${offer.slug}` });
}

export default async function OfferDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hit = await loadOfferOrSample(slug);
  if (!hit) notFound();
  const { offer, sample } = hit;
  const image = offerImageSrc(offer);

  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Deals", url: "/deals" },
    { name: offer.title, url: `/deals/${offer.slug}` },
  ];

  return (
    <>
      {!sample && (
        <OfferJsonLd
          name={offer.title}
          description={offer.summary ?? offer.discount_description}
          url={`/deals/${offer.slug}`}
          validFrom={offer.starts_at}
          validThrough={offer.ends_at}
          seller={SITE_NAME}
        />
      )}
      <PageHero
        crumbs={crumbs}
        title={offer.title}
        lead={
          <>
            <span className="block font-bold text-white">{offer.discount_description}</span>
            {offer.summary && <span className="mt-1 block">{offer.summary}</span>}
          </>
        }
        actions={
          <>
            <Link href={offerShopHref(offer)} className={buttonClassName({ variant: "green" })}>
              Shop this offer
            </Link>
            <Link href="/deals" className={buttonClassName({ variant: "yellow" })}>
              All offers
            </Link>
          </>
        }
        aside={
          image ? (
            <div className="mx-auto hidden aspect-square w-full max-w-[420px] overflow-hidden rounded-card shadow-raised lg:block">
              <ArticleImage src={image} className="h-full w-full object-cover" fallback={<span className="block h-full w-full bg-chip" />} />
            </div>
          ) : (
            <div
              className={cx(
                "mx-auto hidden aspect-[4/3] w-full max-w-[420px] flex-col justify-between rounded-card p-6 shadow-raised lg:flex",
                TONES[offerTone(offer.badge_text)],
              )}
            >
              <span className="text-[56px] font-extrabold leading-none tracking-[-2px]">{offer.badge_text}</span>
              <span className="flex flex-wrap items-center gap-2 text-lg font-bold">
                {isEndingSoon(offer) && <Badge tone="gold" className="ring-1 ring-black">Ends soon</Badge>}
                {offer.brand?.name}
              </span>
            </div>
          )
        }
      />

      <div className="container-page flex max-w-4xl flex-col gap-8 pt-[50px] lg:pt-20">
        {image && (
          <div className="aspect-square w-full max-w-[420px] overflow-hidden rounded-card shadow-rest lg:hidden">
            <ArticleImage src={image} className="h-full w-full object-cover" fallback={<span className="block h-full w-full bg-chip" />} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 lg:hidden">
          <Badge tone="gold" className="uppercase tracking-wide">
            {offer.badge_text}
          </Badge>
          {isEndingSoon(offer) && <Badge tone="gold" className="ring-1 ring-black">Ends soon</Badge>}
          {offer.brand && <span className="text-sm font-bold text-muted">{offer.brand.name}</span>}
        </div>

        <dl className="grid gap-4 rounded-card border border-line bg-surface p-5 shadow-rest sm:grid-cols-2">
          <div>
            <dt className="type-eyebrow font-bold uppercase text-muted">Runs</dt>
            <dd className="font-bold text-ink">
              {formatOfferDate(offer.starts_at)} to {formatOfferDate(offer.ends_at)}
            </dd>
          </div>
          <div>
            <dt className="type-eyebrow font-bold uppercase text-muted">Where</dt>
            <dd className="font-bold text-ink">{offer.zone_ids.length === 0 ? "Every area we service" : "Selected areas only"}</dd>
          </div>
          {offer.code && (
            <div className="sm:col-span-2">
              <dt className="type-eyebrow font-bold uppercase text-muted">Your code</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-3">
                <span data-testid="offer-code" className="rounded-control bg-gold px-3 py-1 font-mono text-lg font-bold text-black">
                  {offer.code}
                </span>
                <span className="text-sm text-muted">Add your tyres to the cart, then enter the code there.</span>
              </dd>
            </div>
          )}
        </dl>

        <section aria-labelledby="terms-heading" className="flex flex-col gap-2 border-t border-line pt-6">
          <h2 id="terms-heading" className="type-h3">
            Terms and conditions
          </h2>
          {offer.terms ? (
            <p className="max-w-[68ch] whitespace-pre-line text-muted">{offer.terms}</p>
          ) : (
            <p className="max-w-[68ch] text-muted">No extra conditions are listed for this offer. It runs until {formatOfferDate(offer.ends_at)}.</p>
          )}
        </section>
        {sample && <p className="text-xs text-muted">{SAMPLE_NOTE}</p>}
      </div>

      <HomeSection id="more" title="More ways to save" className="pb-[50px] lg:pb-20">
        <div className="flex flex-wrap gap-3">
          <Link href="/price-guarantee" className={buttonClassName({ variant: "secondary" })}>
            Price guarantee
          </Link>
          <Link href="/payment-options" className={buttonClassName({ variant: "secondary" })}>
            Payment options
          </Link>
          <Link href="/delivery-promise" className={buttonClassName({ variant: "secondary" })}>
            Delivery promise
          </Link>
        </div>
      </HomeSection>
      <CtaBands />
    </>
  );
}
