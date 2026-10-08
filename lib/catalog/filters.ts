import { EXTRA_FILTER_KEYS, PASSTHROUGH_FIELDS } from "./search-params";
import { TYRE_CATEGORIES, TYRE_TYPES } from "./types";

/**
 * URL-driven catalogue filters. Every value lives in the query string so the
 * results stay server-rendered and shareable; nothing here is client state.
 */
export interface FilterValues {
  brand?: string;
  tyre_type?: string;
  category?: string;
  sort?: string;
  min_load?: string;
  min_speed?: string;
  runflat?: string;
  /** Comma-separated model slugs. */
  pattern?: string;
  price_min?: string;
  price_max?: string;
  car_make?: string;
  /** Size overrides (the sidebar size selects). Absent = keep the URL size. */
  width?: string;
  profile?: string;
  rim_diameter?: string;
}

export const FILTER_KEYS = ["brand", "tyre_type", "category", ...EXTRA_FILTER_KEYS] as const;

/** Values accepted by the API's `sort` param (TyreIndexRequest). Empty = API default (newest). */
export const SORT_OPTIONS = [
  { value: "", label: "Newest", short: "Newest" },
  { value: "price_asc", label: "Price: low to high", short: "Lowest price" },
  { value: "price_desc", label: "Price: high to low", short: "Highest price" },
  { value: "name_asc", label: "Name: A to Z", short: "Name A to Z" },
] as const;

export function isKnownTyreType(value: string | undefined): boolean {
  return !!value && (TYRE_TYPES as readonly string[]).includes(value);
}

export function isKnownCategory(value: string | undefined): boolean {
  return !!value && (TYRE_CATEGORIES as readonly string[]).includes(value);
}

/** Number of active filters (sort is not a filter). */
export function countActiveFilters(values: FilterValues): number {
  return FILTER_KEYS.filter((key) => Boolean(values[key])).length;
}

const SIZE_KEYS = ["width", "profile", "rim_diameter"] as const;
const FILTER_AND_SORT = new Set<string>([...FILTER_KEYS, "sort"]);

/**
 * `/tyres?...` href that keeps the size (and `per_page`) from `current`,
 * replaces brand / tyre_type / category / sort with `next`, and always drops
 * pagination: a changed filter must land on page 1 of both sides.
 */
export function buildFilterHref(current: Record<string, string | undefined>, next: FilterValues): string {
  const params = new URLSearchParams();
  for (const field of PASSTHROUGH_FIELDS) {
    if (FILTER_AND_SORT.has(field)) continue;
    const value = current[field];
    if (value) params.set(field, value);
  }
  for (const key of [...FILTER_KEYS, "sort"] as const) {
    const value = next[key];
    if (value) params.set(key, value);
  }
  for (const key of SIZE_KEYS) {
    const value = next[key];
    if (value) params.set(key, value);
  }
  return `/tyres?${params.toString()}`;
}

/** True when the URL carries anything beyond the size itself (used to keep filter URLs out of the index). */
export function hasFilterParams(values: Record<string, string | undefined>): boolean {
  return Boolean(
    values.brand || values.tyre_type || values.category || values.sort || values.per_page || EXTRA_FILTER_KEYS.some((key) => values[key]),
  );
}

/** `205/55 R16` for a full size; a partial size (only some fields filled) lists what is set, e.g. `R17`. */
export function sizeLabel(width?: string | number, profile?: string | number, rim?: string | number): string {
  if (width && profile && rim) return `${width}/${profile} R${rim}`;
  const parts = [width ? `${width}mm` : null, profile ? `${profile} profile` : null, rim ? `R${rim}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "All sizes";
}

/** Human size label for a search request: `205/55 R16`, or `Front 205/55 R16 / Rear 225/45 R17`. */
export function describeSearchSize(values: Record<string, string | undefined>): string {
  if (values.staggered === "true") {
    const front = sizeLabel(values.front_width, values.front_profile, values.front_rim_diameter);
    const rear = sizeLabel(values.rear_width, values.rear_profile, values.rear_rim_diameter);
    return `Front ${front} / Rear ${rear}`;
  }
  return sizeLabel(values.width, values.profile, values.rim_diameter);
}
