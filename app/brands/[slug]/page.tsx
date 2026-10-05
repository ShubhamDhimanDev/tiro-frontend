import type { Metadata } from "next";
import { NOT_FOUND_METADATA } from "@/lib/site/seo";
import { notFound } from "next/navigation";
import { catalogBackend } from "@/lib/catalog/backend";
import { brandPageTag } from "@/lib/content/tags";
import { groupTyresByModel } from "@/lib/catalog/group-by-model";
import { brandSeoCopy } from "@/lib/catalog/copy";
import { BrowseListing } from "@/components/catalog/browse-listing";
import { NoResultsState } from "@/components/catalog/results-states";
import { BrandHero, MIN_PATTERNS_FOR_CHIPS, PatternChips } from "@/components/catalog/brand-hero";
import { ListingExtras } from "@/components/catalog/listing-extras";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import type {
  BrandDetail,
  BrandDetailResponse,
  BrandsResponse,
  BrandSummary,
  Paginator,
  PopularSizesResponse,
  TyreListItem,
} from "@/lib/catalog/types";

/**
 * Brand detail/browse page: SSG/ISR. Brand metadata (name, country, tier, model
 * count) comes from `GET /api/v1/brands/{slug}` (Phase 6a), the product listing
 * from `GET /api/v1/tyres?brand={slug}`.
 *
 * Tagged `content:brand:{slug}` (Phase 6) per docs/architecture/02-api-contract.md's
 * ISR revalidation table: every brand page's own fetch hits the same
 * `/api/v1/brands` URL, so this one shared cache entry carries every visited
 * brand's tag; that's correct, since a `Brand` update changes what that one
 * response returns for every consumer.
 *
 * No filter sidebar here: filters are URL params, which would make this static
 * page dynamic. "Find your size" in the hero sends the visitor to the
 * filtered, size-specific listing (`/tyres?...&brand=`), which has the sidebar.
 * Prices need a location (a cookie), so this ISR page shows none and its cards
 * say so; tier picks (price-derived) therefore only appear on `/tyres`.
 */

export const dynamicParams = true;
export const revalidate = 3600;

/**
 * Brand metadata from `GET /api/v1/brands/{slug}` (Phase 6a: adds `tier` and
 * `tyre_model_count`). A 404 is a real not-found; any other failure falls back
 * to the brands list so a detail-endpoint hiccup doesn't take the page down.
 */
async function loadBrand(slug: string): Promise<BrandSummary | BrandDetail | undefined> {
  const cacheInit = { next: { revalidate: 3600, tags: [brandPageTag(slug)] } };
  const detail = await catalogBackend.brandDetail(slug, cacheInit);
  if (detail.status === 200) return (detail.body as BrandDetailResponse).data;
  if (detail.status === 404) return undefined;
  const result = await catalogBackend.brands(cacheInit);
  if (result.status !== 200) return undefined;
  return (result.body as BrandsResponse).data.find((b) => b.slug === slug);
}

export async function generateStaticParams() {
  const result = await catalogBackend.brands();
  if (result.status !== 200) return [];
  return (result.body as BrandsResponse).data.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await loadBrand(slug);
  if (!brand) return NOT_FOUND_METADATA;
  return {
    title: `${brand.name} tyres | Tiro Mobile Tyres`,
    description: `Browse ${brand.name} tyres available for mobile fitting.`,
  };
}

export default async function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await loadBrand(slug);
  if (!brand) notFound();

  const query = new URLSearchParams({ brand: slug, per_page: "24" });
  const [result, popularResult] = await Promise.all([
    catalogBackend.search(query, { next: { revalidate: 3600 } }),
    catalogBackend.popularSizes({ next: { revalidate: 3600 } }),
  ]);
  const items = result.status === 200 ? (result.body as Paginator<TyreListItem>).data : [];
  const popular = popularResult.status === 200 ? (popularResult.body as PopularSizesResponse).data : [];
  const patterns = groupTyresByModel(items).map((g) => ({ slug: g.model.slug, name: g.model.name }));

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Brands", url: "/brands" },
          { name: brand.name, url: `/brands/${brand.slug}` },
        ]}
      />
      <BrandHero
        title={`${brand.name} tyres`}
        intro={
          brand.country_of_origin
            ? `Manufactured in ${brand.country_of_origin}. Enter your size to see which ${brand.name} patterns fit your vehicle.`
            : `Enter your size to see which ${brand.name} patterns fit your vehicle.`
        }
        brandSlug={brand.slug}
        tier={brand.tier ?? null}
        modelCount={"tyre_model_count" in brand ? brand.tyre_model_count : undefined}
      />
      <div className="container-page py-8 md:py-12">
        {patterns.length >= MIN_PATTERNS_FOR_CHIPS && <PatternChips patterns={patterns} />}
        {result.status !== 200 ? (
          <p role="alert" className="text-sm msg-error">
            We could not load the range just now. Please refresh to try again.
          </p>
        ) : (
          <BrowseListing
            items={items}
            heading={`${brand.name} range`}
            label={`${brand.name} tyres`}
            anchorIds
            emptyState={<NoResultsState message={`No ${brand.name} tyres available right now.`} showChangeSize={false} />}
          />
        )}
        <ListingExtras
          seoTitle={`About ${brand.name}`}
          seoParagraphs={brandSeoCopy(brand)}
          popular={popular}
          links={[
            { href: "/brands", label: "All brands" },
            { href: "/tyres/by-vehicle", label: "Find tyres by vehicle" },
          ]}
        />
      </div>
    </>
  );
}
