import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalogBackend } from "@/lib/catalog/backend";
import { TyreResultsGrid } from "@/components/catalog/tyre-results-grid";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import type { BrandsResponse, Paginator, TyreListItem } from "@/lib/catalog/types";

/**
 * Brand detail/browse page — SSG/ISR. Note: the contract documents no
 * dedicated `/api/v1/brands/{slug}` detail endpoint, only the list
 * (`GET /api/v1/brands`) and the search endpoint's `brand` (slug) filter.
 * This page derives brand metadata (name, country) from the brands list and
 * its product listing from `GET /api/v1/tyres?brand={slug}` — an assumption
 * flagged in the completion report, not something explicit in the contract.
 */

export const dynamicParams = true;
export const revalidate = 3600;

async function loadBrand(slug: string) {
  const result = await catalogBackend.brands({ next: { revalidate: 3600 } });
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
  if (!brand) return {};
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
  const result = await catalogBackend.search(query, { next: { revalidate: 3600 } });
  const items = result.status === 200 ? (result.body as Paginator<TyreListItem>).data : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Brands", url: "/brands" },
          { name: brand.name, url: `/brands/${brand.slug}` },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{brand.name} tyres</h1>
        {brand.country_of_origin && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Manufactured in {brand.country_of_origin}.</p>
        )}
      </div>
      <TyreResultsGrid items={items} emptyMessage={`No ${brand.name} tyres available right now.`} />
    </div>
  );
}
