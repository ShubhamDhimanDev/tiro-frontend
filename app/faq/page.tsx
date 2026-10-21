import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site/seo";
import { contentBackend } from "@/lib/content/backend";
import { faqGlobalTag } from "@/lib/content/tags";
import Link from "next/link";
import { FaqJsonLd } from "@/components/seo/json-ld";
import { CtaBands } from "@/components/page/cta-bands";
import { Mark, PageHero } from "@/components/page/page-hero";
import { sampleFaqs } from "@/lib/content/sample";
import { SAMPLE_CONTENT_ENABLED, SAMPLE_NOTE } from "@/lib/site/sample";
import { buttonClassName } from "@/components/ui/button";
import { FaqExplorer } from "@/components/content/faq-explorer";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";
import type { Faq, FaqsResponse } from "@/lib/content/types";

/**
 * General FAQ page — SSG/ISR, `GET /api/v1/content/faqs` with **no** filter
 * params (per the task brief: "groups by category client-side, no filter
 * params passed"), which per `FaqController::index()` returns every
 * published *global* FAQ (`content_page_id IS NULL`) across every category.
 * Grouping by `category` happens here rather than via a second request per
 * category — one fetch, one tag (`content:faq`), grouped in render code.
 */

export const metadata: Metadata = pageMetadata({
  title: "Frequently Asked Questions | Tiro Mobile Tyres",
  description: "Answers to common questions about mobile tyre fitting, pricing, and booking with Tiro Mobile Tyres.",
  path: "/faq",
});

export const revalidate = 3600;

const UNCATEGORIZED_LABEL = "General";

function groupByCategory(faqs: Faq[]): { category: string; items: Faq[] }[] {
  const groups = new Map<string, Faq[]>();
  for (const faq of faqs) {
    const key = faq.category ?? UNCATEGORIZED_LABEL;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(faq);
    } else {
      groups.set(key, [faq]);
    }
  }
  // `UNCATEGORIZED_LABEL` last, since it's a catch-all rather than a
  // deliberately-authored category — everything else in insertion order
  // (already `sort_order`-ascending from the API).
  return [...groups.entries()]
    .sort(([a], [b]) => (a === UNCATEGORIZED_LABEL ? 1 : b === UNCATEGORIZED_LABEL ? -1 : 0))
    .map(([category, items]) => ({ category, items }));
}

export default async function FaqIndexPage() {
  const result = await contentBackend.faqs(new URLSearchParams(), {
    next: { revalidate: 3600, tags: [faqGlobalTag()] },
  });
  const live = result.status === 200 ? (result.body as FaqsResponse).data : [];
  const sample = SAMPLE_CONTENT_ENABLED && live.length === 0;
  const faqs = sample ? sampleFaqs() : live;
  const groups = groupByCategory(faqs);

  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Help centre", url: "/help" },
    { name: "FAQ", url: "/faq" },
  ];

  return (
    <>
      <FaqJsonLd items={faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
      <PageHero
        crumbs={crumbs}
        eyebrow="Help center"
        title={
          <>
            Frequently asked <Mark>questions</Mark>
          </>
        }
        lead="Quick answers about fitting, pricing and booking."
      />

      <div className="container-page flex flex-col gap-10 py-10 md:py-14">
        <div className="flex w-full max-w-3xl flex-col gap-8">
          {faqs.length === 0 ? (
            <p className="rounded-card border border-line bg-surface p-6 text-muted">No FAQs published yet. Check back soon.</p>
          ) : (
            <FaqExplorer groups={groups} />
          )}
          {sample && faqs.length > 0 && (
            <p data-testid="sample-note" className="text-xs text-muted">
              {SAMPLE_NOTE}
            </p>
          )}

          <aside className="flex flex-col gap-3 rounded-card bg-gold p-5 text-black md:p-6">
            <p className="type-h3">Still need a hand?</p>
            <p>
              Call us on{" "}
              <a href={PHONE_HREF} className="font-bold underline underline-offset-4">
                {PHONE_DISPLAY}
              </a>{" "}
              ({HOURS_LINE}) or visit the{" "}
              <Link href="/help" className="font-bold underline underline-offset-4">
                Help Centre
              </Link>
              .
            </p>
            <Link href="/contact" className={buttonClassName({ variant: "black", className: "w-fit" })}>
              Contact us
            </Link>
          </aside>
        </div>
      </div>
      <CtaBands />
    </>
  );
}
