import type { Metadata } from "next";
import { NOT_FOUND_METADATA, pageMetadata } from "@/lib/site/seo";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cityHref, flattenCities } from "@/lib/locations/helpers";
import { loadLocationTreeOrSample } from "@/lib/locations/sample";
import { contentBackend } from "@/lib/content/backend";
import { contentPageDetailTag, contentTypeListingTag } from "@/lib/content/tags";
import { resolveMetaDescription, resolveMetaTitle, resolveOgImage } from "@/lib/content/seo";
import { Prose } from "@/components/content/prose";
import { FaqBlock } from "@/components/content/faq-block";
import { HomeSection } from "@/components/home/home-section";
import { UspStrip } from "@/components/home/usp-strip";
import { LocationCaptureForm } from "@/components/location/location-capture-form";
import { InlineSizeFinder } from "@/components/catalog/inline-size-finder";
import { CtaBands } from "@/components/page/cta-bands";
import { Mark, PageHero } from "@/components/page/page-hero";
import { LocalBusinessJsonLd } from "@/components/seo/json-ld";
import { ArrowRightIcon, CheckIcon, PinIcon } from "@/components/ui/icons";
import { isStubBody } from "@/lib/content/guards";
import { withHeadingIds } from "@/lib/content/prose";
import { LOCATION_USPS } from "@/lib/site/location-copy";
import { SAMPLE_NOTE } from "@/lib/site/sample";
import type { ContentPageDetail, ContentPageDetailResponse, ContentPagesResponse } from "@/lib/content/types";

/**
 * `/locations/{slug}`: two kinds of page share this one dynamic segment.
 *
 * 1. A CMS-authored location page (`GET /api/v1/content/pages/location_page/{slug}`),
 *    SSG/ISR, with `LocalBusiness` structured data.
 * 2. A STATE page (`/locations/vic`): the cities we serve in that state, from
 *    the location tree (marked sample data while the API has none). State
 *    slugs are checked only when no CMS page matches.
 *
 * Old-style city URLs (`/locations/melbourne`, `/locations/vic-melbourne`)
 * permanently redirect to `/locations/{state}/{city}`.
 *
 * The "check serviceability here" widget renders only when the CMS page links
 * a `service_zone` (an unserviced-yet "coming soon" page has none).
 */

export const dynamicParams = true;
export const revalidate = 3600;

async function loadLocationPage(slug: string): Promise<ContentPageDetail | null> {
  const result = await contentBackend.pageDetail("location_page", slug, {
    next: { revalidate: 3600, tags: [contentPageDetailTag("location_page", slug)] },
  });
  if (result.status !== 200) return null;
  return (result.body as ContentPageDetailResponse).data;
}

export async function generateStaticParams() {
  const result = await contentBackend.pages(new URLSearchParams({ type: "location_page", per_page: "100" }), {
    next: { tags: [contentTypeListingTag("location_page")] },
  });
  const cms = result.status === 200 ? (result.body as ContentPagesResponse).data.map((page) => ({ slug: page.slug })) : [];
  const states = (await loadLocationTreeOrSample()).tree.map((s) => ({ slug: s.slug }));
  return [...cms, ...states];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadLocationPage(slug);
  if (!page) {
    const state = (await loadLocationTreeOrSample()).tree.find((s) => s.slug === slug);
    if (!state) return NOT_FOUND_METADATA;
    return pageMetadata({ title: `Mobile tyre fitting in ${state.name}`, description: `The cities and suburbs in ${state.name} where Tiro Mobile Tyres fits tyres at your home or work.`, path: `/locations/${state.slug}` });
  }

  const ogImage = resolveOgImage(page);
  return pageMetadata({
    title: resolveMetaTitle(page),
    description: resolveMetaDescription(page),
    path: `/locations/${page.slug}`,
    image: ogImage,
    type: "website",
  });
}

