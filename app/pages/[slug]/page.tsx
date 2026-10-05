import type { Metadata } from "next";
import { NOT_FOUND_METADATA, pageMetadata } from "@/lib/site/seo";
import { notFound } from "next/navigation";
import { contentBackend } from "@/lib/content/backend";
import { contentPageDetailTag, contentTypeListingTag } from "@/lib/content/tags";
import { resolveMetaDescription, resolveMetaTitle, resolveOgImage } from "@/lib/content/seo";
import { ContentLanding } from "@/components/content/content-landing";
import { samplePage } from "@/lib/content/sample";
import type { ContentPageDetail, ContentPageDetailResponse, ContentPagesResponse } from "@/lib/content/types";

/**
 * General static `page`-type `ContentPage` detail — "About Us", "Terms of
 * Service", and similar arbitrary admin-authored pages with no more
 * specific type. `GET /api/v1/content/pages/page/{slug}`.
 *
 * **Route judgment call**: `/pages/{slug}` rather than a bare root-level
 * `/{slug}` — a flat top-level catch-all would collide with (or need to be
 * carefully ordered against) every other static route this app already
 * owns (`/tyres`, `/brands`, `/cart`, `/checkout`, `/booking`, `/orders`,
 * `/blog`, `/guides`, `/faq`, ...), and Next's file-based routing has no
 * clean way to say "this dynamic segment, but only as a fallback after
 * every literal route above it fails to match." `/pages/{slug}` avoids that
 * entirely at the cost of one extra path segment — flagged in the
 * completion report as a call worth revisiting with project-architect if a
 * literal root-level URL is a hard SEO requirement for these pages.
 */

export const dynamicParams = true;
export const revalidate = 3600;

async function loadStaticPage(slug: string): Promise<ContentPageDetail | null> {
  const result = await contentBackend.pageDetail("page", slug, {
    next: { revalidate: 3600, tags: [contentPageDetailTag("page", slug)] },
  });
  if (result.status !== 200) return samplePage(slug);
  return (result.body as ContentPageDetailResponse).data;
}

export async function generateStaticParams() {
  const result = await contentBackend.pages(new URLSearchParams({ type: "page", per_page: "100" }), {
    next: { tags: [contentTypeListingTag("page")] },
  });
  if (result.status !== 200) return [];
  return (result.body as ContentPagesResponse).data.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadStaticPage(slug);
  if (!page) return NOT_FOUND_METADATA;

  const ogImage = resolveOgImage(page);
  return pageMetadata({
    title: resolveMetaTitle(page),
    description: resolveMetaDescription(page),
    path: `/pages/${page.slug}`,
    image: ogImage,
    type: "website",
  });
}

export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await loadStaticPage(slug);
  if (!page) notFound();

  const crumbs = [{ name: "Home", url: "/" }, { name: page.title, url: `/pages/${page.slug}` }];

  return (
    <>
      <ContentLanding page={page} crumbs={crumbs} />
    </>
  );
}
