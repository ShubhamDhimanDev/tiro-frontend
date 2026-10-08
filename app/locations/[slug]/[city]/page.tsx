import type { Metadata } from "next";
import { NOT_FOUND_METADATA, pageMetadata } from "@/lib/site/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroFinder } from "@/components/home/hero-finder";
import { HomeSection } from "@/components/home/home-section";
import { UspStrip } from "@/components/home/usp-strip";
import { FaqBlock } from "@/components/content/faq-block";
import { Prose } from "@/components/content/prose";
import { CityAreaButton } from "@/components/locations/city-area-button";
import { CityPhoto } from "@/components/locations/city-photo";
import { CitySuburbs } from "@/components/locations/city-suburbs";
import { CtaBands } from "@/components/page/cta-bands";
import { Mark, PageHero } from "@/components/page/page-hero";
import { ReviewCard } from "@/components/reviews/review-card";
import { LocalBusinessJsonLd, type OpeningHoursSpec } from "@/components/seo/json-ld";
import { buttonClassName } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { isStubBody } from "@/lib/content/guards";
import { withHeadingIds } from "@/lib/content/prose";
import { isRegoEnabled } from "@/lib/rego/flag";
import { summariseHours } from "@/lib/locations/format";
import { cityHref, flattenCities } from "@/lib/locations/helpers";
import { loadCityDetail } from "@/lib/locations/load-city";
import { loadLocationTreeOrSample } from "@/lib/locations/sample";
import type { CoverageZone } from "@/lib/locations/types";
import { reviewsBackend } from "@/lib/reviews/backend";
import { reviewsTag } from "@/lib/reviews/tags";
import type { Review, ReviewsResponse } from "@/lib/reviews/types";
import { PHONE_DISPLAY } from "@/lib/site/config";
import { LOCATION_USPS } from "@/lib/site/location-copy";
import { SAMPLE_NOTE } from "@/lib/site/sample";

/**
 * City page: `/locations/{state}/{city}`, SSG + ISR from
 * `GET /api/v1/locations/{state}/{city}` (marked sample data while the API has
 * no locations, see lib/locations/sample.ts). The old CMS-backed
 * `/locations/[slug]` route still exists for authored pages; when a CMS page
 * is linked to this city, its body is shown here as the "About" copy.
 *
 * Suburb pages live one level down (`/locations/{state}/{city}/{suburb}`),
 * built from this same city payload because the API has no suburb detail.
 */
export const dynamicParams = true;
export const revalidate = 3600;

// The first segment must be named `slug`: Next requires one param name per dynamic path, and
// `/locations/[slug]` (the CMS page route) already owns it. Here it holds the state slug.
type Params = Promise<{ slug: string; city: string }>;