export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await loadLocationPage(slug);
  if (!page) {
    const { tree, sample } = await loadLocationTreeOrSample();
    const state = tree.find((s) => s.slug === slug);
    if (state) return <StatePage state={state} sample={sample} />;
    // Old-style URLs (/locations/melbourne, /locations/vic-melbourne) now live under state/city.
    const match = flattenCities(tree).find(({ state: st, city }) => slug === city.slug || slug === `${st.slug}-${city.slug}`);
    if (match) permanentRedirect(match.href);
    notFound();
  }

  const areaServed = page.service_zone?.name ?? page.title;
  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Where we go", url: "/locations" },
    { name: page.title, url: `/locations/${page.slug}` },
  ];
  const { html } = withHeadingIds(page.body);

  return (
    <div>
      <LocalBusinessJsonLd
        name={`Tiro Mobile Tyres — ${areaServed}`}
        areaServed={areaServed}
        url={`/locations/${page.slug}`}
        description={page.excerpt ?? undefined}
      />

      <PageHero crumbs={crumbs} eyebrow="Mobile tyre fitting" title={page.title} lead={page.excerpt ?? undefined}>
        <ul className="flex max-w-2xl flex-col gap-2 pt-1">
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

      <div className="container-page grid gap-10 pt-[50px] lg:grid-cols-[minmax(0,1fr)_22rem] lg:pt-20">
        <div className="flex min-w-0 flex-col gap-10 lg:order-1">
          {!isStubBody(html) && <Prose html={html} className="max-w-[68ch]" />}

          {page.service_zone && (
            <section aria-labelledby="areas-heading" className="max-w-[68ch]">
              <h2 id="areas-heading" className="type-h3">
                Where we service
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                <li className="inline-flex min-h-10 items-center rounded-full bg-chip px-4 text-sm font-medium">{page.service_zone.name}</li>
              </ul>
            </section>
          )}

          <div className="max-w-[68ch]">
            <FaqBlock contentPageId={page.id} />
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          {page.service_zone && (
            <section className="rounded-card border border-line bg-surface p-5 shadow-rest">
              <h2 className="type-h3">Check we service your address</h2>
              <p className="mt-1 text-muted">
                We currently service the {page.service_zone.name} area. Enter your suburb or postcode to confirm mobile fitting is
                available near you.
              </p>
              <div className="mt-4">
                <LocationCaptureForm />
              </div>
            </section>
          )}
          <div className="rounded-card border border-line bg-surface p-5 shadow-rest">
            <InlineSizeFinder />
          </div>
        </aside>
      </div>
      <CtaBands className="mt-[50px] lg:mt-20" />
    </div>
  );
}

type TreeState = Awaited<ReturnType<typeof loadLocationTreeOrSample>>["tree"][number];

/** State level of state > city > suburb: a link to every city we serve in the state. */
function StatePage({ state, sample }: { state: TreeState; sample: boolean }) {
  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Where we go", url: "/locations" },
    { name: state.name, url: `/locations/${state.slug}` },
  ];
  return (
    <div>
      <PageHero
        crumbs={crumbs}
        eyebrow="Mobile tyre fitting"
        title={
          <>
            Mobile tyres in <Mark>{state.name}</Mark>
          </>
        }
        lead={`We come to you in ${state.city_count} ${state.city_count === 1 ? "city" : "cities"} across ${state.name}. Choose yours to see coverage, fitting hours and suburbs.`}
        aside={
          <section aria-labelledby="state-check-heading" className="flex flex-col gap-4 rounded-card bg-surface p-5 text-black shadow-raised md:p-6">
            <h2 id="state-check-heading" className="type-h3">
              Check your suburb
            </h2>
            <LocationCaptureForm />
          </section>
        }
      />
      <UspStrip />
      <HomeSection id="cities" title={`Cities we service in ${state.name}`} className="pb-[50px] lg:pb-20">
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
                  {city.suburbs.length > 0 && <>, including {city.suburbs.slice(0, 4).map((s) => s.name).join(", ")}</>}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-black group-hover:underline">
                  See {city.name}
                  <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {sample && (
          <p data-testid="sample-note" className="mt-6 text-xs text-muted">
            {SAMPLE_NOTE}
          </p>
        )}
      </HomeSection>
      <CtaBands />
    </div>
  );
}
