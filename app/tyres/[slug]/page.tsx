import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalogBackend } from "@/lib/catalog/backend";
import { PdpAvailability } from "@/components/catalog/pdp-availability";
import { PdpFaq } from "@/components/catalog/pdp-faq";
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/seo/json-ld";
import type { Paginator, TyreListItem, TyreVariantDetail, TyreVariantDetailResponse } from "@/lib/catalog/types";

/**
 * PDP — deliberately split into two calls, kept split:
 * this page fetches only `GET /api/v1/tyres/{slug}` (static content,
 * SSG/ISR-fed, no price/stock ever). Price/stock is a separate, always-live
 * client fetch (`<PdpAvailability>`) — see that component's doc comment and
 * the completion report for why merging them would be tempting but wrong
 * here (price is zone- and time-dependent; baking it into this cached page
 * risks serving stale/wrong prices, per docs/architecture/02-api-contract.md's
 * server-rendered-vs-client-fetched table).
 */

// Judgment call: not documented by the contract (no dedicated "list all
// slugs for static generation" endpoint). Uses the search endpoint with no
// filters against the stub's full fixture set. Once CATALOG_BACKEND=live,
// re-check this against whatever backend-agent actually provides — flagged
// in the completion report.
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
// specs/warranty copy that changes rarely — judgment call, flagged in the
// completion report. On-demand revalidation from the admin panel (per the
// contract's ISR revalidation note) supersedes this once wired.
export const revalidate = 3600;

async function loadVariant(slug: string): Promise<TyreVariantDetail | null> {
  const result = await catalogBackend.variantDetail(slug, { next: { revalidate: 3600 } });
  if (result.status !== 200) return null;
  return (result.body as TyreVariantDetailResponse).data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await loadVariant(slug);
  if (!detail) return {};

  const title = `${detail.tyre_model.brand.name} ${detail.tyre_model.name} ${detail.width}/${detail.profile} R${detail.rim_diameter} | Tiro Mobile Tyres`;
  return {
    title,
    description: detail.tyre_model.description ?? undefined,
  };
}

export default async function TyreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await loadVariant(slug);
  if (!detail) notFound();

  const { tyre_model: model } = detail;
  const image = model.images[0] ?? "/tyres/placeholder-tyre.svg";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Tyres", url: "/tyres" },
          { name: model.brand.name, url: `/brands/${model.brand.slug}` },
          { name: `${model.name} ${detail.width}/${detail.profile} R${detail.rim_diameter}`, url: `/tyres/${detail.slug}` },
        ]}
      />
      {/* No `offers` — this page has no price to report (static content
          only, by design). Product JSON-LD without price is still valid
          and better than fabricating a nationwide figure; see the
          completion report for the known gap this leaves for rich-result
          eligibility. */}
      <ProductJsonLd
        name={`${model.brand.name} ${model.name}`}
        description={model.description ?? ""}
        brand={model.brand.name}
        image={model.images.length > 0 ? model.images : [image]}
        sku={detail.slug}
      />

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- image host isn't known/configured yet, see completion report */}
          <img src={image} alt={`${model.brand.name} ${model.name}`} className="aspect-square w-full rounded-lg object-cover" />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{model.brand.name}</p>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{model.name}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {detail.width}/{detail.profile} R{detail.rim_diameter} · Load {detail.load_index} · Speed {detail.speed_rating}
            </p>
          </div>

          <PdpAvailability slug={detail.slug} />

          {model.description && <p className="text-sm text-zinc-700 dark:text-zinc-300">{model.description}</p>}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">Construction</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{model.construction ?? "—"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Run-flat</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{model.run_flat ? "Yes" : "No"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Sidewall</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{detail.sidewall}</dd>
            {model.warranty_text && (
              <>
                <dt className="text-zinc-500 dark:text-zinc-400">Warranty</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {model.warranty_text}
                  {model.warranty_km ? ` (${model.warranty_km.toLocaleString()}km)` : ""}
                </dd>
              </>
            )}
          </dl>

          {model.service_inclusions.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Service inclusions</h2>
              <ul className="mt-1 list-inside list-disc text-sm text-zinc-600 dark:text-zinc-400">
                {model.service_inclusions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <PdpFaq />
    </div>
  );
}
