import { catalogBackend } from "@/lib/catalog/backend";
import type { BrandsResponse } from "@/lib/catalog/types";
import { cityHref, loadLocationTree } from "@/lib/locations/helpers";
import { loadOffers } from "@/lib/offers/load";
import type { Offer } from "@/lib/offers/types";
import { reviewsBackend } from "@/lib/reviews/backend";
import { reviewsTag } from "@/lib/reviews/tags";
import type { Review, ReviewsResponse, ReviewsSummary } from "@/lib/reviews/types";

/**
 * Server-side loaders for the home page. Every loader fails soft (empty list /
 * null) so the page renders with the API down and each section hides itself.
 */

export type HomeBrand = { name: string; slug: string };
export type HomeCity = { name: string; href: string };

export async function loadHomeOffers(limit = 8): Promise<Offer[]> {
  return (await loadOffers()).slice(0, limit);
}

export async function loadHomeBrands(limit = 14): Promise<HomeBrand[]> {
  const result = await catalogBackend.brands({ next: { revalidate: 3600 } });
  if (result.status !== 200) return [];
  const data = (result.body as BrandsResponse).data;
  if (!Array.isArray(data)) return [];
  return data.slice(0, limit).map((b) => ({ name: b.name, slug: b.slug }));
}

export async function loadHomeCities(): Promise<HomeCity[]> {
  const tree = await loadLocationTree();
  return tree.flatMap((s) => s.cities.map((c) => ({ name: c.name, href: cityHref(s.slug, c.slug) })));
}

export type HomeReviews = { reviews: Review[]; summary: ReviewsSummary | null };

/** Latest written reviews (rating >= 4, with text) for the home page; no sample fallback. */
export async function loadHomeReviews(limit = 4): Promise<HomeReviews> {
  const params = new URLSearchParams({ page: "1", per_page: "12" });
  const result = await reviewsBackend.list(params, { next: { revalidate: 86400, tags: [reviewsTag()] } });
  if (result.status !== 200) return { reviews: [], summary: null };
  const body = result.body as ReviewsResponse;
  const all = Array.isArray(body.data) ? body.data : [];
  const reviews = all.filter((r) => r.body && r.rating >= 4).slice(0, limit);
  const summary = body.meta?.summary && body.meta.summary.total_count > 0 ? body.meta.summary : null;
  return { reviews, summary };
}
