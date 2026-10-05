import { loadCityDetail } from "@/lib/locations/load-city";
import { OG_SIZE, ogCard } from "@/lib/site/og";

export const alt = "Mobile tyre fitting. We come to you.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string; city: string }> }) {
  const { slug, city } = await params;
  const detail = (await loadCityDetail(slug, city))?.detail;
  return ogCard({
    eyebrow: detail ? detail.state.name : "Where we go",
    title: detail ? `Mobile tyres in ${detail.city.name}` : "Mobile tyre fitting",
    subtitle: "Fitted at your home or work",
  });
}
