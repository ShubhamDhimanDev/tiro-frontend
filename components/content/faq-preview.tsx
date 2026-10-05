import Link from "next/link";
import { FaqJsonLd } from "@/components/seo/json-ld";
import { HomeSection, textLinkClassName } from "@/components/home/home-section";
import type { Faq } from "@/lib/content/types";

const PREVIEW_COUNT = 4;

/**
 * Homepage FAQ teaser — top few (by `sort_order`, already ascending from the
 * API, same assumption `app/faq/page.tsx` makes) real global FAQs, native
 * `<details>/<summary>` accordion (no client JS needed). Links out to the
 * real `/faq` page for the rest. `<FaqJsonLd>` is scoped to only the items
 * actually rendered here so the markup matches what is in the DOM.
 */
export function FaqPreview({ faqs }: { faqs: Faq[] }) {
  const preview = faqs.slice(0, PREVIEW_COUNT);
  if (preview.length === 0) return null;

  return (
    <HomeSection
      id="faq"
      title="Questions, answered"
      action={
        <Link href="/faq" className={textLinkClassName}>
          View all FAQs
        </Link>
      }
    >
      <FaqJsonLd items={preview.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
      <div className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
        {preview.map((faq) => (
          <details key={faq.id} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-semibold [&::-webkit-details-marker]:hidden">
              {faq.question}
              <span aria-hidden="true" className="shrink-0 text-2xl leading-none text-link transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="px-5 pb-4 text-muted">{faq.answer}</p>
          </details>
        ))}
      </div>
    </HomeSection>
  );
}
