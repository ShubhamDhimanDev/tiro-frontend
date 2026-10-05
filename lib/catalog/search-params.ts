import type { TyreSearchFormValues } from "@/components/catalog/tyre-search-form";

/** Next's `searchParams` prop values can be `string | string[] | undefined` — flatten to the first value. */
export function normalizeSearchParams(
  raw: Record<string, string | string[] | undefined>
): TyreSearchFormValues & Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

export function isStaggeredSearch(values: Record<string, string | undefined>): boolean {
  return values.staggered === "true";
}

export function isSearchRequest(values: Record<string, string | undefined>): boolean {
  if (isStaggeredSearch(values)) {
    return Boolean(
      values.front_width || values.front_profile || values.front_rim_diameter || values.rear_width || values.rear_profile || values.rear_rim_diameter
    );
  }
  return Boolean(values.width || values.profile || values.rim_diameter);
}

/**
 * A filter-only browse: no size, but a brand, category or type (what an offer's
 * "Shop this offer" link sends, e.g. `/tyres?brand=bridgestone&category=suv`).
 * The API accepts these without a size, so the listing shows them rather than
 * the size-search hub.
 */
export function isBrowseRequest(values: Record<string, string | undefined>): boolean {
  return !isSearchRequest(values) && Boolean(values.brand || values.category || values.tyre_type);
}

/**
 * Extra sidebar filters (Phase 7: all forwarded to the API, which applies them
 * server-side): `min_load`, `min_speed`, `runflat`, `pattern` (CSV of model
 * slugs), `price_min` / `price_max` (whole AUD dollars), `car_make`.
 * `brand`, `tyre_type` and `category` also accept CSV (multi-select).
 */
export const EXTRA_FILTER_KEYS = ["min_load", "min_speed", "runflat", "pattern", "price_min", "price_max", "car_make"] as const;

export const PASSTHROUGH_FIELDS = [
  "width",
  "profile",
  "rim_diameter",
  "staggered",
  "front_width",
  "front_profile",
  "front_rim_diameter",
  "rear_width",
  "rear_profile",
  "rear_rim_diameter",
  "brand",
  "tyre_type",
  "category",
  "sort",
  "per_page",
  ...EXTRA_FILTER_KEYS,
] as const;

const HREF_FIELDS = PASSTHROUGH_FIELDS;

/**
 * Builds the `URLSearchParams` sent to `catalogBackend.search`, appending
 * `zone` only when resolved.
 *
 * Pagination: non-staggered requests use the standard `page` param.
 * Staggered requests use `front_page`/`rear_page` instead — two distinct
 * Laravel paginator page-name query params that `TyreController::index()`
 * uses to paginate the front and rear sides independently, since they're
 * frequently entirely different SKUs/models with different result counts.
 * (Not spelled out in `docs/architecture/02-api-contract.md`'s query-param
 * table, which only lists a single `page` — confirmed against the real
 * backend implementation; see `frontend/CLAUDE.md`'s catalogue section.)
 */
export function buildTyreSearchQuery(
  values: Record<string, string | undefined>,
  opts: { zoneId?: string; page?: number; frontPage?: number; rearPage?: number } = {}
): URLSearchParams {
  const params = new URLSearchParams();
  for (const field of PASSTHROUGH_FIELDS) {
    const value = values[field];
    if (value) params.set(field, value);
  }
  if (opts.zoneId) params.set("zone", opts.zoneId);

  if (isStaggeredSearch(values)) {
    params.set("front_page", String(opts.frontPage ?? values.front_page ?? 1));
    params.set("rear_page", String(opts.rearPage ?? values.rear_page ?? 1));
  } else {
    params.set("page", String(opts.page ?? values.page ?? 1));
  }
  return params;
}

/** Builds a `/tyres?...` href preserving the current filters but updating `page`. Non-staggered only — see `buildTyresStaggeredPageHref` for staggered mode's independent front/rear pagination. */
export function buildTyresPageHref(values: Record<string, string | undefined>, page: number): string {
  const params = new URLSearchParams();
  for (const field of HREF_FIELDS) {
    const value = values[field];
    if (value) params.set(field, value);
  }
  params.set("page", String(page));
  return `/tyres?${params.toString()}`;
}

/**
 * Builds a `/tyres?...` href for staggered mode, updating only the given
 * side's page (`front_page` or `rear_page`) while preserving the other
 * side's current page — paging through front results must not move which
 * page of rear results is shown, and vice versa.
 */
export function buildTyresStaggeredPageHref(
  values: Record<string, string | undefined>,
  side: "front" | "rear",
  page: number
): string {
  const params = new URLSearchParams();
  for (const field of HREF_FIELDS) {
    const value = values[field];
    if (value) params.set(field, value);
  }
  params.set("front_page", String(side === "front" ? page : values.front_page ?? 1));
  params.set("rear_page", String(side === "rear" ? page : values.rear_page ?? 1));
  return `/tyres?${params.toString()}`;
}
