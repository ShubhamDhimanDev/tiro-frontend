import { contentBackend } from "@/lib/content/backend";
import { faqCategoryTag, faqGlobalTag, faqPageScopedTag } from "@/lib/content/tags";
import { warnUnresolvedTokens } from "@/lib/content/guards";
import { FaqJsonLd } from "@/components/seo/json-ld";
import type { FaqsResponse } from "@/lib/content/types";

/**
 * Shared FAQ block, reusable anywhere a bounded, cacheable FAQ list belongs
 * — the PDP (always `category="pdp"`, per the task brief — `"pdp"` is a
 * reserved category value the backend recognizes for exactly this purpose)
 * and location pages (`contentPageId`, page-scoped via
 * `Faq.content_page_id`). Supplying neither prop renders the *global* FAQ
 * set (`content_page_id IS NULL`, every category) — not used by any page
 * this round (the general `/faq` page needs per-category grouping, which
 * this flat-list block doesn't do, so it fetches/groups directly instead —
 * see `app/faq/page.tsx`), kept here anyway since it's the documented
 * default behaviour of the endpoint this block wraps.
 *
 * An async Server Component, not a client fetch: FAQ content is exactly as
 * cacheable as any other SSG/ISR content (no zone/price/personalization
 * dependency), so this renders as part of whatever page embeds it and is
 * invalidated the same way — the `next.tags` on this component's own fetch
 * matter as much as any page's, not an afterthought because it's a shared
 * component.
 *
 * Passing both `category` and `contentPageId` is not a supported case for
 * any current caller — the type only allows one or the other (or neither).
 */
type FaqBlockProps = (
  | { category: string; contentPageId?: never }
  | { category?: never; contentPageId: number }
  | { category?: never; contentPageId?: never }
) & { heading?: string; /** Show at most this many (the JSON-LD matches what is shown). */ limit?: number };

export async function FaqBlock({ category, contentPageId, heading = "Frequently asked questions", limit }: FaqBlockProps) {
  const params = new URLSearchParams();
  let tag: string;
  if (category) {
    params.set("category", category);
    tag = faqCategoryTag(category);
  } else if (contentPageId) {
    params.set("content_page_id", String(contentPageId));
    tag = faqPageScopedTag(contentPageId);
  } else {
    tag = faqGlobalTag();
  }

  const result = await contentBackend.faqs(params, { next: { revalidate: 3600, tags: [tag] } });
  if (result.status !== 200) return null;

  const all = (result.body as FaqsResponse).data;
  const items = limit ? all.slice(0, limit) : all;
  if (items.length === 0) return null;
  items.forEach((item) => warnUnresolvedTokens(`FAQ #${item.id}`, `${item.question} ${item.answer}`));

  return (
    <section className="flex flex-col gap-4">
      <FaqJsonLd items={items.map((item) => ({ question: item.question, answer: item.answer }))} />
      <h2 className="type-h3">{heading}</h2>
      <dl className="flex flex-col">
        {items.map((item) => (
          <div key={item.id} className="border-t border-line py-4">
            <dt className="font-semibold text-ink">{item.question}</dt>
            <dd className="mt-1 text-muted">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
