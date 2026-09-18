import type { Metadata } from "next";
import { catalogBackend } from "@/lib/catalog/backend";
import { TyreResultsGrid } from "@/components/catalog/tyre-results-grid";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import type { Paginator, TyreListItem } from "@/lib/catalog/types";

export const metadata: Metadata = {
  title: "Latest tyre releases | Tiro Mobile Tyres",
  description: "The newest tyre models available for mobile fitting.",
};

export const revalidate = 3600;

export default async function LatestReleasesPage() {
  const query = new URLSearchParams({ per_page: "24" });
  const result = await catalogBackend.latestReleases(query, { next: { revalidate: 3600 } });
  const items = result.status === 200 ? (result.body as Paginator<TyreListItem>).data : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Latest releases", url: "/tyres/latest-releases" }]} />
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Latest releases</h1>
      <TyreResultsGrid items={items} emptyMessage="No new releases right now — check back soon." />
    </div>
  );
}
