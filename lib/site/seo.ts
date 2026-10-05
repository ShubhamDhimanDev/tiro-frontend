import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site/config";

/**
 * One place that builds per-page metadata so canonical, Open Graph and Twitter
 * always agree with `title`/`description`. `path` is relative (resolved against
 * `metadataBase` in app/layout.tsx). Pass `image` only for a real image URL;
 * otherwise the route's `opengraph-image` file (or the site default) is used.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  noindex,
  type = "website",
}: {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  noindex?: boolean;
  type?: "website" | "article";
}): Metadata {
  const full = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  return {
    title: full,
    ...(description ? { description } : {}),
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: full, ...(description ? { description } : {}), url: path, type, ...(image ? { images: [image] } : {}) },
    twitter: { card: "summary_large_image", title: full, ...(description ? { description } : {}), ...(image ? { images: [image] } : {}) },
  };
}

/** Metadata for a dynamic route whose record doesn't exist (the page calls `notFound()`): same title as `app/not-found.tsx`. */
export const NOT_FOUND_METADATA: Metadata = {
  title: `Page not found | ${SITE_NAME}`,
  robots: { index: false, follow: true },
};
