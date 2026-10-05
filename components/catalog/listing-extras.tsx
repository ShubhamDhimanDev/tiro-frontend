import Link from "next/link";
import { PopularSizes } from "@/components/catalog/popular-sizes";
import { ReadMore } from "@/components/ui/read-more";
import type { PopularSize } from "@/lib/catalog/types";

/**
 * Everything that follows the results: collapsible SEO text ("Read more",
 * never above the grid), popular sizes, and related links.
 */
export function ListingExtras({
  seoTitle,
  seoParagraphs,
  popular = [],
  links = [],
}: {
  seoTitle?: string;
  seoParagraphs?: string[];
  popular?: PopularSize[];
  links?: { href: string; label: string }[];
}) {
  return (
    <div className="mt-10 flex flex-col gap-8 border-t border-line pt-8">
      {seoTitle && seoParagraphs && seoParagraphs.length > 0 && (
        <section aria-labelledby="listing-seo-heading">
          <h2 id="listing-seo-heading" className="type-h3 mb-2">
            {seoTitle}
          </h2>
          <ReadMore className="max-w-3xl">
            {seoParagraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </ReadMore>
        </section>
      )}
      {popular.length > 0 && (
        <section aria-labelledby="listing-popular-heading">
          <h2 id="listing-popular-heading" className="type-eyebrow mb-3 font-semibold text-muted">
            Popular sizes
          </h2>
          <PopularSizes sizes={popular} />
        </section>
      )}
      {links.length > 0 && (
        <nav aria-label="Related pages">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4 hover:text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
