import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site/seo";
import Link from "next/link";
import { contentBackend } from "@/lib/content/backend";
import { contentTypeListingTag, faqGlobalTag } from "@/lib/content/tags";
import { FaqJsonLd } from "@/components/seo/json-ld";
import { ContentSummaryCard } from "@/components/content/content-summary-card";
import { Accordion } from "@/components/ui/accordion";
import { CtaBands } from "@/components/page/cta-bands";
import { Mark, PageHero } from "@/components/page/page-hero";
import { HomeSection, textLinkClassName } from "@/components/home/home-section";
import { sampleFaqs, sampleSummaries } from "@/lib/content/sample";
import { SAMPLE_CONTENT_ENABLED, SAMPLE_NOTE } from "@/lib/site/sample";
import { buttonClassName } from "@/components/ui/button";
import { ArrowRightIcon, CalendarIcon, PhoneIcon, TagIcon, TyreIcon, WrenchIcon } from "@/components/ui/icons";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";
import type { ContentPageSummary, ContentPagesResponse, Faq, FaqsResponse } from "@/lib/content/types";

/**
 * `/help` — Help Centre index, Phase 8. Re-verified this round (a file glob
 * over `app/` confirmed no combined help-centre/help index route existed
 * before this): `app/blog`, `app/guides`, `app/faq` already each stand
 * alone, but nothing ties `/guides` and `/faq` together as one entry point.
 *
 * **Not a new backend build** — per the task brief, this reuses the two
 * existing, already-live public endpoints unmodified
 * (`GET /api/v1/content/pages?type=guide`, `GET /api/v1/content/faqs`) via
 * the same `contentBackend`/tag vocabulary `app/guides/page.tsx` and
 * `app/faq/page.tsx` already use — no new `lib/` domain, no new tag string.
 * SSG/ISR, `revalidate = 3600`, same judgment-call default every other
 * SSG/ISR content page in this app uses.
 *
 * **Grouping is defensive, not merged**: `category` is a free-text field on
 * both `ContentPage` and `Faq` with no shared canonical taxonomy between
 * them (a known content-authoring gap being resolved separately with the
 * client, not something to solve in code) — so guides and FAQs are grouped
 * by their *own* `category` values independently, in two clearly-labelled
 * sections, rather than attempting to align/merge a "Tyre care" guide
 * category with a "tyre-care" FAQ category as if they were the same
 * taxonomy. Same "don't assume clean matching categories" posture the task
 * brief asks for explicitly.
 */

export const metadata: Metadata = pageMetadata({
  title: "Help Centre | Tiro Mobile Tyres",
  description: "Guides and frequently asked questions about booking a mobile tyre fitting with Tiro Mobile Tyres.",
  path: "/help",
});

export const revalidate = 3600;

const UNCATEGORIZED_LABEL = "General";

function groupByCategory<T extends { category: string | null }>(items: T[]): { category: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.category ?? UNCATEGORIZED_LABEL;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  // Same ordering convention `app/faq/page.tsx` already established:
  // `UNCATEGORIZED_LABEL` last (a catch-all, not a deliberately-authored
  // category), everything else in the order the API returned it.
  return [...groups.entries()]
    .sort(([a], [b]) => (a === UNCATEGORIZED_LABEL ? 1 : b === UNCATEGORIZED_LABEL ? -1 : 0))
    .map(([category, groupItems]) => ({ category, items: groupItems }));
}

async function loadGuides(): Promise<ContentPageSummary[]> {
  const params = new URLSearchParams({ type: "guide", per_page: "100" });
  const result = await contentBackend.pages(params, {
    next: { revalidate: 3600, tags: [contentTypeListingTag("guide")] },
  });
  if (result.status !== 200) return [];
  return (result.body as ContentPagesResponse).data;
}

async function loadFaqs(): Promise<Faq[]> {
  const result = await contentBackend.faqs(new URLSearchParams(), {
    next: { revalidate: 3600, tags: [faqGlobalTag()] },
  });
  if (result.status !== 200) return [];
  return (result.body as FaqsResponse).data;
}

