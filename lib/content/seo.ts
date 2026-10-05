import type { ContentPageDetail, ContentPageSummary } from "./types";

/**
 * SEO-field fallback — confirmed this round that the live API does **not**
 * resolve these server-side (`ContentPageSummaryResource`'s own doc comment:
 * "the 'falls back to title/excerpt when null' rule is a frontend-rendering
 * concern, not something this API resolves server-side"; verified directly
 * against a live response too — `meta_title`/`meta_description`/
 * `og_image_path` all came back raw/`null`, not pre-resolved). Applied once
 * here, at every content-page `generateMetadata`/render call site, rather
 * than duplicating the `??` fallback chain per page.
 */

export function resolveMetaTitle(page: Pick<ContentPageSummary, "meta_title" | "title">): string {
  return page.meta_title ?? page.title;
}

export function resolveMetaDescription(page: Pick<ContentPageSummary, "meta_description" | "excerpt">): string | undefined {
  return page.meta_description ?? page.excerpt ?? undefined;
}

export function resolveOgImage(page: Pick<ContentPageDetail, "og_image_path" | "featured_image_path">): string | null {
  return page.og_image_path ?? page.featured_image_path ?? null;
}
