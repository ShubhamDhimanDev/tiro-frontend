import Link from "next/link";
import { catalogBackend } from "@/lib/catalog/backend";
import { PopularSizes } from "@/components/catalog/popular-sizes";
import type { PopularSizesResponse } from "@/lib/catalog/types";

/**
 * Homepage — SSG/ISR, links into the storefront surfaces built this round
 * (tyre-size search, browse-by-brand, latest releases). Minimal by design:
 * this call's scope was the location/search/browse/PDP engine, not a full
 * marketing homepage.
 */
export const revalidate = 3600;

export default async function Home() {
  const popularResult = await catalogBackend.popularSizes({ next: { revalidate: 3600 } });
  const popular = popularResult.status === 200 ? (popularResult.body as PopularSizesResponse).data : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Mobile tyre fitting. We come to you.
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Search by tyre size, browse by brand, and get fitted at home or work.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/tyres"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Find your tyre size
        </Link>
        <Link
          href="/brands"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Browse by brand
        </Link>
        <Link
          href="/tyres/latest-releases"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Latest releases
        </Link>
      </div>

      {popular.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">Popular sizes</h2>
          <PopularSizes sizes={popular} />
        </div>
      )}
    </div>
  );
}
