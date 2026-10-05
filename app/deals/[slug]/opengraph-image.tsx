import { loadOffers } from "@/lib/offers/load";
import { OG_SIZE, ogCard } from "@/lib/site/og";

export const alt = "Tyre offer";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const offer = (await loadOffers()).find((o) => o.slug === slug);
  return ogCard({
    eyebrow: offer?.badge_text ?? "Offers",
    title: offer?.title ?? "Tyre offers",
    subtitle: offer?.discount_description,
  });
}
