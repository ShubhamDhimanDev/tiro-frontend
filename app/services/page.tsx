import type { Metadata } from "next";
import { loadHomeReviews } from "@/lib/home/load";
import { pageMetadata } from "@/lib/site/seo";
import Link from "next/link";
import { UspStrip } from "@/components/home/usp-strip";
import { ReviewsSection } from "@/components/home/reviews";
import { CtaBands } from "@/components/page/cta-bands";
import { FeatureBand } from "@/components/page/feature-band";
import { infoIcon } from "@/components/page/info-icons";
import { Mark, PageHero } from "@/components/page/page-hero";
import { buttonClassName } from "@/components/ui/button";
import { SERVICE_VISUALS, serviceHref } from "@/lib/site/service-visuals";
import { SERVICE_CONTENT } from "@/lib/site/services";

export const metadata: Metadata = pageMetadata({
  title: "Mobile tyre services | Tiro Mobile Tyres",
  description: "Tyre sales, onsite fitting, puncture repair, rotation and balancing, inspections, recycling and fleet servicing. We come to you.",
  path: "/services",
});

const crumbs = [
  { name: "Home", url: "/" },
  { name: "Mobile services", url: "/services" },
];

export default async function ServicesPage() {
  const reviews = await loadHomeReviews();
  return (
    <>
      <PageHero
        crumbs={crumbs}
        eyebrow="Mobile services"
        title={
          <>
            Everything your tyres need, <Mark>at your door</Mark>
          </>
        }
        lead="From a new set to a quick puncture repair, our technicians bring the equipment to your home or workplace."
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
      {SERVICE_CONTENT.map((s, i) => {
        const visual = SERVICE_VISUALS[s.slug];
        return (
          <FeatureBand
            key={s.slug}
            id={s.slug}
            title={s.title}
            image={visual.image}
            icon={infoIcon(visual.icon)}
            tone={i % 2 === 0 ? "white" : "grey"}
            flip={i % 2 === 1}
            href={serviceHref(s.slug)}
            cta="Learn more"
            ctaLabel={`Learn more about ${s.title.toLowerCase()}`}
            imageClassName="max-w-[420px]"
          >
            <p>{s.summary}</p>
            <p className="text-base">{s.intro}</p>
          </FeatureBand>
        );
      })}
      <ReviewsSection data={reviews} />
      <CtaBands className="mt-[50px] lg:mt-20" />
    </>
  );
}
