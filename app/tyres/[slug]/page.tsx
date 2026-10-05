import type { Metadata } from "next";
import { NOT_FOUND_METADATA } from "@/lib/site/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogBackend } from "@/lib/catalog/backend";
import { reviewsBackend } from "@/lib/reviews/backend";
import { reviewsTag } from "@/lib/reviews/tags";
import { tyrePdpTag } from "@/lib/content/tags";
import { groupTyresByModel } from "@/lib/catalog/group-by-model";
import { prepareResults } from "@/lib/catalog/extra-filters";
import { fullTyreName, TYRE_CATEGORY_LABELS, TYRE_TYPE_LABELS } from "@/lib/catalog/labels";
import { PdpBuyProvider } from "@/components/catalog/pdp-buy-context";
import { PdpBuyPanel, PdpStickyBar } from "@/components/catalog/pdp-buy-panel";
import { PdpOfferJsonLd } from "@/components/catalog/pdp-offer-jsonld";
import { PdpGallery } from "@/components/catalog/pdp-gallery";
import { PdpPriceMatchLink } from "@/components/catalog/pdp-price-match-link";
import { TyreModelCard } from "@/components/catalog/tyre-model-card";
import { Accordion } from "@/components/ui/accordion";
import { contentBackend } from "@/lib/content/backend";
import { faqCategoryTag } from "@/lib/content/tags";
import type { FaqsResponse } from "@/lib/content/types";
import { TrustStrip } from "@/components/home/trust-strip";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewRatingBadge } from "@/components/reviews/review-rating-badge";
import { BreadcrumbJsonLd, FaqJsonLd, ProductJsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { ReviewsResponse } from "@/lib/reviews/types";
import type {
  Paginator,
  TyreListItem,
  TyreVariantDetail,
  TyreVariantDetailResponse,
} from "@/lib/catalog/types";

/**
 * PDP: deliberately split into two calls, kept split.
 * This page fetches only `GET /api/v1/tyres/{slug}` (static content,
 * SSG/ISR-fed, no price/stock ever). Price/stock is a separate, always-live
 * client fetch (`<PdpBuyProvider>`, see `components/catalog/pdp-buy-context.tsx`):
 * price is zone- and time-dependent, and baking it into this cached page risks
 * serving stale or wrong prices, per docs/architecture/02-api-contract.md's
 * server-rendered-vs-client-fetched table.
 *
 * Deliberately no `loading.tsx` next to this file, and this segment is kept
 * as a *sibling* of `app/tyres/(catalog)/` rather than nested under it:
 * do not "fix" either of those on their own without reading this note.
 *
 * A route-level `loading.tsx` anywhere in this page's ancestor chain
 * (including one placed directly alongside this file) makes Next.js stream
 * the response: the Suspense fallback flushes and commits the HTTP status
 * to `200` before this async component's `await loadVariant(slug)` resolves
 * and calls `notFound()` below. By the time `notFound()` runs, the status
 * header is already sent, so every unknown or deleted slug would serve a `200`
 * with "not found" copy instead of a real `404`, which is wrong for SEO and
 * for anything that checks HTTP status (crawlers, uptime monitors, link
 * checkers). Confirmed empirically against a running dev server. This matches
 * Next's own documented HTTP contract for streaming
 * (`node_modules/next/dist/docs/01-app/02-guides/streaming.md`, "The HTTP
 * contract"): once a Suspense fallback renders, the status code can't be
 * changed, so the fix is "never enter a Suspense boundary before `notFound()`
 * can run".
 *
 * The instant-navigation UX a `loading.tsx` would normally buy is instead
 * handled client-side, per link, with `useLinkStatus` (see
 * `components/ui/link-pending-overlay.tsx`, used by `<TyreModelCard>`, and
 * `components/ui/link-pending-dot.tsx`, used by `<CartLineItems>`).
 */

// Judgment call: not documented by the contract (no dedicated "list all
// slugs for static generation" endpoint). Uses the search endpoint with no
// filters. Once CATALOG_BACKEND=live, re-check against whatever backend-agent
// actually provides.
export async function generateStaticParams() {
  const result = await catalogBackend.search(new URLSearchParams(), { next: { revalidate: 3600 } });
  if (result.status !== 200) return [];
  const body = result.body as Paginator<TyreListItem>;
  return body.data.map((item) => ({ slug: item.slug }));
}

// Any slug not covered by `generateStaticParams` above is rendered
// on-demand and cached from then on (ISR), rather than 404ing outright.
export const dynamicParams = true;

// Not specified by the contract (only that this content is "cacheable,
// SSG/ISR-fed"). 1 hour balances freshness against rebuild cost for
// specs/warranty copy that changes rarely. On-demand revalidation from the
// admin panel (per the contract's ISR revalidation note) supersedes this.
export const revalidate = 3600;

async function loadVariant(slug: string): Promise<TyreVariantDetail | null> {
  // Tagged `content:tyre:{slug}` (Phase 6): `TyreVariant`/`TyreModel` fire this
  // tag on update/delete, but only when a field this static-content endpoint
  // actually returns changed (never on a bare price/stock edit).
  const result = await catalogBackend.variantDetail(slug, { next: { revalidate: 3600, tags: [tyrePdpTag(slug)] } });
  if (result.status !== 200) return null;
  return (result.body as TyreVariantDetailResponse).data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await loadVariant(slug);
  if (!detail) return NOT_FOUND_METADATA;

  const title = `${detail.tyre_model.brand.name} ${detail.tyre_model.name} ${detail.width}/${detail.profile} R${detail.rim_diameter} | Tiro Mobile Tyres`;
  return {
    title,
    description: detail.tyre_model.description ?? undefined,
  };
}

/** Other brands' tyres in the same size (same-brand rows are left out so the brand name stays unique on the page). */
async function loadRelated(detail: TyreVariantDetail) {
  const query = new URLSearchParams({
    width: String(detail.width),
    profile: String(detail.profile),
    rim_diameter: String(detail.rim_diameter),
    per_page: "12",
  });
  const result = await catalogBackend.search(query, { next: { revalidate: 3600 } });
  if (result.status !== 200) return [];
  const items = (result.body as Paginator<TyreListItem>).data.filter(
    (item) => item.tyre_model.brand.slug !== detail.tyre_model.brand.slug,
  );
  return groupTyresByModel(prepareResults(items)).slice(0, 4);
}

/** PDP FAQs (reserved category "pdp"). Shown as the FAQs accordion; the JSON-LD matches what is shown. */
async function loadFaqs() {
  const result = await contentBackend.faqs(new URLSearchParams({ category: "pdp" }), {
    next: { revalidate: 3600, tags: [faqCategoryTag("pdp")] },
  });
  return result.status === 200 ? (result.body as FaqsResponse).data : [];
}

async function loadReviews(): Promise<ReviewsResponse | null> {
  const result = await reviewsBackend.list(new URLSearchParams({ per_page: "3" }), {
    next: { revalidate: 86400, tags: [reviewsTag()] },
  });
  if (result.status !== 200) return null;
  return result.body as ReviewsResponse;
}

export default async function TyreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await loadVariant(slug);
  if (!detail) notFound();

  const [related, reviews, faqs] = await Promise.all([loadRelated(detail), loadReviews(), loadFaqs()]);

  const { tyre_model: model } = detail;
  const images = model.images.length > 0 ? model.images : ["/tyres/placeholder-tyre.svg"];
  const size = `${detail.width}/${detail.profile} R${detail.rim_diameter}`;
  const productName = fullTyreName(model.brand.name, model.name);
  const cartLabel = `${productName} ${size}`;
  const url = `/tyres/${detail.slug}`;
  const hasReviews = reviews !== null && reviews.meta.summary.total_count > 0 && reviews.data.length > 0;

  return (
    <div className="container-page pb-4 pt-6 md:pt-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Tyres", url: "/tyres" },
          { name: model.brand.name, url: `/brands/${model.brand.slug}` },
          { name: `${model.name} ${size}`, url },
        ]}
      />
      {/* Static Product JSON-LD has no `offers`: this cached page has no price
          by design. `<PdpOfferJsonLd>` adds them client-side once a location
          resolves (same `@id`); it never invents an offer. */}
      <ProductJsonLd
        id={`${url}#product`}
        name={productName}
        description={model.description ?? ""}
        brand={model.brand.name}
        image={images}
        sku={detail.slug}
      />
      {faqs.length > 0 && <FaqJsonLd items={faqs.map((f) => ({ question: f.question, answer: f.answer }))} />}

      <PdpBuyProvider tyreVariantId={detail.id} slug={detail.slug} label={cartLabel} image={model.images[0]}>
        <PdpOfferJsonLd
          id={`${url}#product`}
          name={productName}
          description={model.description ?? ""}
          brand={model.brand.name}
          image={images}
          sku={detail.slug}
          url={url}
        />

        <Link
          href="/tyres"
          className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-link hover:text-black"
        >
          <ArrowRightIcon className="h-4 w-4 rotate-180" />
          Back to tyres
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-x-12">
          {/* Photo. This is the LCP image on every PDP (eager, high priority). */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <PdpGallery images={images} alt={productName} />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <div>
              <Link
                href={`/brands/${model.brand.slug}`}
                className="inline-flex min-h-11 items-center rounded-control border border-line bg-surface px-3 text-[13px] font-extrabold uppercase text-black shadow-rest hover:border-black"
              >
                {model.brand.name}
              </Link>
              <h1 className="type-h2 mt-2 uppercase">{model.name}</h1>
              <p className="mt-2 text-base text-muted">
                {size} · Load {detail.load_index} · Speed {detail.speed_rating}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Tyre features">
                <li>
                  <Badge>{TYRE_TYPE_LABELS[model.tyre_type]}</Badge>
                </li>
                <li>
                  <Badge>{TYRE_CATEGORY_LABELS[model.category]}</Badge>
                </li>
                {model.run_flat && (
                  <li>
                    <Badge tone="ink">Run-flat</Badge>
                  </li>
                )}
              </ul>
            </div>

            <PdpBuyPanel />

            <PdpPriceMatchLink tyreVariantId={detail.id} label={cartLabel} />

            <Accordion
              variant="plain"
              defaultOpenIds={["summary", "features"]}
              items={[
                {
                  id: "summary",
                  title: "Product summary",
                  content: (
                    <div className="flex flex-col gap-3">
                      {model.description && <p>{model.description}</p>}
                      {model.warranty_text && (
                        <p>
                          <b className="text-black">Warranty:</b> {model.warranty_text}
                          {model.warranty_km ? ` (${model.warranty_km.toLocaleString()}km)` : ""}
                        </p>
                      )}
                      <p>
                        This tyre is sized for R{detail.rim_diameter} wheels. Always match the size, load index and speed rating
                        recommended for your vehicle, or{" "}
                        <Link href="/tyres/by-vehicle" className="font-bold text-link underline underline-offset-4 hover:text-black">
                          find your vehicle&apos;s fitment
                        </Link>
                        .
                      </p>
                    </div>
                  ),
                },
                ...(model.service_inclusions.length > 0
                  ? [
                      {
                        id: "features",
                        title: "Features",
                        content: (
                          <div>
                            <h2 className="mb-2 text-base font-bold text-black">Service inclusions</h2>
                            <ul className="list-inside list-disc">
                              {model.service_inclusions.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ),
                      },
                    ]
                  : []),
                {
                  id: "specs",
                  title: "Technical specifications",
                  content: (
                    <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] overflow-hidden rounded-card border border-line bg-surface text-sm">
                      {(
                        [
                          ["Brand", model.brand.name],
                          ["Size", size],
                          ["Width", `${detail.width} mm`],
                          ["Profile", `${detail.profile}`],
                          ["Rim", `R${detail.rim_diameter}`],
                          ["Load index", detail.load_index],
                          ["Speed rating", detail.speed_rating],
                          ["Sidewall", detail.sidewall],
                          ["Construction", model.construction],
                          ["Run-flat", model.run_flat ? "Yes" : "No"],
                        ] as [string, string | number | null | undefined][]
                      )
                        .filter(([, value]) => value !== null && value !== undefined && value !== "")
                        .map(([label, value]) => (
                        <div key={label} className="col-span-2 grid grid-cols-subgrid border-b border-line px-4 py-3 last:border-b-0 odd:bg-band">
                          <dt className="text-muted">{label}</dt>
                          <dd className="font-medium text-black">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  ),
                },
                ...(faqs.length > 0
                  ? [
                      {
                        id: "faqs",
                        title: "FAQs",
                        content: (
                          <dl className="flex flex-col">
                            {faqs.map((item) => (
                              <div key={item.id} className="border-t border-line py-3 first:border-t-0">
                                <dt className="font-bold text-black">{item.question}</dt>
                                <dd className="mt-1">{item.answer}</dd>
                              </div>
                            ))}
                          </dl>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>

        {hasReviews && (
          <section aria-labelledby="pdp-reviews-heading" className="mt-14 border-t border-line pt-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 id="pdp-reviews-heading" className="type-h2">
                What customers say about Tiro
              </h2>
              <Link href="/reviews" className="inline-flex min-h-11 items-center font-bold text-link underline underline-offset-4 hover:text-black">
                Read all reviews
              </Link>
            </div>
            {/* Google Business Profile reviews of the business as a whole, not of this tyre. No Review/AggregateRating in the Product JSON-LD. */}
            <p className="mb-3 text-sm text-muted">Google reviews of Tiro Mobile Tyres&apos; fitting service. They are not reviews of this specific tyre.</p>
            <div className="mb-4">
              <ReviewRatingBadge summary={reviews.meta.summary} />
            </div>
            <ul aria-label="Recent business reviews" className="grid gap-3 md:grid-cols-3">
              {reviews.data.map((review) => (
                <li key={review.id}>
                  <ReviewCard review={review} compact className="h-full" />
                </li>
              ))}
            </ul>
            <TrustStrip className="!px-0 !pt-6 [&>ul]:justify-start" />
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="pdp-related-heading" className="mt-14 border-t border-line pt-10">
            <h2 id="pdp-related-heading" className="type-h2 mb-5">
              Other options in this size
            </h2>
            <ul aria-label="Related tyres" className="grid gap-4 min-[576px]:grid-cols-2 lg:grid-cols-3">
              {related.map((group) => (
                <li key={group.model.slug}>
                  <TyreModelCard group={group} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="h-4 lg:hidden" />
        <PdpStickyBar />
      </PdpBuyProvider>
    </div>
  );
}
