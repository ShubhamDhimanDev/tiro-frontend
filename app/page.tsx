import type { Metadata } from "next";
import { isRegoEnabled } from "@/lib/rego/flag";
import { loadHomeBrands, loadHomeCities, loadHomeOffers, loadHomeReviews } from "@/lib/home/load";
import { Reveal } from "@/components/motion/reveal";
import { Hero } from "@/components/home/hero";
import { UspStrip } from "@/components/home/usp-strip";
import { OffersCarousel } from "@/components/home/offers-carousel";
import { BrandsBand } from "@/components/home/brands-band";
import { DealsOnline } from "@/components/home/deals-online";
import { HowItWorks } from "@/components/home/how-it-works";
import { CoreServices } from "@/components/home/core-services";
import { Newsletter } from "@/components/home/newsletter";
import { FlexibleBanner } from "@/components/home/flexible-banner";
import { CoverageChecker } from "@/components/home/coverage-checker";
import { ReviewsSection } from "@/components/home/reviews";
import { TrustStrip } from "@/components/home/trust-strip";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import { PHONE_HREF, SITE_NAME, TAGLINE } from "@/lib/site/config";
import { SITE_URL } from "@/lib/site/url";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | Mobile tyre fitting, we come to you` },
  description: "Mobile tyre fitting at your home or work. Search by size or vehicle, compare brands at a fitted price, and book a time that suits you.",
  alternates: { canonical: "/" },
  openGraph: { title: `${SITE_NAME} | ${TAGLINE}`, url: "/", type: "website" },
};

/**
 * Homepage (ISR, 15 min). Live data: offers (`GET /offers`), brands
 * (`GET /brands`), the served-city tree (`GET /locations`) and Google reviews
 * (`GET /reviews`). Every loader fails soft, so each data-driven section simply
 * hides when the API is down or empty; the finder, services and how-it-works
 * copy are static and always render.
 *
 * No `aggregateRating` in the JSON-LD: Google does not allow self-served
 * ratings on Organization/LocalBusiness markup, and the figure shown on the
 * page is the API's own summary, displayed for people only.
 */
export const revalidate = 900;

export default async function Home() {
  const [offers, brands, cities, reviews] = await Promise.all([
    loadHomeOffers(),
    loadHomeBrands(),
    loadHomeCities(),
    loadHomeReviews(),
  ]);

  return (
    <div className="flex flex-col">
      <OrganizationJsonLd name={SITE_NAME} url={SITE_URL} telephone={PHONE_HREF.replace("tel:", "")} />

      <Hero regoEnabled={isRegoEnabled()} />
      <UspStrip summary={reviews.summary} />

      {offers.length > 0 && (
        <Reveal>
          <section aria-labelledby="offers-heading" className="container-page pt-[50px] lg:pt-20">
            <OffersCarousel offers={offers} />
          </section>
        </Reveal>
      )}

      <Reveal><ReviewsSection data={reviews} /></Reveal>
      <TrustStrip />
      <Reveal><BrandsBand brands={brands} /></Reveal>
      <Reveal><DealsOnline /></Reveal>
      <Reveal><HowItWorks /></Reveal>
      <Reveal><CoreServices /></Reveal>
      <Reveal><Newsletter /></Reveal>
      <Reveal><FlexibleBanner /></Reveal>

      <Reveal>
        <section
          aria-labelledby="coverage-heading"
          className="mt-[50px] bg-gradient-to-b from-[#4a4a4a] to-[#141414] py-[50px] lg:mt-20 lg:py-20"
        >
          <div className="container-page">
            <CoverageChecker cities={cities} />
          </div>
        </section>
      </Reveal>

    </div>
  );
}
