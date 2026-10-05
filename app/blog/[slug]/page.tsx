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
 * Blog post detail — SSG/ISR, `GET /api/v1/content/pages/blog_post/{slug}`.
 * Tagged `content:blog_post:{slug}` (own fetch) per
 * docs/architecture/02-api-contract.md's ISR revalidation table — fired by
 * `ContentPage::revalidationTags()` on any create/update/delete of this row.
 */

export const dynamicParams = true;
export const revalidate = 3600;

async function loadPost(slug: string): Promise<ContentPageDetail | null> {
  const result = await contentBackend.pageDetail("blog_post", slug, {
    next: { revalidate: 3600, tags: [contentPageDetailTag("blog_post", slug)] },
  });
  if (result.status !== 200) return sampleDetail("blog_post", slug);
  return (result.body as ContentPageDetailResponse).data;
}

// Same judgment call as app/tyres/[slug]/page.tsx's generateStaticParams
// doc comment: no dedicated "list every slug" endpoint, reuses the listing
// endpoint at its max per_page. Any slug not covered here still renders
// on-demand and is cached from then on (`dynamicParams = true`).
export async function generateStaticParams() {
  const result = await contentBackend.pages(new URLSearchParams({ type: "blog_post", per_page: "100" }), {
    next: { tags: [contentTypeListingTag("blog_post")] },
  });
  if (result.status !== 200) return [];
  return (result.body as ContentPagesResponse).data.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return NOT_FOUND_METADATA;

  const ogImage = resolveOgImage(post);
  return pageMetadata({
    title: resolveMetaTitle(post),
    description: resolveMetaDescription(post),
    path: `/blog/${post.slug}`,
    image: ogImage,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: post.title, url: `/blog/${post.slug}` },
  ];
  const related = await loadRelated("blog_post", post.slug, post.category);

  return (
    <>
      <ContentPageBody page={post} crumbs={crumbs} related={related} relatedBasePath="/blog" />
    </>
  );
}