const TOPICS = [
  { href: "/guides", title: "Buying guides", text: "Sizes, tyre types and how to choose.", Icon: TyreIcon },
  { href: "/faq", title: "Answers to common questions", text: "Fitting, pricing and booking.", Icon: WrenchIcon },
  { href: "/account/orders", title: "Your orders and bookings", text: "Check, move or cancel an appointment.", Icon: CalendarIcon },
  { href: "/deals", title: "Offers and price match", text: "Current deals and how price match works.", Icon: TagIcon },
] as const;

export default async function HelpCentrePage() {
  const [liveGuides, liveFaqs] = await Promise.all([loadGuides(), loadFaqs()]);
  const sample = SAMPLE_CONTENT_ENABLED && liveGuides.length === 0 && liveFaqs.length === 0;
  const guides = sample ? sampleSummaries("guide") : liveGuides;
  const faqs = sample ? sampleFaqs() : liveFaqs;
  const faqGroups = groupByCategory(faqs);
  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Help Centre", url: "/help" },
  ];

  return (
    <>
      {faqs.length > 0 && <FaqJsonLd items={faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />}
      <PageHero
        crumbs={crumbs}
        eyebrow="Help center"
        title={
          <>
            Help <Mark>Centre</Mark>
          </>
        }
        lead="How can we help? Buying guides and answers to common questions, in one place."
        aside={
          <aside aria-label="Contact us" className="flex flex-col gap-3 rounded-card bg-surface p-5 text-black shadow-raised md:p-6">
            <p className="type-h3">Talk to a person</p>
            <p className="text-muted">{HOURS_LINE}</p>
            <a href={PHONE_HREF} className={buttonClassName({ variant: "green", fullWidth: true })}>
              <PhoneIcon aria-hidden="true" className="h-5 w-5" />
              {PHONE_DISPLAY}
            </a>
            <Link href="/contact" className={textLinkClassName}>
              Send us a message
            </Link>
          </aside>
        }
      />

      <section aria-labelledby="topics-heading" className="container-page pt-[50px] lg:pt-20">
        <h2 id="topics-heading" className="sr-only">
          Browse by topic
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOPICS.map(({ href, title, text, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col items-start gap-3 rounded-card border border-line bg-surface p-5 shadow-rest transition-shadow hover:shadow-raised"
              >
                <span aria-hidden="true" className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-gold text-black">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-bold text-ink group-hover:underline">{title}</span>
                  <span className="text-[15px] text-muted">{text}</span>
                </span>
                <ArrowRightIcon aria-hidden="true" className="mt-auto h-5 w-5 shrink-0 text-black" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <HomeSection
        id="guides"
        title="Guides"
        action={
          <Link href="/guides" className={textLinkClassName}>
            View all guides
          </Link>
        }
      >
        {guides.length === 0 ? (
          <p className="text-muted">No guides published yet. Check back soon.</p>
        ) : (
          // One grid; each card carries its own category as its eyebrow.
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <ContentSummaryCard item={guide} href={`/guides/${guide.slug}`} headingLevel={3} />
              </li>
            ))}
          </ul>
        )}
      </HomeSection>

      <HomeSection
        id="faqs"
        title="Frequently asked questions"
        className="pb-[50px] lg:pb-20"
        action={
          <Link href="/faq" className={textLinkClassName}>
            View full FAQ
          </Link>
        }
      >
        {faqs.length === 0 ? (
          <p className="text-muted">No FAQs published yet. Check back soon.</p>
        ) : (
          <div className="flex max-w-3xl flex-col gap-8">
            {faqGroups.map((group) => (
              <div key={group.category} className="flex flex-col gap-3">
                <h3 className="type-eyebrow font-bold uppercase capitalize text-muted">{group.category.replace(/-/g, " ")}</h3>
                <Accordion items={group.items.map((item) => ({ id: item.id, title: item.question, content: item.answer }))} />
              </div>
            ))}
          </div>
        )}
        {sample && (
          <p data-testid="sample-note" className="mt-6 text-xs text-muted">
            {SAMPLE_NOTE}
          </p>
        )}
      </HomeSection>
      <CtaBands />
    </>
  );
}
