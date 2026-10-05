import type { MetadataRoute } from "next";
import { collectSitemapEntries } from "@/lib/site/sitemap-data";
import { absoluteUrl } from "@/lib/site/url";

/** Regenerated hourly; every API source fails soft so the sitemap never 500s. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await collectSitemapEntries();
  return entries.map((e) => ({
    url: absoluteUrl(e.path),
    ...(e.lastModified && !Number.isNaN(Date.parse(e.lastModified)) ? { lastModified: new Date(e.lastModified) } : {}),
    ...(e.changeFrequency ? { changeFrequency: e.changeFrequency } : {}),
    ...(e.priority !== undefined ? { priority: e.priority } : {}),
  }));
}
