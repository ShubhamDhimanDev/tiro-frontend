import type { ContentImageKey } from "@/lib/site/content-images";
import type { InfoIconKey } from "@/lib/site/info-pages";

/** Icon + image slot per service slug (copy lives in `services.ts`). MOCK images, see content-images.ts. */
export const SERVICE_VISUALS: Record<string, { icon: InfoIconKey; image: ContentImageKey; path?: string }> = {
  "tyre-sales": { icon: "tyre", image: "svc-tyre-sales" },
  "onsite-fitting": { icon: "wrench", image: "svc-onsite-fitting" },
  "puncture-repair": { icon: "help", image: "svc-puncture-repair" },
  "rotation-balancing": { icon: "gauge", image: "svc-rotation-balancing" },
  inspections: { icon: "shield", image: "svc-inspections" },
  recycling: { icon: "recycle", image: "svc-recycling" },
  fleet: { icon: "building", image: "svc-fleet", path: "/fleet" },
};

export function serviceHref(slug: string): string {
  return SERVICE_VISUALS[slug]?.path ?? `/services/${slug}`;
}
