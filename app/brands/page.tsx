import type { Metadata } from "next";
import Link from "next/link";
import { catalogBackend } from "@/lib/catalog/backend";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import type { BrandsResponse } from "@/lib/catalog/types";

export const metadata: Metadata = {
  title: "Tyre brands | Tiro Mobile Tyres",
  description: "Browse tyres by brand.",
};

// Not specified by the contract beyond "cacheable" — see app/tyres/[slug]/page.tsx's revalidate comment for the same judgment call.
export const revalidate = 3600;

export default async function BrandsPage() {
  const result = await catalogBackend.brands({ next: { revalidate: 3600 } });
  const brands = result.status === 200 ? (result.body as BrandsResponse).data : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Brands", url: "/brands" }]} />
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Tyre brands</h1>
      {brands.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No brands available right now.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brands/${brand.slug}`}
              className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-4 text-center transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{brand.name}</span>
              {brand.country_of_origin && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{brand.country_of_origin}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
