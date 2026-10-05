import type { Metadata } from "next";
import { NOT_FOUND_METADATA, pageMetadata } from "@/lib/site/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TagIcon } from "@/components/ui/icons";
import { contentBackend } from "@/lib/content/backend";
import { contentPageDetailTag, contentTypeListingTag, promotionTag } from "@/lib/content/tags";
import { resolveMetaDescription, resolveMetaTitle, resolveOgImage } from "@/lib/content/seo";
import { ContentLanding } from "@/components/content/content-landing";
import type { ContentPageDetail, ContentPageDetailResponse, ContentPagePromotionSummary, ContentPagesResponse } from "@/lib/content/types";

/**
 * Promo landing page detail — SSG/ISR, `GET /api/v1/content/pages/promo_landing/{slug}`.
 * No dedicated listing this round, same "linked individually, not browsed"
 * reasoning as `app/locations/[slug]/page.tsx`.
 *
 * **Double-tagging when `promotion` is linked** — per
 * docs/architecture/02-api-contract.md's revalidation table: "Any
 * promo-landing `ContentPage` that references a `Promotion` via
 * `promotion_id` — ALSO tag `promotion:{id}`, in addition to its own
 * `content:promo_landing:{slug}` tag." A `Promotion` update (e.g. its
 * discount value or dates changing) needs to invalidate this page even
 * though `ContentPage` itself wasn't touched.
 *
 * **Known limitation, flagged rather than silently accepted as airtight:**
 * `promotion_id` isn't knowable until *after* this page's one real fetch
 * resolves, so it can't be present on that fetch's own `next.tags` at call
 * time (tags must be static per Next's `fetch()` extension — see
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md).
 * The re-fetch below (same URL, tags now including `promotion:{id}`) was
 * verified against Next 16's actual fetch-cache implementation
 * (`node_modules/next/dist/esm/server/lib/patch-fetch.js`): every `fetch()`
 * call unconditionally contributes its own `next.tags` into the current
 * route's aggregate tag set (`revalidateStore.tags`), regardless of whether
 * that call is itself a cache hit — so `revalidateTag("promotion:{id}", ...)`
 * *will* mark this page's own route-level cache entry stale and queue it
 * for regeneration. What it does **not** guarantee is that the *specific*
 * `pageDetail()` fetch is itself invalidated (that fetch's own data-cache
 * entry was written and persisted its tags on the *first* call, before
 * `promotion:{id}` was known) — so on regeneration this fetch may still
 * serve a response cached before the `Promotion` row changed, until its own
 * `revalidate: 3600` window naturally elapses. Net effect: a
 * `Promotion`-only edit (no matching `ContentPage` touch) gets this page
 * queued for regeneration promptly, but the promotion-derived fields inside
 * it (name/value/dates) may lag up to the existing timed-ISR window rather
 * than reflecting instantly — the same "best-effort, timed ISR window is
 * the fallback safety net" posture docs/architecture/02-api-contract.md
 * already states for the whole webhook mechanism, not a new gap introduced
 * here. A `ContentPage` edit (the more common admin workflow when a promo
 * campaign changes) invalidates this page's actual body/title/excerpt
 * instantly either way, via the single, unambiguous
 * `content:promo_landing:{slug}` tag.
 */

export const dynamicParams = true;
export const revalidate = 3600;

async function loadPromoLanding(slug: string): Promise<ContentPageDetail | null> {
  const tags = [contentPageDetailTag("promo_landing", slug)];
  const result = await contentBackend.pageDetail("promo_landing", slug, { next: { revalidate: 3600, tags } });
  if (result.status !== 200) return null;

  const page = (result.body as ContentPageDetailResponse).data;

  if (page.promotion) {
    // See the file doc comment above for exactly what this call does and
    // does not guarantee.
    await contentBackend.pageDetail("promo_landing", slug, {
      next: { revalidate: 3600, tags: [...tags, promotionTag(page.promotion.id)] },
    });
  }

  return page;
}

export async function generateStaticParams() {
  const result = await contentBackend.pages(new URLSearchParams({ type: "promo_landing", per_page: "100" }), {
    next: { tags: [contentTypeListingTag("promo_landing")] },
  });
  if (result.status !== 200) return [];
  return (result.body as ContentPagesResponse).data.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPromoLanding(slug);
  if (!page) return NOT_FOUND_METADATA;

  const ogImage = resolveOgImage(page);
  return pageMetadata({
    title: resolveMetaTitle(page),
    description: resolveMetaDescription(page),
    path: `/promotions/${page.slug}`,
    image: ogImage,
    type: "website",
  });
}

/**
 * Only `type: "percentage"` gets a formatted "X% off" blurb — the contract's
 * own example only ever shows that one case (`{ type: "percentage", value:
 * 15 }`); `fixed`/`bundle`/`buy_x_get_y`/`four_for_three` each need a
 * different unit/framing this endpoint doesn't disambiguate (e.g. whether
 * `fixed`'s `value` is cents, matching this project's usual money
 * convention, or dollars), so rather than guess and risk showing a wrong
 * number on a public page, those types fall back to just the promotion's
 * `name` with no numeric claim. Flagged as a judgment call in the
 * completion report.
 */
function promotionValueBlurb(promotion: ContentPagePromotionSummary): string | null {
  if (promotion.type === "percentage") return `${promotion.value}% off`;
  return null;
}

export default async function PromoLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await loadPromoLanding(slug);
  if (!page) notFound();

  const promotion = page.promotion;
  const valueBlurb = promotion ? promotionValueBlurb(promotion) : null;
  const isActive = promotion ? new Date(promotion.ends_at) >= new Date() : false;

  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Deals", url: "/deals" },
    { name: page.title, url: `/promotions/${page.slug}` },
  ];

  const blocks =
    promotion && isActive ? (
      <section className="flex items-start gap-4 rounded-card border border-success/40 bg-success/5 p-4 md:p-5">
        <span aria-hidden="true" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
          <TagIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-ink">
            {promotion.name}
            {valueBlurb ? ` — ${valueBlurb}` : ""}
          </p>
          <p className="mt-1 text-muted">Ends {new Date(promotion.ends_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.</p>
        </div>
      </section>
    ) : promotion ? (
      <section className="rounded-card border border-line bg-chip p-4 text-muted md:p-5">
        This offer has ended. Check our <Link href="/deals" className="font-semibold text-link underline underline-offset-4">current offers</Link> or contact us for the latest pricing.
      </section>
    ) : null;

  return (
    <>
      <ContentLanding page={page} crumbs={crumbs} eyebrow={promotion && isActive ? "Limited-time offer" : "Offer"} blocks={blocks} />
    </>
  );
}
