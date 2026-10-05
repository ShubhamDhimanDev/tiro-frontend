import { OG_SIZE, ogCard } from "@/lib/site/og";
import { TAGLINE } from "@/lib/site/config";

export const alt = "Tiro Mobile Tyres. Mobile tyre fitting, we come to you.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ title: TAGLINE, subtitle: "Choose your tyres online. We fit them at home or work." });
}
