import { NextResponse } from "next/server";
import { catalogBackend } from "@/lib/catalog/backend";
import { buildTyreSearchQuery, isStaggeredSearch, normalizeSearchParams } from "@/lib/catalog/search-params";
import { getServiceZone } from "@/lib/location/cookies";
import type { Paginator, StaggeredTyreSearchResult, TyreListItem } from "@/lib/catalog/types";

/**
 * GET /api/catalog/tyres/count?<same params as /tyres> returns `{ total }`, the
 * number of matching tyres for the "Show N tyres" button on the filter sheet.
 *
 * It asks `GET /api/v1/tyres` for one row (`per_page=1`) and reads `meta.total`
 * (Phase 6a documents this as the cheap count). A staggered search returns the
 * front and rear totals added together. The visitor's zone cookie is applied so
 * the count matches the listing. Never cached: it changes with every draft.
 *
 * 200 `{ total: number }`, or `{ total: null }` when the count is unavailable
 * (the button then falls back to "Apply").
 */
export async function GET(request: Request) {
  const raw: Record<string, string> = {};
  new URL(request.url).searchParams.forEach((value, key) => {
    if (!(key in raw)) raw[key] = value;
  });
  const values = normalizeSearchParams(raw);
  const zone = await getServiceZone();

  const query = buildTyreSearchQuery(values, { zoneId: zone?.zoneId, page: 1, frontPage: 1, rearPage: 1 });
  query.set("per_page", "1");

  const result = await catalogBackend.search(query, { cache: "no-store" });
  if (result.status !== 200) return NextResponse.json({ total: null });

  if (isStaggeredSearch(values)) {
    const { front, rear } = (result.body as StaggeredTyreSearchResult).data;
    return NextResponse.json({ total: (front?.meta?.total ?? 0) + (rear?.meta?.total ?? 0) });
  }
  const total = (result.body as Paginator<TyreListItem>).meta?.total;
  return NextResponse.json({ total: typeof total === "number" ? total : null });
}
