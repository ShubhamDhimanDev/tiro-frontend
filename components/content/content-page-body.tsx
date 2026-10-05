import type { ContentPageDetail, ContentPageSummary } from "@/lib/content/types";
import { categoryLabel, formatArticleDate, isUpdatedAfterPublish, readingMinutes, withHeadingIds } from "@/lib/content/prose";
import { Prose } from "@/components/content/prose";
import { ArticleToc } from "@/components/content/article-toc";
import { FindTyresCta } from "@/components/content/find-tyres-cta";
import { RelatedArticles } from "@/components/content/related-articles";
import { CtaBands } from "@/components/page/cta-bands";
import { ArticleImage } from "@/components/content/article-image";
import { ImageSlot } from "@/components/page/image-slot";
import { PageHero } from "@/components/page/page-hero";
import { blogImageKey } from "@/lib/site/content-images";

/**
 * Article template for blog posts and guides: the standard black hero band
 * (breadcrumb, category, H1, excerpt, published date and reading time; emits
 * the BreadcrumbList JSON-LD), a hero image at a fixed 16:9 (the real image,
 * or a labelled placeholder slot keyed by category, so there is no layout
 * shift), one readable column (68ch) with typographic body, one soft CTA,
 * related articles and the closing CTA stack. Guides with three or more
 * sections also get an "On this page" outline in a sticky desktop column.
 *
 * `body` is rendered HTML authored in the admin's rich-text editor, trusted
 * content from an internal admin surface (RBAC-gated on `content.manage`),
 * not user-submitted input, so `dangerouslySetInnerHTML` (inside `<Prose>`)
 * is the correct tool here rather than a sanitizer pass this content was
 * never written in. If the editor ever becomes reachable by a lower-trust
 * role this needs revisiting (security-agent's territory).
 */
export function ContentPageBody({
  page,
  crumbs,
  related = [],
  relatedBasePath,
  toc = false,
  cta = true,
  children,
}: {
  page: ContentPageDetail;
  crumbs: { name: string; url: string }[];
  related?: ContentPageSummary[];
  relatedBasePath?: string;
  /** Show the desktop outline when the body has 3+ sections. */
  toc?: boolean;
  cta?: boolean;
  children?: React.ReactNode;
}) {
  const { html, toc: entries } = withHeadingIds(page.body);
  const showToc = toc && entries.filter((e) => e.level === 2).length >= 3;
  const minutes = readingMinutes(page.body);
  const category = categoryLabel(page.category);

  return (
    <>
      <PageHero
        crumbs={crumbs}
        eyebrow={category ?? undefined}
        title={page.title}
        lead={page.excerpt ?? undefined}
      >
        {page.published_at && (
          <p className="type-small text-white/70">
            Published <time dateTime={page.published_at}>{formatArticleDate(page.published_at)}</time>
            {page.updated_at && isUpdatedAfterPublish(page.published_at, page.updated_at) && (
              <>
                <span aria-hidden="true"> · </span>
                Updated <time dateTime={page.updated_at}>{formatArticleDate(page.updated_at)}</time>
              </>
            )}
            <span aria-hidden="true"> · </span>
            {minutes} min read
          </p>
        )}
      </PageHero>

      <div className="container-page py-8 md:py-12">
        <div className={showToc ? "grid gap-12 lg:grid-cols-[minmax(0,68ch)_15rem] lg:justify-center" : "mx-auto max-w-[68ch]"}>
          <article className="min-w-0">
            {page.featured_image_path ? (
              <ArticleImage
                src={page.featured_image_path}
                className="aspect-video w-full rounded-card object-cover"
                fallback={<ImageSlot slot={blogImageKey(page.category)} />}
              />
            ) : (
              <ImageSlot slot={blogImageKey(page.category)} />
            )}

            <Prose html={html} className="mt-8" />

            {children}
            {cta && <FindTyresCta className="mt-12" />}
          </article>

          {showToc && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <ArticleToc entries={entries} />
              </div>
            </aside>
          )}
        </div>

        {related.length > 0 && relatedBasePath && (
          <div className="mx-auto mt-14 max-w-5xl">
            <RelatedArticles items={related} basePath={relatedBasePath} />
          </div>
        )}
      </div>
      <CtaBands />
    </>
  );
}
