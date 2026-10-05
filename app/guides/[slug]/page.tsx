import type { Metadata } from "next";
import { NOT_FOUND_METADATA, pageMetadata } from "@/lib/site/seo";
import { notFound } from "next/navigation";
import { contentBackend } from "@/lib/content/backend";
import { contentPageDetailTag, contentTypeListingTag } from "@/lib/content/tags";
import { resolveMetaDescription, resolveMetaTitle, resolveOgImage } from "@/lib/content/seo";
import { ContentPageBody } from "@/components/content/content-page-body";
import { loadRelated } from "@/lib/content/related";
import { sampleDetail } from "@/lib/content/sample";
import type { ContentPageDetail, ContentPageDetailResponse, ContentPagesResponse } from "@/lib/content/types";

/**
 * Guide detail — SSG/ISR, `GET /api/v1/content/pages/guide/{slug}`. Same
 * shape as `app/blog/[slug]/page.tsx`, mirrored rather than parameterized
 * into a shared route: each type has its own breadcrumb trail and static
 * metadata, and Next's file-based routing doesn't let `type` be a route
 * param without collapsing blog/guide/location/promo/page into one shared
 * URL prefix, which the task brief's "your call" on routing didn't ask for.
 */

export const dynamicParams = true;
export const revalidate = 3600;

async function loadGuide(slug: string): Promise<ContentPageDetail | null> {
  const result = await contentBackend.pageDetail("guide", slug, {
    next: { revalidate: 3600, tags: [contentPageDetailTag("guide", slug)] },
  });
  if (result.status !== 200) return sampleDetail("guide", slug);
  return (result.body as ContentPageDetailResponse).data;
}

export async function generateStaticParams() {
  const result = await contentBackend.pages(new URLSearchParams({ type: "guide", per_page: "100" }), {
    next: { tags: [contentTypeListingTag("guide")] },
  });
  if (result.status !== 200) return [];
  return (result.body as ContentPagesResponse).data.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = await loadGuide(slug);
  if (!guide) return NOT_FOUND_METADATA;

  const ogImage = resolveOgImage(guide);
  return pageMetadata({
    title: resolveMetaTitle(guide),
    description: resolveMetaDescription(guide),
    path: `/guides/${guide.slug}`,
    image: ogImage,
    type: "article",
  });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await loadGuide(slug);
  if (!guide) notFound();

  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Guides", url: "/guides" },
    { name: guide.title, url: `/guides/${guide.slug}` },
  ];
  const related = await loadRelated("guide", guide.slug, guide.category);

  return (
    <>
      <ContentPageBody page={guide} crumbs={crumbs} related={related} relatedBasePath="/guides" toc />
    </>
  );
}
