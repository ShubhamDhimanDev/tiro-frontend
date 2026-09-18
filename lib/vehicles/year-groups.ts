import type { VehicleYearOption } from "./types";

/**
 * Pure grouping/labelling helpers for the year/generation step of
 * `<VehiclePicker>` — split out from the component per this codebase's
 * existing convention of keeping pure logic independently testable (see
 * `lib/catalog/group-by-model.ts`, `lib/catalog/search-params.ts`).
 *
 * `GET /api/v1/vehicles/years` can return more than one `Vehicle` row
 * sharing the same year range (differing only by series/body_type) — this
 * groups rows by year range so the UI can present a single "year" option
 * per range, only asking the user to disambiguate series/body_type when a
 * range actually has more than one candidate row.
 */

export function yearRangeKey(v: Pick<VehicleYearOption, "year_from" | "year_to">): string {
  return `${v.year_from}-${v.year_to ?? "present"}`;
}

export function yearRangeLabel(v: Pick<VehicleYearOption, "year_from" | "year_to">): string {
  return v.year_to ? `${v.year_from}–${v.year_to}` : `${v.year_from}–Present`;
}

/** Falls back to a vehicle-id-based label only if both `series` and `body_type` are unset — a data-entry gap, not expected in practice. */
export function disambiguationLabel(v: Pick<VehicleYearOption, "id" | "series" | "body_type">): string {
  const parts = [v.series, v.body_type].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(" · ") : `Vehicle #${v.id}`;
}

/**
 * Groups rows by year range, preserving `years.data`'s existing order
 * (backend-sorted `year_from` descending) — `Map` iteration order follows
 * insertion order, so no re-sort is needed here.
 */
export function groupByYearRange(rows: VehicleYearOption[]): Map<string, VehicleYearOption[]> {
  const map = new Map<string, VehicleYearOption[]>();
  for (const row of rows) {
    const key = yearRangeKey(row);
    const existing = map.get(key);
    if (existing) existing.push(row);
    else map.set(key, [row]);
  }
  return map;
}
