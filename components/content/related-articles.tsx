import Link from "next/link";
import { ArticleImage } from "@/components/content/article-image";
import { ImageSlot } from "@/components/page/image-slot";
import { blogImageKey } from "@/lib/site/content-images";
import { categoryLabel } from "@/lib/content/prose";
import type { ContentPageSummary } from "@/lib/content/types";

/**
 * "Keep reading" row. Titles are not headings on purpose: the article's own H1
 * is the only heading that should carry a page title, and a related post's
 * title must not be mistaken for it.
 */
export function RelatedArticles({ items, basePath, heading = "Keep reading" }: { items: ContentPageSummary[]; basePath: string; heading?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="border-t border-line pt-10">
      <h2 id="related-heading" className="type-h2 mb-6">
        {heading}
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`${basePath}/${item.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-rest transition-shadow hover:shadow-raised"
            >
              {item.featured_image_path ? (
                <ArticleImage
                  src={item.featured_image_path}
                  className="aspect-video w-full object-cover"
                  fallback={<ImageSlot slot={blogImageKey(item.category)} rounded={false} />}
                />
              ) : (
                <ImageSlot slot={blogImageKey(item.category)} rounded={false} />
              )}
              <div className="flex flex-1 flex-col gap-1 p-4">
                {item.category && <span className="type-eyebrow font-bold capitalize text-link">{categoryLabel(item.category)}</span>}
                <span className="font-semibold text-ink group-hover:underline">{item.title}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
