import type { Metadata } from "next";
import { loadHomeReviews } from "@/lib/home/load";
import { pageMetadata } from "@/lib/site/seo";
import Link from "next/link";
import { HowItWorks } from "@/components/home/how-it-works";
import { HomeSection } from "@/components/home/home-section";
import { ReviewsSection } from "@/components/home/reviews";
import { LocationCaptureForm } from "@/components/location/location-capture-form";
import { CtaBands } from "@/components/page/cta-bands";
import { FeatureBand } from "@/components/page/feature-band";
import { infoIcon } from "@/components/page/info-icons";
import { PageHero } from "@/components/layout/page-hero";
import { Mark } from "@/components/page/page-hero";
import { buttonClassName } from "@/components/ui/button";
import { ArrowRightIcon, PinIcon } from "@/components/ui/icons";
import { cityHref } from "@/lib/locations/helpers";
import { loadLocationTreeOrSample } from "@/lib/locations/sample";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";
import { SAMPLE_NOTE } from "@/lib/site/sample";

export const metadata: Metadata = pageMetadata({
  title: "Where we go | Tiro Mobile Tyres",
  description: "The states and cities where we fit tyres at your home or work. Check your suburb to see coverage, prices and stock.",
  path: "/locations",
});

export const revalidate = 3600;

const crumbs = [
  { name: "Home", url: "/" },
  { name: "Where we go", url: "/locations" },
];

export default async function LocationsPage() {
  const [{ tree, sample }, reviews] = await Promise.all([loadLocationTreeOrSample(), loadHomeReviews()]);

  return (
    <>
      <PageHero
        crumbs={crumbs}
        eyebrow="Coverage"
        title={
          <>
            Where we go: <Mark>we come to you</Mark>
          </>
        }
        intro="We fit tyres at your home, workplace or another convenient spot within our service areas. Choose your city, or enter your suburb to check."
      >
        <section aria-labelledby="check-heading" className="flex max-w-xl flex-col gap-4 rounded-card border border-line bg-surface p-5 text-black shadow-raised md:p-6">
          <h2 id="check-heading" className="type-h3">
            Check your suburb
          </h2>
          <LocationCaptureForm />
        </section>
      </PageHero>

      <HomeSection id="our-locations" title="Our locations">
        {tree.length > 0 ? (
          <>
            <nav aria-label="Jump to a state" className="mb-8 flex flex-wrap gap-2">
              {tree.map((state) => (
                <a
                  key={state.slug}
                  href={`#state-${state.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 text-[15px] font-bold text-black transition-colors hover:bg-black hover:text-white"
                >
                  {state.name}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-12">
              {tree.map((state) => (
                <section key={state.slug} id={`state-${state.slug}`} aria-labelledby={`state-${state.slug}-heading`} className="scroll-mt-24">
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
                    <h2 id={`state-${state.slug}-heading`} className="type-h2 !text-[28px]">
                      <Link href={`/locations/${state.slug}`} className="hover:underline">
                        {state.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted">
                      {state.city_count} {state.city_count === 1 ? "city" : "cities"}, {state.suburb_count}{" "}
                      {state.suburb_count === 1 ? "suburb" : "suburbs"}
                    </p>
                  </div>
                  <ul className={state.cities.length >= 3 ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-4 sm:grid-cols-2 lg:max-w-3xl"}>
                    {state.cities.map((city) => (
                      <li key={city.slug}>
                        <Link
                          href={cityHref(state.slug, city.slug)}
                          className="group flex h-full flex-col gap-2 rounded-card border border-line bg-surface p-5 shadow-rest transition-shadow hover:shadow-raised"
                        >
                          <span className="flex items-center gap-3">
                            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-black">
                              <PinIcon className="h-5 w-5" />
                            </span>
                            <span className="type-h3">{city.name}</span>
                          </span>
                          <span className="grow text-sm text-muted">
                            {city.suburb_count} {city.suburb_count === 1 ? "suburb" : "suburbs"}
                            {city.suburbs.length > 0 && <>, including {city.suburbs.slice(0, 3).map((s) => s.name).join(", ")}</>}
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-black group-hover:underline">
                            See {city.name}
                            <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            {sample && (
              <p data-testid="sample-note" className="mt-6 text-xs text-muted">
                {SAMPLE_NOTE}
              </p>
            )}
          </>
        ) : (
          <section data-testid="locations-empty" className="flex max-w-xl flex-col gap-3 rounded-card border border-line bg-surface p-6 shadow-rest">
            <h3 className="type-h3">Our city list is on its way</h3>
            <p className="text-muted">
              We cannot show the list of cities right now. Enter your suburb above to check coverage, or call us and we will tell you what is
              possible.
            </p>
          </section>
        )}
      </HomeSection>

      <div className="mt-[50px] lg:mt-20">
        <FeatureBand
          id="not-listed"
          title="Not sure, or outside the area?"
          image="location-map"
          icon={infoIcon("pin")}
          tone="grey"
          imageClassName="max-w-[460px]"
        >
          <p>
            Service areas are growing. Leave your email when you check a suburb we do not cover yet and we will tell you when we arrive, or call us on{" "}
            <a href={PHONE_HREF} className="font-bold text-black underline decoration-gold decoration-[3px] underline-offset-4">
              {PHONE_DISPLAY}
            </a>{" "}
            ({HOURS_LINE}).
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/contact" className={buttonClassName({ variant: "black" })}>
              Contact us
            </Link>
            <Link href="/booking" className={buttonClassName({ variant: "green" })}>
              Book a fitting
            </Link>
          </div>
        </FeatureBand>
      </div>

      <HowItWorks />
      <ReviewsSection data={reviews} />
      <CtaBands className="mt-[50px] lg:mt-20" />
    </>
  );
}
