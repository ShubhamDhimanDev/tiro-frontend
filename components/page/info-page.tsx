import Link from "next/link";
import type React from "react";
import { FeatureBand } from "@/components/page/feature-band";
import { CtaBands } from "@/components/page/cta-bands";
import { FaqSection } from "@/components/page/faq-section";
import { infoIcon } from "@/components/page/info-icons";
import { PageHero } from "@/components/page/page-hero";
import { UspStrip } from "@/components/home/usp-strip";
import { ReviewsSection } from "@/components/home/reviews";
import type { HomeReviews } from "@/lib/home/load";
import { buttonClassName } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import type { InfoPageContent } from "@/lib/site/info-pages";

/**
 * Template for the static information pages (price guarantee, payment
 * options, delivery promise, warranties, about, how it works, our range,
 * fleet): hero band, alternating feature bands, FAQ accordion with FAQPage
 * JSON-LD, trust strip, reviews and the closing CTA stack. Content lives in
 * `lib/site/info-pages.ts`.
 */
export function InfoPage({ page, reviews, extra }: { page: InfoPageContent; reviews?: HomeReviews; extra?: React.ReactNode }) {
  const crumbs = [
    { name: "Home", url: "/" },
    ...(page.parent ? [page.parent] : []),
    { name: page.title, url: page.path },
  ];

  return (
    <>
      <PageHero
        crumbs={crumbs}
        eyebrow={page.eyebrow}
        title={page.heading}
        lead={page.lead}
        actions={
          <>
            {page.primaryCta && (
              <Link href={page.primaryCta.href} className={buttonClassName({ variant: "green" })}>
                {page.primaryCta.label}
              </Link>
            )}
            {page.secondaryCta && (
              <Link href={page.secondaryCta.href} className={buttonClassName({ variant: "yellow" })}>
                {page.secondaryCta.label}
              </Link>
            )}
          </>
        }
      />
      <UspStrip />
      {page.sections.map((s, i) => (
        <FeatureBand
          key={s.id}
          id={s.id}
          title={s.heading}
          image={s.image}
          icon={infoIcon(s.icon)}
          tone={i % 2 === 0 ? "white" : "grey"}
          flip={i % 2 === 1}
          href={s.cta?.href}
          cta={s.cta?.label}
        >
          {s.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {s.bullets && (
            <ul className="mt-1 flex flex-col gap-2 text-base text-black">
              {s.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-black">
                    <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span className="font-medium">{b}</span>
                </li>
              ))}
            </ul>
          )}
        </FeatureBand>
      ))}
      {extra}
      <FaqSection items={page.faqs} className="pb-[50px] lg:pb-20" />
      <ReviewsSection data={reviews} />
      <CtaBands className="mt-[50px] lg:mt-20" />
    </>
  );
}
