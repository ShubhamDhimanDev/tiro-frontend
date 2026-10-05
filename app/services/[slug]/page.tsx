import type { Metadata } from "next";
import { NOT_FOUND_METADATA, pageMetadata } from "@/lib/site/seo";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { HowItWorks } from "@/components/home/how-it-works";
import { HomeSection } from "@/components/home/home-section";
import { CtaBands } from "@/components/page/cta-bands";
import { FaqSection } from "@/components/page/faq-section";
import { infoIcon } from "@/components/page/info-icons";
import { ImageSlot } from "@/components/page/image-slot";
import { PageHero } from "@/components/page/page-hero";
import { ServiceJsonLd } from "@/components/seo/json-ld";
import { buttonClassName } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { FITTING_INCLUSIONS } from "@/lib/site/inclusions";
import { SITE_NAME } from "@/lib/site/config";
import { SERVICE_VISUALS, serviceHref } from "@/lib/site/service-visuals";
import { SERVICE_CONTENT, getService } from "@/lib/site/services";

/** Fixed list of services, so every valid path is known at build time. */
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICE_CONTENT.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return NOT_FOUND_METADATA;
  return pageMetadata({ title: service.title, description: service.summary, path: serviceHref(slug) });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();
  // Fleet has its own full page; keep the old URL working.
  if (slug === "fleet") permanentRedirect("/fleet");

  const visual = SERVICE_VISUALS[service.slug];
  const others = SERVICE_CONTENT.filter((s) => s.slug !== service.slug);
  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Mobile services", url: "/services" },
    { name: service.title, url: `/services/${service.slug}` },
  ];

  return (
    <>
      <ServiceJsonLd name={service.title} description={service.summary} url={`/services/${service.slug}`} provider={SITE_NAME} />
      <PageHero
        crumbs={crumbs}
        eyebrow="Mobile services"
        title={service.title}
        lead={service.summary}
        actions={
          <>
            <Link href={service.cta.href} className={buttonClassName({ variant: "green" })}>
              {service.cta.label}
            </Link>
            <Link href="/contact" className={buttonClassName({ variant: "yellow" })}>
              Ask a question
            </Link>
          </>
        }
        aside={<ImageSlot slot={visual.image} icon={infoIcon(visual.icon)} className="mx-auto hidden max-w-[360px] lg:block" />}
      />

      <HomeSection id="overview" title={`About ${service.title.toLowerCase()}`}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
          <p className="max-w-2xl text-lg leading-8 text-muted">{service.intro}</p>
          <ul aria-label="What is included" className="flex flex-col gap-3">
            {service.points.map((p) => (
              <li key={p} className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-rest">
                <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-black">
                  <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="font-medium text-black">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </HomeSection>

      <section aria-labelledby="includes-heading" className="mt-[50px] bg-gold lg:mt-20">
        <div className="container-page grid gap-6 py-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:items-center lg:gap-12">
          <h2 id="includes-heading" className="type-h2">
            All our fitted prices include
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {FITTING_INCLUSIONS.map((i) => (
              <li key={i.title} className="flex flex-col rounded-card bg-surface p-4 text-black">
                <span className="font-bold">{i.title}</span>
                <span className="text-sm text-muted">{i.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <HowItWorks />
      <FaqSection items={service.faqs} />

      <HomeSection id="other-services" title="More mobile services" className="pb-[50px] lg:pb-20">
        <ul className="flex flex-wrap gap-2">
          {others.map((s) => (
            <li key={s.slug}>
              <Link
                href={serviceHref(s.slug)}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 text-[15px] font-bold text-black transition-colors hover:bg-black hover:text-white"
              >
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </HomeSection>
      <CtaBands />
    </>
  );
}