export async function generateStaticParams() {
  return flattenCities((await loadLocationTreeOrSample()).tree).map(({ state, city }) => ({ slug: state.slug, city: city.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug: state, city } = await params;
  const detail = (await loadCityDetail(state, city))?.detail;
  if (!detail) return NOT_FOUND_METADATA;
  const place = `${detail.city.name}, ${detail.state.code}`;
  return pageMetadata({
    title: detail.content?.meta_title ?? `Mobile tyre fitting in ${place}`,
    description:
      detail.content?.meta_description ??
      detail.content?.excerpt ??
      `Mobile tyre fitting in ${place}. Choose your tyres online and we fit them at your home or work, with balancing and old-tyre recycling included.`,
    path: cityHref(detail.state.slug, detail.city.slug),
  });
}

const DAY_CODES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const SCHEMA_DAYS: Record<(typeof DAY_CODES)[number], string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** schema.org hours from the primary zone: days with the same hours are grouped. */
function openingHoursSpec(zone: CoverageZone | undefined): OpeningHoursSpec[] {
  if (!zone) return [];
  const groups = new Map<string, OpeningHoursSpec>();
  for (const day of DAY_CODES) {
    const hours = zone.operating_hours[day];
    if (!hours) continue;
    const key = `${hours.open}-${hours.close}`;
    const group = groups.get(key) ?? { dayOfWeek: [], opens: hours.open, closes: hours.close };
    group.dayOfWeek.push(SCHEMA_DAYS[day]);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Google reviews are business-wide, so "local" means the text names this city or one of its suburbs. */
async function loadLocalReviews(cityName: string, suburbNames: string[]): Promise<Review[]> {
  const result = await reviewsBackend.list(new URLSearchParams({ per_page: "50" }), {
    next: { revalidate: 86400, tags: [reviewsTag()] },
  });
  if (result.status !== 200) return [];
  const names = [cityName, ...suburbNames].map((n) => n.toLowerCase()).filter((n) => n.length >= 4);
  return (result.body as ReviewsResponse).data
    .filter((r) => r.body && names.some((n) => r.body!.toLowerCase().includes(n)))
    .slice(0, 3);
}

export default async function CityPage({ params }: { params: Params }) {
  const { slug: stateSlug, city: citySlug } = await params;
  const loaded = await loadCityDetail(stateSlug, citySlug);
  if (!loaded) notFound();
  const { detail, sample } = loaded;

  const { state, city, suburbs, coverage, content } = detail;
  const place = `${city.name}, ${state.code}`;
  const path = cityHref(state.slug, city.slug);
  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Where we go", url: "/locations" },
    { name: state.name, url: `/locations/${state.slug}` },
    { name: city.name, url: path },
  ];

  const [{ tree }, localReviews] = await Promise.all([
    loadLocationTreeOrSample(),
    loadLocalReviews(city.name, suburbs.map((s) => s.name)),
  ]);
  const nearby = flattenCities(tree).filter((c) => c.href !== path && c.state.slug === state.slug);
  const otherStates = flattenCities(tree).filter((c) => c.state.slug !== state.slug).slice(0, 6);
  const primaryZone = coverage.zones.find((z) => z.id === city.service_zone_id) ?? coverage.zones[0];
  const hours = primaryZone ? summariseHours(primaryZone.operating_hours) : [];
  const { html } = content ? withHeadingIds(content.body) : { html: "" };
  const cityPostcode = suburbs.find((s) => s.name.toLowerCase() === city.name.toLowerCase())?.postcode ?? suburbs[0]?.postcode ?? null;

  return (
    <div>
      <LocalBusinessJsonLd
        name={`Tiro Mobile Tyres, ${city.name}`}
        areaServed={`${city.name}, ${state.name}`}
        url={path}
        description={content?.excerpt ?? `Mobile tyre fitting in ${place}, at your home or workplace.`}
        telephone={PHONE_DISPLAY}
        address={{ locality: city.name, region: state.code }}
        openingHours={openingHoursSpec(primaryZone)}
      />

      <PageHero
        crumbs={crumbs}
        eyebrow="Mobile tyre fitting"
        titleId="city-heading"
        title={
          <>
            {city.name}, <Mark>{state.name}</Mark>
          </>
        }
        lead={content?.excerpt ?? `We come to you in ${city.name}. Pick your tyres online, choose a time, and we fit them where you are.`}
        aside={<HeroFinder regoEnabled={isRegoEnabled()} defaultRegoState={state.code} />}
      >
        <ul aria-label={`Why choose us in ${city.name}`} className="flex max-w-xl flex-col gap-2 pt-1">
          {LOCATION_USPS.map((usp) => (
            <li key={usp} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-black">
                <CheckIcon className="h-4 w-4" />
              </span>
              <span>{usp}</span>
            </li>
          ))}
        </ul>
      </PageHero>
      <UspStrip />

      <HomeSection id="coverage" title={`How we cover ${city.name}`}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-5">
            {coverage.notes.length > 0 ? (
              <ul className="flex flex-col gap-2 text-lg text-muted">
                {coverage.notes.map((note) => (
                  <li key={note} className="flex gap-3">
                    <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {note}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-lg text-muted">We fit tyres at your home, workplace or another convenient spot across {city.name}.</p>
            )}
            {hours.length > 0 && (
              <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5 shadow-rest">
                <h3 className="type-h3">Fitting hours</h3>
                <ul className="flex flex-col gap-1 text-muted">
                  {hours.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="text-sm text-muted">Times you can actually book are shown at checkout.</p>
              </div>
            )}
            <CityAreaButton cityName={city.name} postcode={cityPostcode} />
          </div>
          <CityPhoto citySlug={city.slug} cityName={city.name} className="lg:min-h-[320px]" />
        </div>
      </HomeSection>

      <HomeSection id="suburbs" title={`Suburbs we service in ${city.name}`}>
        <CitySuburbs cityName={city.name} suburbs={suburbs} />
        {suburbs.length > 0 && (
          <details className="group mt-6 rounded-card border border-line bg-surface">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 font-bold [&::-webkit-details-marker]:hidden">
              Browse suburb pages
              <span aria-hidden="true" className="text-2xl leading-none transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <ul className="grid gap-x-6 gap-y-1 px-5 pb-4 sm:grid-cols-2 lg:grid-cols-3">
              {suburbs.map((s) => (
                <li key={`${s.slug}-${s.postcode}`}>
                  <Link href={`${path}/${s.slug}`} className="inline-flex min-h-11 items-center text-[15px] font-medium text-black underline-offset-4 hover:underline">
                    Tyres {s.name} <span className="ml-1 text-muted">{s.postcode}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
        {sample && (
          <p data-testid="sample-note" className="mt-4 text-xs text-muted">
            {SAMPLE_NOTE}
          </p>
        )}
      </HomeSection>

      {content && html && !isStubBody(html) && (
        <HomeSection id="about" title={content.title}>
          <Prose html={html} className="max-w-[68ch]" />
        </HomeSection>
      )}

      {localReviews.length > 0 && (
        <HomeSection id="local-reviews" title={`Customers who mentioned ${city.name}`}>
          <ul className="grid gap-4 md:grid-cols-3">
            {localReviews.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} compact className="h-full" />
              </li>
            ))}
          </ul>
        </HomeSection>
      )}

      <div className="container-page pt-[50px] lg:pt-20">
        <div className="max-w-[68ch]">
          <FaqBlock heading={`Questions about mobile fitting in ${city.name}`} limit={6} />
        </div>
      </div>

      <HomeSection id="areas" title="Other areas we service" className="pb-[50px] lg:pb-20">
        {nearby.length > 0 || otherStates.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {[...nearby, ...otherStates].map(({ state: s, city: c, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 text-[15px] font-bold text-black transition-colors hover:bg-black hover:text-white"
                >
                  {c.name}
                  <span className="ml-1.5 font-medium opacity-60">{s.code}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <Link href="/locations" className={buttonClassName({ variant: "secondary", size: "sm", className: "mt-5 w-fit" })}>
          All locations
        </Link>
      </HomeSection>
      <CtaBands />
    </div>
  );
}
