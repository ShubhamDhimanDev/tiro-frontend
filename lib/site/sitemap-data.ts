import { catalogBackend } from "@/lib/catalog/backend";
import type { BrandsResponse, Paginator, TyreListItem } from "@/lib/catalog/types";
import { contentBackend } from "@/lib/content/backend";
import { contentTypeListingTag } from "@/lib/content/tags";
import type { ContentPageSummary, ContentPagesResponse, ContentPageType } from "@/lib/content/types";
import { cityHref, loadLocationTree } from "@/lib/locations/helpers";
import { loadOffers } from "@/lib/offers/load";
import { SERVICE_CONTENT } from "@/lib/site/services";
import { INFO_PAGES } from "@/lib/site/info-pages";

export type SitemapEntry = { path: string; lastModified?: string; priority?: number; changeFrequency?: "daily" | "weekly" | "monthly" };

/** Indexable static routes. Account, cart, checkout, booking and order pages are deliberately absent. */
export const STATIC_PATHS: SitemapEntry[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/tyres", priority: 0.9, changeFrequency: "daily" },
  { path: "/tyres/by-vehicle", priority: 0.6, changeFrequency: "weekly" },
  { path: "/tyres/type", priority: 0.6, changeFrequency: "weekly" },
  { path: "/tyres/latest-releases", priority: 0.6, changeFrequency: "weekly" },
  { path: "/brands", priority: 0.8, changeFrequency: "weekly" },
  { path: "/deals", priority: 0.8, changeFrequency: "daily" },
  { path: "/locations", priority: 0.9, changeFrequency: "weekly" },
  { path: "/services", priority: 0.7, changeFrequency: "monthly" },
  { path: "/fleet", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/guides", priority: 0.6, changeFrequency: "weekly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/help", priority: 0.5, changeFrequency: "monthly" },
  { path: "/reviews", priority: 0.5, changeFrequency: "daily" },
  ...Object.values(INFO_PAGES).map(({ path }) => ({ path, priority: 0.5, changeFrequency: "monthly" as const })),
  ...SERVICE_CONTENT.filter((s) => s.slug !== "fleet").map((s) => ({ path: `/services/${s.slug}`, priority: 0.6, changeFrequency: "monthly" as const })),
];

async function contentEntries(type: ContentPageType, prefix: string): Promise<SitemapEntry[]> {
  const result = await contentBackend.pages(new URLSearchParams({ type, per_page: "100" }), {
    next: { revalidate: 3600, tags: [contentTypeListingTag(type)] },
  });
  if (result.status !== 200) return [];
  return ((result.body as ContentPagesResponse).data as ContentPageSummary[]).map((p) => ({
    path: `${prefix}/${p.slug}`,
    lastModified: p.updated_at ?? p.published_at ?? undefined,
    priority: 0.5,
  }));
}

async function tyreEntries(): Promise<SitemapEntry[]> {
  const out: SitemapEntry[] = [];
  for (let page = 1; page <= 30; page++) {
    const result = await catalogBackend.search(new URLSearchParams({ page: String(page), per_page: "100" }), {
      next: { revalidate: 3600 },
    });
    if (result.status !== 200) break;
    const body = result.body as Paginator<TyreListItem>;
    if (!Array.isArray(body.data)) break;
    for (const t of body.data) out.push({ path: `/tyres/${t.slug}`, priority: 0.6, changeFrequency: "daily" });
    if (!body.meta || page >= body.meta.last_page) break;
  }
  return out;
}

async function brandEntries(): Promise<SitemapEntry[]> {
  const result = await catalogBackend.brands({ next: { revalidate: 3600 } });
  if (result.status !== 200) return [];
  return ((result.body as BrandsResponse).data ?? []).map((b) => ({ path: `/brands/${b.slug}`, priority: 0.7, changeFrequency: "weekly" as const }));
}

async function locationEntries(): Promise<SitemapEntry[]> {
  const tree = await loadLocationTree();
  // Suburb pages canonicalise to their city page, so they are not listed.
  return tree.flatMap((s) => [
    { path: `/locations/${s.slug}`, priority: 0.7, changeFrequency: "weekly" as const },
    ...s.cities.map((c) => ({ path: cityHref(s.slug, c.slug), priority: 0.8, changeFrequency: "weekly" as const })),
  ]);
}

async function offerEntries(): Promise<SitemapEntry[]> {
  return (await loadOffers()).map((o) => ({ path: `/deals/${o.slug}`, priority: 0.6, changeFrequency: "daily" as const, lastModified: o.starts_at }));
}

/** Every indexable URL the API knows about. Each source fails soft to `[]`. */
export async function collectSitemapEntries(): Promise<SitemapEntry[]> {
  const parts = await Promise.all([
    tyreEntries(),
    brandEntries(),
    locationEntries(),
    offerEntries(),
    contentEntries("blog_post", "/blog"),
    contentEntries("guide", "/guides"),
    contentEntries("page", "/pages"),
    contentEntries("promo_landing", "/promotions"),
    contentEntries("location_page", "/locations"),
  ]);
  const seen = new Set<string>();
  return [...STATIC_PATHS, ...parts.flat()].filter((e) => (seen.has(e.path) ? false : (seen.add(e.path), true)));
}
