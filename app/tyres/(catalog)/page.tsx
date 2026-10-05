import type { Metadata } from "next";
import { catalogBackend } from "@/lib/catalog/backend";
import { getServiceZone } from "@/lib/location/cookies";
import {
  normalizeSearchParams,
  isBrowseRequest,
  isSearchRequest,
  isStaggeredSearch,
  buildTyreSearchQuery,
  buildTyresPageHref,
  buildTyresStaggeredPageHref,
} from "@/lib/catalog/search-params";
import { buildFilterHref, countActiveFilters, describeSearchSize, hasFilterParams, isKnownCategory, isKnownTyreType } from "@/lib/catalog/filters";
import { groupTyresByModel } from "@/lib/catalog/group-by-model";
import { deriveTiers } from "@/lib/catalog/tiers";
import { prepareResults } from "@/lib/catalog/extra-filters";
import { sizeSeoCopy } from "@/lib/catalog/copy";
import { TyreSearchResults, TyreSearchResultsStaggered } from "@/components/catalog/tyre-search-results";
import { ChangeSizeSheet } from "@/components/catalog/change-size-sheet";
import { FilterBar, FilterSidebar, SortSelect } from "@/components/catalog/catalog-filters";
import { ListingHeader } from "@/components/catalog/listing-header";
import { ListingUsps } from "@/components/catalog/listing-usps";
import { SizeFinderHub } from "@/components/catalog/size-finder-hub";
import { ListingExtras } from "@/components/catalog/listing-extras";
import { TierPicks } from "@/components/catalog/tier-picks";
import { BackendErrorState, InvalidFilterState, InvalidSizeState } from "@/components/catalog/results-states";
import { StaleZoneNotice } from "@/components/location/stale-zone-notice";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { TYRE_CATEGORY_LABELS, TYRE_TYPE_LABELS } from "@/lib/catalog/labels";
import type {
  BrandsResponse,
  Paginator,
  PopularSizesResponse,
  StaggeredTyreSearchResult,
  TyreCategory,
  TyreFacetsResponse,
  TyreListItem,
  TyreType,
} from "@/lib/catalog/types";

type RawSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: RawSearchParams }): Promise<Metadata> {
  const values = normalizeSearchParams(await searchParams);
  if (!isSearchRequest(values) && !isBrowseRequest(values)) {
    return {
      title: "Search tyres by size | Tiro Mobile Tyres",
      description:
        "Find the right tyre for your vehicle by width, profile, and rim diameter, including staggered fitments.",
    };
  }
  const size = isBrowseRequest(values) ? browseTitle(values) : `${describeSearchSize(values)} tyres`;
  return {
    title: `${size} | Tiro Mobile Tyres`,
    description: `Compare ${size.toLowerCase()}, then set your location for price and stock. Fitted where you are.`,
    // Filtered, sorted and per_page variants are duplicates of the base size
    // page: keep them out of the index, but let crawlers follow the links.
    ...(hasFilterParams(values) ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Title for a filter-only browse, from whatever the URL carries: "Bridgestone SUV tyres". Slugs are humanised, never trusted as text. */
function browseTitle(values: Record<string, string | undefined>, brandName?: string): string {
  const brand = brandName ?? (values.brand ? values.brand.replace(/-/g, " ").replace(/w/g, (c) => c.toUpperCase()) : "");
  const category = values.category && isKnownCategory(values.category) ? TYRE_CATEGORY_LABELS[values.category as TyreCategory] : "";
  const type = values.tyre_type && isKnownTyreType(values.tyre_type) ? TYRE_TYPE_LABELS[values.tyre_type as TyreType] : "";
  return [brand, category, type, "tyres"].filter(Boolean).join(" ");
}

function toQueryString(values: Record<string, string | undefined>): string {
  return new URLSearchParams(
    Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  ).toString();
}

/**
 * Tyre-size search UI: requirements §3.1 (P0 core flow). SSR'd (reads
 * `searchParams`, a request-time API), per docs/architecture/02-api-contract.md's
 * "Catalog/search first paint: SSR: SEO-relevant, needs to be crawlable".
 *
 * Doubles as the size-search hub (form + popular sizes) when no size is present.
 * Results view: compact header (H1 + "Change size" chip), tier picks when the
 * data supports them, then the grid with a 260px sticky filter sidebar from
 * 1024px and a sticky bottom "Filters | Sort" bar below that. SEO text,
 * popular sizes and related links come after the grid.
 */
export default async function TyresPage({ searchParams }: { searchParams: RawSearchParams }) {
  const raw = await searchParams;
  const values = normalizeSearchParams(raw);
  const browsing = isBrowseRequest(values);

  if (!isSearchRequest(values) && !browsing) {
    const popularResult = await catalogBackend.popularSizes();
    const popular = popularResult.status === 200 ? (popularResult.body as PopularSizesResponse).data : [];

    return <SizeFinderHub values={values} popular={popular} />;
  }

  const zone = await getServiceZone();
  const staggered = isStaggeredSearch(values);
  const page = Number(values.page ?? "1") || 1;
  // Staggered mode paginates front/rear independently: `front_page` / `rear_page`
  // are two distinct query params (see search-params.ts), not one shared `page`.
  const frontPage = Number(values.front_page ?? "1") || 1;
  const rearPage = Number(values.rear_page ?? "1") || 1;
  const sizeLabel = browsing ? "All sizes" : describeSearchSize(values);
  const searchKey = toQueryString(values);

  const primaryQuery = buildTyreSearchQuery(values, { zoneId: zone?.zoneId, page, frontPage, rearPage });
  let result = await catalogBackend.search(primaryQuery, { cache: "no-store" });

  let staleZone = false;
  if (result.status === 404 && zone) {
    // The server can't set cookies mid-render (only Route Handlers / Server
    // Actions can): re-fetch without the bad zone so no stale-zone price data is
    // shown, and surface `<StaleZoneNotice>` (client) to clear the cookie and
    // re-prompt. See docs/architecture/02-api-contract.md's "never silently fall
    // through to an unfiltered nationwide result".
    staleZone = true;
    const fallbackQuery = buildTyreSearchQuery(values, { page, frontPage, rearPage });
    result = await catalogBackend.search(fallbackQuery, { cache: "no-store" });
  }

  if (result.status === 422) {
    const body = result.body as { message: string; errors?: Record<string, string[]> };
    const SIZE_FIELDS = /^(width|profile|rim_diameter|front_|rear_|staggered)/;
    const badFields = Object.keys(body.errors ?? {});
    if (badFields.length > 0 && !badFields.some((f) => SIZE_FIELDS.test(f)) && countActiveFilters(values) > 0) {
      const first = Object.values(body.errors ?? {})[0]?.[0] ?? body.message;
      return (
        <div className="container-page max-w-3xl py-8 md:py-12">
          <ListingHeader title={browsing ? browseTitle(values) : `${sizeLabel} tyres`} />
          <InvalidFilterState message={first} clearHref={buildFilterHref(values, {})} />
        </div>
      );
    }
    return (
      <div className="container-page max-w-3xl py-8 md:py-12">
        <ListingHeader title="Check your size" />
        <InvalidSizeState message={body.message} values={values} />
      </div>
    );
  }

  if (result.status !== 200) {
    // 503 from a fetch-level failure in backend-client.ts's `call()`, or an
    // unexpected 5xx from Laravel: `body` is `{ message }`, not a paginator.
    const body = result.body as { message?: string };
    return (
      <div className="container-page max-w-3xl py-8 md:py-12">
        <ListingHeader title={browsing ? browseTitle(values) : `${sizeLabel} tyres`} />
        <BackendErrorState message={body.message} retryHref={`/tyres?${searchKey}`} />
      </div>
    );
  }

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Tyres", url: "/tyres" },
  ];

  // Facets (option lists + counts) are scoped to the size only, so they are
  // cacheable for a minute. Not available for staggered (front/rear) searches.
  const facetQuery = new URLSearchParams();
  for (const key of ["width", "profile", "rim_diameter"] as const) if (values[key]) facetQuery.set(key, values[key]);
  const [brandsResult, popularResult, facetsResult] = await Promise.all([
    catalogBackend.brands({ next: { revalidate: 3600 } }),
    catalogBackend.popularSizes({ next: { revalidate: 3600 } }),
    staggered ? Promise.resolve(null) : catalogBackend.facets(facetQuery, { next: { revalidate: 60 } }),
  ]);
  const facets = facetsResult && facetsResult.status === 200 ? (facetsResult.body as TyreFacetsResponse).data : null;
  const brands =
    brandsResult.status === 200
      ? (brandsResult.body as BrandsResponse).data.map((b) => ({ slug: b.slug, name: b.name }))
      : [];
  const popular = popularResult.status === 200 ? (popularResult.body as PopularSizesResponse).data : [];

  const flat = staggered ? null : (result.body as Paginator<TyreListItem>);
  const stag = staggered ? (result.body as StaggeredTyreSearchResult).data : null;
  const tierPicks = flat && page === 1 ? deriveTiers(groupTyresByModel(prepareResults(flat.data, values)))?.picks : undefined;
  const picks = tierPicks && tierPicks.length === 3 ? tierPicks : undefined;
  const pageTitle = browsing ? browseTitle(values, brands.find((b) => b.slug === values.brand)?.name) : `${sizeLabel} tyres`;

  const count = flat
    ? `${flat.meta.total} ${flat.meta.total === 1 ? "tyre" : "tyres"} found`
    : stag
      ? `${stag.front.meta.total} front, ${stag.rear.meta.total} rear found`
      : undefined;

  const patterns = flat
    ? [...new Map(groupTyresByModel(prepareResults(flat.data, {})).map((g) => [g.model.slug, { slug: g.model.slug, name: g.model.name }])).values()]
    : [];

  return (
    <div className="container-page flex min-h-[calc(100dvh-3.5rem)] flex-col pt-6 md:pt-10 lg:block">
      <BreadcrumbJsonLd items={breadcrumbs} />
      <ListingHeader
        title={pageTitle}
        count={count}
        intro={browsing ? undefined : `Compare ${sizeLabel} tyres, then pick a quantity and add them to your cart. Prices include fitting.`}
        actions={<ChangeSizeSheet key={searchKey} values={values} label={browsing ? "Add your size" : undefined} />}
      >
        <ListingUsps />
      </ListingHeader>
      {staleZone && <StaleZoneNotice />}

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <FilterSidebar key={`side-${searchKey}`} values={values} brands={brands} patterns={patterns} facets={facets} />
        <div className="min-w-0">
          {picks && (
            <TierPicks
              picks={picks}
              sizeLabel={sizeLabel}
              size={browsing || staggered ? undefined : { width: values.width, profile: values.profile, rim: values.rim_diameter }}
            />
          )}
          <section aria-labelledby="full-range-heading">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 id="full-range-heading" className="type-h2">
                Browse our full range
              </h2>
              <SortSelect key={`sort-${searchKey}`} values={values} className="hidden lg:block" />
            </div>
            {flat && (
              <TyreSearchResults
                result={flat}
                values={values}
                buildHref={(nextPage) => buildTyresPageHref(values, nextPage)}
              />
            )}
            {stag && (
              <TyreSearchResultsStaggered
                values={values}
                result={stag}
                buildFrontHref={(nextPage) => buildTyresStaggeredPageHref(values, "front", nextPage)}
                buildRearHref={(nextPage) => buildTyresStaggeredPageHref(values, "rear", nextPage)}
              />
            )}
          </section>
        </div>
      </div>

      <ListingExtras
        seoTitle={browsing ? `About ${pageTitle.toLowerCase()}` : `About ${sizeLabel} tyres`}
        seoParagraphs={staggered || browsing ? undefined : sizeSeoCopy(sizeLabel)}
        popular={popular}
        links={[
          { href: "/tyres/by-vehicle", label: "Find tyres by vehicle" },
          { href: "/brands", label: "Browse by brand" },
          { href: "/tyres/latest-releases", label: "Latest releases" },
        ]}
      />
      <FilterBar key={`bar-${searchKey}`} values={values} brands={brands} patterns={patterns} facets={facets} />
    </div>
  );
}
