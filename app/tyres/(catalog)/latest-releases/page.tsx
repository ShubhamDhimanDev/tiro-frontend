import type { Metadata } from "next";
import { catalogBackend } from "@/lib/catalog/backend";
import { BrowseListing } from "@/components/catalog/browse-listing";
import { ListingUsps } from "@/components/catalog/listing-usps";
import { NoResultsState } from "@/components/catalog/results-states";
import { ChangeSizeSheet } from "@/components/catalog/change-size-sheet";
import { ListingHeader } from "@/components/catalog/listing-header";
import { ListingExtras } from "@/components/catalog/listing-extras";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { LATEST_SEO_COPY } from "@/lib/catalog/copy";
import type { Paginator, PopularSizesResponse, TyreListItem } from "@/lib/catalog/types";

export const metadata: Metadata = {
  title: "Latest tyre releases | Tiro Mobile Tyres",
  description: "The newest tyre models available for mobile fitting.",
};

export const revalidate = 3600;

export default async function LatestReleasesPage() {
  const query = new URLSearchParams({ per_page: "24" });
  const [result, popularResult] = await Promise.all([
    catalogBackend.latestReleases(query, { next: { revalidate: 3600 } }),
    catalogBackend.popularSizes({ next: { revalidate: 3600 } }),
  ]);
  const items = result.status === 200 ? (result.body as Paginator<TyreListItem>).data : [];
  const popular = popularResult.status === 200 ? (popularResult.body as PopularSizesResponse).data : [];

  return (
    <div className="container-page pt-6 md:pt-10">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Latest releases", url: "/tyres/latest-releases" }]} />
      <ListingHeader
        title="Latest releases"
        intro="The newest tyre models, newest first."
        actions={<ChangeSizeSheet values={{}} label="Find my size" />}
      >
        <ListingUsps />
      </ListingHeader>
      <BrowseListing
        items={items}
        label="Latest releases"
        emptyState={<NoResultsState message="No new releases right now — check back soon." showChangeSize={false} />}
      />
      <ListingExtras
        seoTitle="What is new in the range"
        seoParagraphs={LATEST_SEO_COPY}
        popular={popular}
        links={[
          { href: "/tyres", label: "Search by size" },
          { href: "/brands", label: "Browse by brand" },
        ]}
      />
    </div>
  );
}
