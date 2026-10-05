import type { Metadata } from "next";
import { NOT_FOUND_METADATA } from "@/lib/site/seo";
import { notFound } from "next/navigation";
import { catalogBackend } from "@/lib/catalog/backend";
import { BrowseListing } from "@/components/catalog/browse-listing";
import { FinderNav } from "@/components/catalog/finder-nav";
import { ListingUsps } from "@/components/catalog/listing-usps";
import { isRegoEnabled } from "@/lib/rego/flag";
import { NoResultsState } from "@/components/catalog/results-states";
import { ChangeSizeSheet } from "@/components/catalog/change-size-sheet";
import { ListingHeader } from "@/components/catalog/listing-header";
import { ListingExtras } from "@/components/catalog/listing-extras";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { typeSeoCopy } from "@/lib/catalog/copy";
import { TYRE_TYPE_LABELS } from "@/lib/catalog/labels";
import { TYRE_TYPES, type Paginator, type PopularSizesResponse, type TyreListItem, type TyreType } from "@/lib/catalog/types";

/** Browse by tyre type: fixed enum (docs/architecture/01-data-model.md), so every valid path is known upfront: SSG at build time, no on-demand fallback needed. */
export const dynamicParams = false;
export const revalidate = 3600;

export async function generateStaticParams() {
  return TYRE_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  if (!TYRE_TYPES.includes(type as TyreType)) return NOT_FOUND_METADATA;
  const label = TYRE_TYPE_LABELS[type as TyreType];
  return {
    title: `${label} tyres | Tiro Mobile Tyres`,
    description: `Browse ${label.toLowerCase()} tyres available for mobile fitting.`,
  };
}

export default async function TyreTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!TYRE_TYPES.includes(type as TyreType)) notFound();
  const tyreType = type as TyreType;
  const label = TYRE_TYPE_LABELS[tyreType];

  const query = new URLSearchParams({ tyre_type: tyreType, per_page: "24" });
  const [result, popularResult] = await Promise.all([
    catalogBackend.search(query, { next: { revalidate: 3600 } }),
    catalogBackend.popularSizes({ next: { revalidate: 3600 } }),
  ]);
  const items = result.status === 200 ? (result.body as Paginator<TyreListItem>).data : [];
  const popular = popularResult.status === 200 ? (popularResult.body as PopularSizesResponse).data : [];

  return (
    <div className="container-page pt-6 md:pt-10">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: `${label} tyres`, url: `/tyres/type/${tyreType}` }]} />
      <div className="mb-6">
        <FinderNav active="type" rego={isRegoEnabled()} />
      </div>
      <ListingHeader
        title={`${label} tyres`}
        intro="Enter your size to see what fits your vehicle."
        actions={<ChangeSizeSheet values={{}} label="Find my size" />}
      >
        <ListingUsps />
      </ListingHeader>
      <BrowseListing
        items={items}
        label={`${label} tyres`}
        showTiers
        emptyState={<NoResultsState message={`No ${label.toLowerCase()} tyres available right now.`} showChangeSize={false} />}
      />
      <ListingExtras
        seoTitle="Tyre type guide"
        seoParagraphs={typeSeoCopy(tyreType)}
        popular={popular}
        links={[
          { href: "/tyres", label: "Search by size" },
          { href: "/tyres/by-vehicle", label: "Find tyres by vehicle" },
          { href: "/brands", label: "Browse by brand" },
        ]}
      />
    </div>
  );
}
