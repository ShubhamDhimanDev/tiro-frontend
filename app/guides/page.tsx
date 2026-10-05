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
 * Guides listing, SSG/ISR, same shape as `app/blog/page.tsx` (client-side
 * category chips and "Show more"; see that file's comment for why not
 * `searchParams`).
 */

export const metadata: Metadata = pageMetadata({
  title: "Guides | Tiro Mobile Tyres",
  description: "Buying guides and how-tos to help you choose the right tyres.",
  path: "/guides",
});

export const revalidate = 3600;

async function loadGuides() {
  const params = new URLSearchParams({ type: "guide", per_page: "100" });
  try {
    const result = await contentBackend.pages(params, {
      next: { revalidate: 3600, tags: [contentTypeListingTag("guide")] },
    });
    if (result.status !== 200) return [];
    const data = (result.body as ContentPagesResponse | null)?.data;
    return Array.isArray(data) ? data : [];
  } catch {
    // A transient content-API failure must degrade to the empty state, never a 500.
    return [];
  }
}

const crumbs = [
  { name: "Home", url: "/" },
  { name: "Guides", url: "/guides" },
];

export default async function GuidesIndexPage() {
  const live = await loadGuides();
  const sample = SAMPLE_CONTENT_ENABLED && live.length === 0;
  const guides = sample ? sampleSummaries("guide") : live;

  return (
    <>
      <PageHero
        crumbs={crumbs}
        eyebrow="Help center"
        title={
<Mark>Guides</Mark>
        }
        lead="Buying guides and how-tos to help you choose the right tyres."
      />
      <div className="container-page py-10 md:py-14">
        {guides.length === 0 ? (
          <p className="rounded-card border border-line bg-surface p-6 text-muted">No guides published yet. Check back soon.</p>
        ) : (
          <ContentExplorer items={guides} basePath="/guides" noun="guides" />
        )}
        {sample && guides.length > 0 && (
          <p data-testid="sample-note" className="mt-6 text-xs text-muted">
            {SAMPLE_NOTE}
          </p>
        )}
      </div>
      <CtaBands />
    </>
  );
}
