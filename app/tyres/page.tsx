import type { Metadata } from "next";
import { catalogBackend } from "@/lib/catalog/backend";
import { getServiceZone } from "@/lib/location/cookies";
import {
  normalizeSearchParams,
  isSearchRequest,
  isStaggeredSearch,
  buildTyreSearchQuery,
  buildTyresPageHref,
  buildTyresStaggeredPageHref,
} from "@/lib/catalog/search-params";
import { TyreSearchForm } from "@/components/catalog/tyre-search-form";
import { TyreSearchResults, TyreSearchResultsStaggered } from "@/components/catalog/tyre-search-results";
import { PopularSizes } from "@/components/catalog/popular-sizes";
import { StaleZoneNotice } from "@/components/location/stale-zone-notice";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { TYRE_TYPE_LABELS } from "@/lib/catalog/labels";
import { TYRE_TYPES } from "@/lib/catalog/types";
import Link from "next/link";
import type { Paginator, PopularSizesResponse, StaggeredTyreSearchResult, TyreListItem } from "@/lib/catalog/types";

export const metadata: Metadata = {
  title: "Search tyres by size | Tiro Mobile Tyres",
  description: "Find the right tyre for your vehicle by width, profile, and rim diameter, including staggered fitments.",
};

/**
 * Tyre-size search UI — requirements §3.1 (P0 core flow). SSR'd (reads
 * `searchParams`, a Request-time API under this project's classic caching
 * model), per docs/architecture/02-api-contract.md's "Catalog/search first
 * paint: SSR — SEO-relevant, needs to be crawlable".
 *
 * Doubles as the size-search browse hub (popular sizes + form) when no
 * filters are present — a routing judgment call: the contract only says
 * "Tyre-size search UI" without naming a separate hub route, and layering
 * the hub into the same `/tyres` URL avoids an awkward extra page for what
 * is otherwise just this page's zero-filter state. Flagged in the
 * completion report.
 */
export default async function TyresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const values = normalizeSearchParams(raw);

  if (!isSearchRequest(values)) {
    const popularResult = await catalogBackend.popularSizes();
    const popular = popularResult.status === 200 ? (popularResult.body as PopularSizesResponse).data : [];

    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Find your tyre size</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Select your tyre size to see what we stock near you, or start from a popular size below.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Not sure of your tyre size?{" "}
            <Link href="/tyres/by-vehicle" className="font-medium underline underline-offset-2">
              Find it by vehicle
            </Link>{" "}
            &mdash; select your make, model, and year instead.
          </p>
        </div>
        <TyreSearchForm initial={values} />
        {popular.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">Popular sizes</h2>
            <PopularSizes sizes={popular} />
          </div>
        )}
        <div>
          <h2 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">Browse by type</h2>
          <div className="flex flex-wrap gap-2">
            {TYRE_TYPES.map((type) => (
              <Link
                key={type}
                href={`/tyres/type/${type}`}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {TYRE_TYPE_LABELS[type]}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/brands" className="text-zinc-700 underline underline-offset-2 dark:text-zinc-300">
            Browse by brand
          </Link>
          <Link href="/tyres/latest-releases" className="text-zinc-700 underline underline-offset-2 dark:text-zinc-300">
            Latest releases
          </Link>
        </div>
      </div>
    );
  }

  const zone = await getServiceZone();
  const staggered = isStaggeredSearch(values);
  const page = Number(values.page ?? "1") || 1;
  // Staggered mode paginates front/rear independently — `front_page`/
  // `rear_page` are two distinct query params (see search-params.ts), not
  // one shared `page`.
  const frontPage = Number(values.front_page ?? "1") || 1;
  const rearPage = Number(values.rear_page ?? "1") || 1;

  const primaryQuery = buildTyreSearchQuery(values, { zoneId: zone?.zoneId, page, frontPage, rearPage });
  let result = await catalogBackend.search(primaryQuery, { cache: "no-store" });

  let staleZone = false;
  if (result.status === 404 && zone) {
    // Server can't set cookies mid-render (only Route Handlers/Server
    // Actions can) — re-fetch without the bad zone so no stale-zone price
    // data is ever shown, and surface `<StaleZoneNotice>` (client) to clear
    // the cookie and re-prompt. See docs/architecture/02-api-contract.md's
    // "never silently fall through to an unfiltered nationwide result".
    staleZone = true;
    const fallbackQuery = buildTyreSearchQuery(values, { page, frontPage, rearPage });
    result = await catalogBackend.search(fallbackQuery, { cache: "no-store" });
  }

  if (result.status === 422) {
    const body = result.body as { message: string; errors?: Record<string, string[]> };
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <TyreSearchForm initial={values} />
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {body.message}
        </p>
      </div>
    );
  }

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Tyres", url: "/tyres" },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <BreadcrumbJsonLd items={breadcrumbs} />
      <TyreSearchForm initial={values} />
      {staleZone && <StaleZoneNotice />}
      {staggered ? (
        <TyreSearchResultsStaggered
          result={(result.body as StaggeredTyreSearchResult).data}
          buildFrontHref={(nextPage) => buildTyresStaggeredPageHref(values, "front", nextPage)}
          buildRearHref={(nextPage) => buildTyresStaggeredPageHref(values, "rear", nextPage)}
        />
      ) : (
        <TyreSearchResults
          result={result.body as Paginator<TyreListItem>}
          buildHref={(nextPage) => buildTyresPageHref(values, nextPage)}
        />
      )}
    </div>
  );
}
