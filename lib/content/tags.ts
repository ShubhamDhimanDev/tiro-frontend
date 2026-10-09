import type { ContentPageType } from "./types";

/**
 * The exact ISR tag vocabulary from docs/architecture/02-api-contract.md's
 * "ISR on-demand revalidation webhook" table (Phase 6) — one place these
 * strings get built, so every tagged fetch across this domain (blog/guides/
 * locations/promotions/pages/faq listings & details, the shared FAQ block,
 * plus the retrofitted `app/brands/[slug]` and `app/tyres/[slug]` pages)
 * matches exactly what `App\Contracts\RevalidatesFrontend` implementations
 * fire on the Laravel side. **An untagged fetch is never invalidated** by
 * `app/api/revalidate/route.ts`, no matter how correctly Laravel fires —
 * getting these strings right, once, here, is the entire point of this
 * file existing rather than inlining template strings at every call site.
 */

export function contentTypeListingTag(type: ContentPageType): string {
  return `content:${type}`;
}

export function contentPageDetailTag(type: ContentPageType, slug: string): string {
  return `content:${type}:${slug}`;
}

export function faqGlobalTag(): string {
  return "content:faq";
}

export function faqCategoryTag(category: string): string {
  return `content:faq:${category}`;
}

export function faqPageScopedTag(contentPageId: number): string {
  return `content:faq:page:${contentPageId}`;
}

/**
 * Every fetch of the `GET /brands` list (home brands band, `/brands` index).
 * Fired on brand create/update/delete, so a new brand or a freshly uploaded
 * logo shows up there without waiting out the hourly timer.
 */
export function brandListTag(): string {
  return "content:brand:list";
}

/** Retrofitted onto `app/brands/[slug]/page.tsx` — not otherwise part of this domain. */
export function brandPageTag(slug: string): string {
  return `content:brand:${slug}`;
}

/** Retrofitted onto `app/tyres/[slug]/page.tsx` (the PDP) — not otherwise part of this domain. */
export function tyrePdpTag(slug: string): string {
  return `content:tyre:${slug}`;
}

/** Applied in addition to `contentPageDetailTag("promo_landing", slug)` whenever a `promo_landing` page links a `Promotion`. */
export function promotionTag(id: number): string {
  return `promotion:${id}`;
}
