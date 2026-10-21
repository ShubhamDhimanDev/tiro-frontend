import type { Metadata } from "next";
import { NOT_FOUND_METADATA, pageMetadata } from "@/lib/site/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeSection } from "@/components/home/home-section";
import { UspStrip } from "@/components/home/usp-strip";
import { CityAreaButton } from "@/components/locations/city-area-button";
import { CtaBands } from "@/components/page/cta-bands";
import { FaqSection } from "@/components/page/faq-section";
import { IconCards } from "@/components/page/icon-cards";
import { Mark, PageHero } from "@/components/page/page-hero";
import { LocalBusinessJsonLd } from "@/components/seo/json-ld";
import { buttonClassName } from "@/components/ui/button";
import { RecycleIcon, TruckIcon, WrenchIcon } from "@/components/ui/icons";
import { cityHref } from "@/lib/locations/helpers";
import { loadCityDetail } from "@/lib/locations/load-city";
import { PHONE_DISPLAY } from "@/lib/site/config";
import { SAMPLE_NOTE } from "@/lib/site/sample";

/**
 * Suburb page: `/locations/{state}/{city}/{suburb}`. The API has no suburb
 * detail, so this is built from the city payload (the suburb must be in that
 * city's list). Suburb pages are generated on demand and cached (ISR), not
 * pre-built, because there can be over a thousand of them.
 *
 * SEO: these pages are near-duplicates by nature, so each one canonicalises to
 * its city page until a suburb has a distinct signal (real depot, local
 * reviews, wait times). Do not remove the canonical without that content.
 */
export const dynamicParams = true;
export const revalidate = 3600;

type Params = Promise<{ slug: string; city: string; suburb: string }>;

export async function generateStaticParams() {
  return [];
}

async function load(params: Params) {
  const { slug, city, suburb } = await params;
  const loaded = await loadCityDetail(slug, city);
  if (!loaded) return null;
  const match = loaded.detail.suburbs.find((s) => s.slug === suburb);
  if (!match) return null;
  return { ...loaded, suburb: match };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const loaded = await load(params);
  if (!loaded) return NOT_FOUND_METADATA;
  const { detail, suburb } = loaded;
  return pageMetadata({ title: `Mobile tyre fitting in ${suburb.name} ${suburb.postcode}`, description: `Tyres fitted at your home or work in ${suburb.name}, ${detail.state.code} ${suburb.postcode}. Balancing, valves and old-tyre recycling included.`, path: cityHref(detail.state.slug, detail.city.slug) });
}

const FAQS = (suburb: string) => [
  {
    question: `Do you fit tyres at my home in ${suburb}?`,
    answer: `Yes. Our technicians come to your home, workplace or another safe, level spot in ${suburb}. Choose your tyres online and pick a time that suits you.`,
  },
  {
    question: "What is included in the price?",
    answer: "Fitting, wheel balancing, new valves and taking your old tyres away for recycling are all included in the price you see.",
  },
  {
    question: "Do I need to be home?",
    answer: "Not necessarily. As long as the car is accessible and we can reach the wheels, the technician can finish the job without you.",
  },
];

export default async function SuburbPage({ params }: { params: Params }) {
  const loaded = await load(params);
  if (!loaded) notFound();
  const { detail, suburb, sample } = loaded;
  const { state, city } = detail;
  const cityPath = cityHref(state.slug, city.slug);
  const path = `${cityPath}/${suburb.slug}`;
  const neighbours = detail.suburbs.filter((s) => s.slug !== suburb.slug).slice(0, 12);
  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Where we go", url: "/locations" },
    { name: state.name, url: `/locations/${state.slug}` },
    { name: city.name, url: cityPath },
    { name: suburb.name, url: path },
  ];

  return (
    <div>
      <LocalBusinessJsonLd
        name={`Tiro Mobile Tyres, ${suburb.name}`}
        areaServed={`${suburb.name}, ${state.name}`}
        url={path}
        description={`Mobile tyre fitting in ${suburb.name}, ${state.code} ${suburb.postcode}.`}
        telephone={PHONE_DISPLAY}
        address={{ locality: suburb.name, region: state.code }}
      />
      <PageHero
        crumbs={crumbs}
        eyebrow={`${suburb.postcode} · ${city.name}`}
        title={
          <>
            Tyres {suburb.name} locals trust, <Mark>fitted at your place</Mark>
          </>
        }
        lead={`Choose your tyres online and our technician fits them at your home or work in ${suburb.name}, ${state.code}. Balancing, valves and old-tyre recycling included.`}
        actions={
          <>
            <Link href="/tyres" className={buttonClassName({ variant: "green" })}>
              Search tyres
            </Link>
            <Link href="/booking" className={buttonClassName({ variant: "yellow" })}>
              Book a fitting
            </Link>
          </>
        }
      />
      <UspStrip />

      <HomeSection id="include" title={`Mobile tyre service in ${suburb.name}`}>
        <IconCards
          items={[
            { icon: <TruckIcon />, title: "We come to you", body: `A fully equipped van arrives at your address in ${suburb.name}.` },
            { icon: <WrenchIcon />, title: "Fitted and balanced", body: "New valves and wheel balancing are part of every fitting." },
            { icon: <RecycleIcon />, title: "Old tyres recycled", body: "We take your worn tyres away so you do not have to." },
          ]}
        />
        <div className="mt-6 flex flex-col items-start gap-3">
          <CityAreaButton cityName={suburb.name} postcode={suburb.postcode} />
        </div>
      </HomeSection>

      <FaqSection title={`Questions from ${suburb.name} customers`} items={FAQS(suburb.name)} />

      {neighbours.length > 0 && (
        <HomeSection id="nearby" title={`Also in ${city.name}`} className="pb-[50px] lg:pb-20">
          <ul className="flex flex-wrap gap-2">
            {neighbours.map((s) => (
              <li key={`${s.slug}-${s.postcode}`}>
                <Link
                  href={`${cityPath}/${s.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 text-[15px] font-bold text-black transition-colors hover:bg-black hover:text-white"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={cityPath} className={buttonClassName({ variant: "secondary", size: "sm", className: "mt-5 w-fit" })}>
            All of {city.name}
          </Link>
          {sample && (
            <p data-testid="sample-note" className="mt-4 text-xs text-muted">
              {SAMPLE_NOTE}
            </p>
          )}
        </HomeSection>
      )}
      <CtaBands />
    </div>
  );
}
