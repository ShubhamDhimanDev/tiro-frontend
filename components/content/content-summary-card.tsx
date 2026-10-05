import Link from "next/link";
import { ArticleImage } from "@/components/content/article-image";
import { ImageSlot } from "@/components/page/image-slot";
import { blogImageKey } from "@/lib/site/content-images";
import { categoryLabel, formatArticleDate } from "@/lib/content/prose";
import type { ContentPageSummary } from "@/lib/content/types";

/**
 * Shared listing card for a `ContentPageSummary` — used by the blog and guides
 * indexes and the Help Centre. One link per card (the whole card), so a post
 * is never announced twice. `featured` renders the large horizontal variant.
 */
export function ContentSummaryCard({
  item,
  href,
  featured = false,
  headingLevel = 2,
}: {
  item: ContentPageSummary;
  href: string;
  featured?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const category = categoryLabel(item.category);

  const placeholder = <ImageSlot slot={blogImageKey(item.category)} rounded={false} className="h-full" />;
  const media = item.featured_image_path ? (
    <ArticleImage src={item.featured_image_path} className="aspect-video h-full w-full object-cover" fallback={placeholder} />
  ) : (
    placeholder
  );

  if (featured) {
    return (
      <Link
        href={href}
        className="group grid overflow-hidden rounded-card border border-line bg-surface shadow-rest transition-shadow hover:shadow-raised md:grid-cols-2"
      >
        <div className="overflow-hidden">{media}</div>
        <div className="flex flex-col justify-center gap-3 p-5 md:p-8">
          {category && <p className="type-eyebrow font-bold capitalize text-link">{category}</p>}
          <Heading className="type-h2 text-balance group-hover:underline">{item.title}</Heading>
          {item.excerpt && <p className="line-clamp-3 text-muted">{item.excerpt}</p>}
          <p className="type-small text-muted">
            {item.published_at && <time dateTime={item.published_at}>{formatArticleDate(item.published_at)}</time>}
          </p>
          <span className="inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4">Read the article</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-rest transition-shadow hover:shadow-raised"
    >
      <div className="overflow-hidden">{media}</div>
      <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
        {category && <p className="type-eyebrow font-bold capitalize text-link">{category}</p>}
        <Heading className="text-lg font-bold leading-snug text-ink group-hover:underline">{item.title}</Heading>
        {item.excerpt && <p className="line-clamp-3 text-muted">{item.excerpt}</p>}
        {item.published_at && (
          <p className="type-small mt-auto pt-1 text-muted">
            <time dateTime={item.published_at}>{formatArticleDate(item.published_at)}</time>
          </p>
        )}
      </div>
    </Link>
  );
}
