import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site/seo";
import Link from "next/link";
import { ContentSummaryCard } from "@/components/content/content-summary-card";
import { HomeSection } from "@/components/home/home-section";
import { OffersHub, type HubOffer } from "@/components/offers/offers-hub";
import { CtaBands } from "@/components/page/cta-bands";
import { FeatureBand } from "@/components/page/feature-band";
import { infoIcon } from "@/components/page/info-icons";
import { PageHero } from "@/components/layout/page-hero";
import { Mark } from "@/components/page/page-hero";
import { buttonClassName } from "@/components/ui/button";
import { contentBackend } from "@/lib/content/backend";
import { contentTypeListingTag } from "@/lib/content/tags";
import type { ContentPagesResponse } from "@/lib/content/types";
import { isEndingSoon } from "@/lib/offers/helpers";
import { loadOffersOrSample } from "@/lib/offers/sample";
import { SAMPLE_NOTE } from "@/lib/site/sample";

export const metadata: Metadata = pageMetadata({
  title: "Deals and offers | Tiro Mobile Tyres",
  description: "Current tyre offers with the brand, what you get, the end date and the terms. Plus our price guarantee, payment options and delivery promise.",
  path: "/deals",
});

export const revalidate = 900; // literal on purpose: Next reads segment config statically. Matches OFFERS_REVALIDATE.

async function loadPromotionPages() {
  const result = await contentBackend.pages(new URLSearchParams({ type: "promo_landing", per_page: "24" }), {
    next: { revalidate: 3600, tags: [contentTypeListingTag("promo_landing")] },
  });
  if (result.status !== 200) return [];
  return (result.body as ContentPagesResponse).data;
}

const crumbs = [
  { name: "Home", url: "/" },
  { name: "Deals", url: "/deals" },
];

export default async function DealsPage() {
  const [{ offers, sample }, promotionPages] = await Promise.all([loadOffersOrSample(), loadPromotionPages()]);
  const hubOffers: HubOffer[] = offers.map((o) => ({ ...o, endsSoon: isEndingSoon(o) }));

  return (
    <>
      <PageHero
        crumbs={crumbs}
        eyebrow="Deals"
        title={
          <>
            Deals and <Mark>offers</Mark>
          </>
        }
        intro="What is on now, when it ends and the fine print. Pick an offer and we take you to the tyres it covers."
        actions={
          <>
            <Link href="/tyres" className={buttonClassName({ variant: "green" })}>
              Shop tyres
            </Link>
            <Link href="/price-guarantee" className={buttonClassName({ variant: "yellow" })}>
              Price guarantee
            </Link>
          </>
        }
      />

      <HomeSection id="offers" title="Current offers" className="!pt-6 lg:!pt-8">
        {hubOffers.length > 0 ? (
          <OffersHub offers={hubOffers} />
        ) : (
          <div data-testid="offers-empty" className="flex max-w-xl flex-col items-start gap-3 rounded-card border border-line bg-surface p-6 shadow-rest">
            <h3 className="type-h3">No offers running right now</h3>
            <p className="text-muted">New offers appear here as soon as they start. In the meantime our price guarantee still applies.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/tyres" className={buttonClassName({ size: "sm" })}>
                Shop tyres
              </Link>
              <Link href="/price-guarantee" className={buttonClassName({ variant: "secondary", size: "sm" })}>
                Price guarantee
              </Link>
            </div>
          </div>
        )}
        {sample && (
          <p data-testid="sample-note" className="mt-4 text-xs text-muted">
            {SAMPLE_NOTE}
          </p>
        )}
      </HomeSection>

      {promotionPages.length > 0 && (
        <HomeSection id="promos" title="More promotions">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {promotionPages.map((p) => (
              <ContentSummaryCard key={p.slug} item={p} href={`/promotions/${p.slug}`} />
            ))}
          </div>
        </HomeSection>
      )}

      <HomeSection id="ways" title="Ways to save" className="pb-8">
        <p className="max-w-2xl text-lg text-muted">Every price already includes fitting. These are the ways to bring it down further.</p>
      </HomeSection>
      <FeatureBand
        id="price-guarantee"
        title="Price guarantee"
        image="offers-price-guarantee"
        icon={infoIcon("shield")}
        href="/price-guarantee"
        cta="Learn more"
        tone="grey"
      >
        <p>Found the same tyre for less with fitting included? Send us the link and we will review it and match it where we can.</p>
      </FeatureBand>
      <FeatureBand
        id="flexible-booking"
        title="Flexible booking discount"
        image="offers-flexible"
        icon={infoIcon("calendar")}
        href="/delivery-promise"
        cta="How booking works"
        flip
      >
        <p>Be available any time between 8am and 5pm and take $10 off your fitting. We fit you in around our other jobs.</p>
      </FeatureBand>
      <FeatureBand
        id="payment-options"
        title="Payment options"
        image="offers-payment"
        icon={infoIcon("card")}
        href="/payment-options"
        cta="See payment options"
        tone="grey"
      >
        <p>Pay by card, spread the cost with pay-later, or pay by card when we arrive. The total you see is the total you pay.</p>
      </FeatureBand>
      <FeatureBand
        id="delivery-promise"
        title="Delivery promise"
        image="offers-delivery"
        icon={infoIcon("clock")}
        href="/delivery-promise"
        cta="Read the promise"
        flip
      >
        <p>Tyres and technician arrive together, in the window you chose. Often next day, depending on stock and the van schedule.</p>
      </FeatureBand>

      <CtaBands />
    </>
  );
}
