import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site/seo";
import { contentBackend } from "@/lib/content/backend";
import { contentTypeListingTag } from "@/lib/content/tags";
import { ContentExplorer } from "@/components/content/content-explorer";
import { CtaBands } from "@/components/page/cta-bands";
import { Mark, PageHero } from "@/components/page/page-hero";
import { sampleSummaries } from "@/lib/content/sample";
import { SAMPLE_CONTENT_ENABLED, SAMPLE_NOTE } from "@/lib/site/sample";
import type { ContentPagesResponse } from "@/lib/content/types";

/**
 * Blog listing, SSG/ISR, per docs/architecture/02-api-contract.md's
 * rendering-split table ("Brand pages, blog, guides, location/FAQ content,
 * ... SEO-critical, changes infrequently, safe to cache").
 *
 * Category chips and "Show more" are client-side (`<ContentExplorer>`): the
 * endpoint does support `?category=` and `page`, but reading `searchParams`
 * here would force per-request rendering (this project's `cacheComponents`
 * flag is off), defeating the SSG/ISR mandate for exactly the page type this
 * file exists to keep static. So the full list (`per_page=100`, the
 * endpoint's max) is fetched once at build/revalidate time and revealed nine
 * at a time in the browser. Past 100 posts this needs real paged routes.
 */

export const metadata: Metadata = pageMetadata({
  title: "Blog | Tiro Mobile Tyres",
  description: "Tyre care tips, maintenance advice, and news from Tiro Mobile Tyres.",
  path: "/blog",
});

export const revalidate = 3600;

async function loadPosts() {
  const params = new URLSearchParams({ type: "blog_post", per_page: "100" });
  const result = await contentBackend.pages(params, {
    next: { revalidate: 3600, tags: [contentTypeListingTag("blog_post")] },
  });
  if (result.status !== 200) return [];
  return (result.body as ContentPagesResponse).data;
}

const crumbs = [
  { name: "Home", url: "/" },
  { name: "Blog", url: "/blog" },
];

export default async function BlogIndexPage() {
  const live = await loadPosts();
  const sample = SAMPLE_CONTENT_ENABLED && live.length === 0;
  const posts = sample ? sampleSummaries("blog_post") : live;

  return (
    <>
      <PageHero
        crumbs={crumbs}
        eyebrow="Help center"
        title={
<Mark>Blog</Mark>
        }
        lead="Tyre care tips, maintenance advice and news from the Tiro team."
      />
      <div className="container-page py-10 md:py-14">
        {posts.length === 0 ? (
          <p className="rounded-card border border-line bg-surface p-6 text-muted">No posts published yet. Check back soon.</p>
        ) : (
          <ContentExplorer items={posts} basePath="/blog" noun="posts" featured />
        )}
        {sample && posts.length > 0 && (
          <p data-testid="sample-note" className="mt-6 text-xs text-muted">
            {SAMPLE_NOTE}
          </p>
        )}
      </div>
      <CtaBands />
    </>
  );
}
