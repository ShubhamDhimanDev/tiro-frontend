import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site/seo";
import { loadHomeReviews } from "@/lib/home/load";
import { InfoPage } from "@/components/page/info-page";
import { INFO_PAGES } from "@/lib/site/info-pages";

const page = INFO_PAGES["delivery-promise"];

export const metadata: Metadata = pageMetadata({ title: page.title, description: page.description, path: page.path });

export default async function Page() {
  return <InfoPage page={page} reviews={await loadHomeReviews()} />;
}
