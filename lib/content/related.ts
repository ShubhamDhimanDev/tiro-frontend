import { contentBackend } from "@/lib/content/backend";
import { contentTypeListingTag } from "@/lib/content/tags";
import type { ContentPageSummary, ContentPageType, ContentPagesResponse } from "@/lib/content/types";

/**
 * Up to `limit` other published pages of the same type, same category first.
 * Reuses the listing request the index page and generateStaticParams already
 * make (same URL, same tag), so it is a Data Cache hit and is revalidated by
 * the same webhook tag.
 */
export async function loadRelated(type: ContentPageType, currentSlug: string, category: string | null, limit = 3): Promise<ContentPageSummary[]> {
  const result = await contentBackend.pages(new URLSearchParams({ type, per_page: "100" }), {
    next: { revalidate: 3600, tags: [contentTypeListingTag(type)] },
  });
  if (result.status !== 200) return [];
  const others = (result.body as ContentPagesResponse).data.filter((p) => p.slug !== currentSlug);
  const same = others.filter((p) => category && p.category === category);
  const rest = others.filter((p) => !same.includes(p));
  return [...same, ...rest].slice(0, limit);
}
