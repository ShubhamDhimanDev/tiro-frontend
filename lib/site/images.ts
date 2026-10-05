/**
 * Single place that names the generated imagery. `null` means "the file does
 * not exist yet, render the token-based CSS/SVG fallback". Phase 9 sets the
 * paths (files live under `public/images/`, see docs/prompts/README.md).
 */
export type SiteImage = { src: string; width: number; height: number; alt: string };

export const HERO_IMAGES: { desktop: SiteImage | null; mobile: SiteImage | null } = {
  // Phase 9: { src: "/images/hero/hero-van-desktop.webp", width: 1920, height: 960, alt: "..." }
  desktop: null,
  // Phase 9: { src: "/images/hero/hero-van-mobile.webp", width: 1080, height: 1080, alt: "..." }
  mobile: null,
};

/**
 * Location page hero (city photo). Phase 9 sets a path; until then the page
 * renders a CSS fallback. Per-city images can be keyed by slug later.
 */
export const LOCATION_HERO_IMAGE: SiteImage | null = null;

/**
 * Per-city photos, keyed by the API's city slug (Phase 9 fills this in).
 * Anything not listed falls back to `LOCATION_HERO_IMAGE`, then to the CSS
 * fallback in `components/locations/city-photo.tsx`.
 */
export const LOCATION_CITY_IMAGES: Record<string, SiteImage> = {};

export function locationImage(citySlug?: string): SiteImage | null {
  return (citySlug ? LOCATION_CITY_IMAGES[citySlug] : undefined) ?? LOCATION_HERO_IMAGE;
}
