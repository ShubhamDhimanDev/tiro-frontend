import type { Metadata } from "next";
import Link from "next/link";
import { catalogBackend } from "@/lib/catalog/backend";
import { brandListTag } from "@/lib/content/tags";
import { BrandHero } from "@/components/catalog/brand-hero";
import { BrandMark } from "@/components/catalog/brand-mark";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import type { BrandsResponse } from "@/lib/catalog/types";

export const metadata: Metadata = {
  title: "Tyre brands | Tiro Mobile Tyres",
  description: "Browse tyres by brand.",
};

// Not specified by the contract beyond "cacheable": see app/tyres/[slug]/page.tsx's revalidate comment for the same judgment call.
export const revalidate = 3600;

export default async function BrandsPage() {
  const result = await catalogBackend.brands({ next: { revalidate: 3600, tags: [brandListTag()] } });
  const brands = result.status === 200 ? (result.body as BrandsResponse).data : [];

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Brands", url: "/brands" }]} />
      <BrandHero title="Tyre brands" intro="Pick a brand to see its range, or enter your size to see what fits your vehicle." />
      <div className="container-page py-8 md:py-12">
        {result.status !== 200 ? (
          <p role="alert" className="text-sm msg-error">
            We could not load the brands just now. Please refresh to try again.
          </p>
        ) : brands.length === 0 ? (
          <p className="text-sm text-muted">No brands available right now.</p>
        ) : (
          <ul aria-label="Brands" className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {brands.map((brand) => (
              <li key={brand.slug}>
                <Link
                  href={`/brands/${brand.slug}`}
                  className="flex h-full min-h-36 items-center justify-center rounded-card border border-line bg-surface p-4 text-center shadow-rest transition-shadow hover:shadow-raised"
                >
                  <BrandMark logoPath={brand.logo_path} name={brand.name} className="h-20 w-40">
                    <span className="text-lg font-extrabold leading-tight text-black md:text-xl">{brand.name}</span>
                  </BrandMark>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 text-sm text-muted">
          Not sure which brand? Compare premium, mid-range and budget options for your size on the{" "}
          <Link href="/tyres" className="inline-flex min-h-11 items-center font-bold text-link underline underline-offset-4 hover:text-black">
            size search
          </Link>
          .
        </p>
      </div>
    </>
  );
}
