/**
 * Placeholder-image registry for the content and account pages (design v2,
 * phases 5-6). Every image slot used by these pages is named here, with the
 * file it should be saved as and its aspect ratio. `src: null` means "no file
 * yet": `components/page/image-slot.tsx` draws a token-based CSS placeholder
 * at the right aspect ratio so nothing shifts when the photo arrives.
 *
 * To go live: save the generated WebP at `frontend/public` + `file` below and
 * set `src` to that path. The same slots, with ready-to-paste generation
 * prompts, are listed in docs/prompts/IMAGE-MANIFEST.md.
 *
 * MOCK: all slots are placeholders. None of this is real photography.
 */
export type ContentImage = {
  /** Where the file belongs, relative to `frontend/public`. */
  file: string;
  /** Intrinsic size in px (also fixes the aspect ratio). */
  width: number;
  height: number;
  /** Alt text used once a real image exists. */
  alt: string;
  /** Set to `file` once the image has been added. */
  src: string | null;
};

/** Files that exist under `frontend/public`. Slots whose file is listed here render the real photo; the rest keep the CSS placeholder. */
const AVAILABLE_FILES = new Set<string>([
  "/images/services/service-tyre-sales.webp",
  "/images/services/service-onsite-fitting.webp",
  "/images/services/service-puncture-repair.webp",
  "/images/services/service-rotation.webp",
  "/images/services/service-inspection.webp",
  "/images/services/service-recycling.webp",
  "/images/about/about-hero-van.webp",
  "/images/about/about-technician-wheel.webp",
  "/images/about/about-team-portrait.webp",
  "/images/about/about-van-interior.webp",
  "/images/blog/blog-thumb-safety.webp",
  "/images/blog/blog-thumb-fleet.webp",
  "/images/blog/blog-thumb-generic-tread.webp",
  "/images/illustrations/empty-cart.webp",
  "/images/illustrations/empty-results.webp",
  "/images/illustrations/empty-orders.webp",
  "/images/illustrations/error-404.webp",
  "/images/how-it-works/how-step-1-select.webp",
  "/images/how-it-works/how-step-2-book.webp",
  "/images/how-it-works/how-step-3-we-come.webp",
  "/images/fleet/fleet-depot-service.webp",
  "/images/fleet/fleet-manager.webp",
  "/images/banners/brand-banner-premium.webp",
  "/images/banners/brand-banner-midrange.webp",
  "/images/banners/brand-banner-budget.webp",
]);

const img = (file: string, width: number, height: number, alt: string): ContentImage => ({
  file,
  width,
  height,
  alt,
  src: AVAILABLE_FILES.has(file) ? file : null,
});

export const CONTENT_IMAGES = {
  // Offers hub bands (4:3)
  "offers-latest": img("/images/offers/offers-latest.webp", 1200, 900, "A set of four new tyres with a blank promotional tag"),
  "offers-price-guarantee": img("/images/offers/offers-price-guarantee.webp", 1200, 900, "A technician giving a thumbs up beside a tyre"),
  "offers-payment": img("/images/offers/offers-payment.webp", 1200, 900, "A phone and a card reader on a driveway"),
  "offers-delivery": img("/images/offers/offers-delivery.webp", 1200, 900, "A stopwatch beside a van door"),
  "offers-flexible": img("/images/offers/offers-flexible.webp", 1200, 900, "A calendar with an open day"),
  // Services (1:1)
  "svc-tyre-sales": img("/images/services/service-tyre-sales.webp", 1200, 1200, "A new tyre standing on a driveway"),
  "svc-onsite-fitting": img("/images/services/service-onsite-fitting.webp", 1200, 1200, "Tyre levers and a wheel"),
  "svc-puncture-repair": img("/images/services/service-puncture-repair.webp", 1200, 1200, "A technician repairing a tyre"),
  "svc-rotation-balancing": img("/images/services/service-rotation.webp", 1200, 1200, "A wheel on a balancing machine"),
  "svc-inspections": img("/images/services/service-inspection.webp", 1200, 1200, "A tread depth gauge in a tyre groove"),
  "svc-recycling": img("/images/services/service-recycling.webp", 1200, 1200, "A neat stack of old tyres ready for recycling"),
  "svc-fleet": img("/images/services/service-fleet.webp", 1200, 1200, "A row of work vans at a depot"),
  // Locations
  "location-van": img("/images/locations/location-van-street.webp", 1200, 900, "A Tiro van parked on a suburban street"),
  "location-map": img("/images/locations/location-coverage-map.webp", 1200, 900, "A stylised map of coverage areas"),
  // About
  "about-hero": img("/images/about/about-hero-van.webp", 1600, 900, "A Tiro van arriving at a home"),
  "about-team": img("/images/about/about-team-portrait.webp", 1200, 900, "The Tiro team beside a van"),
  "about-tech": img("/images/about/about-technician-wheel.webp", 1200, 900, "A technician fitting a wheel"),
  "about-van": img("/images/about/about-van-interior.webp", 1200, 900, "Inside the tyre-fitting van"),
  // How it works (1:1)
  "how-1": img("/images/how-it-works/how-step-1-select.webp", 800, 800, "Choosing tyres on a phone"),
  "how-2": img("/images/how-it-works/how-step-2-book.webp", 800, 800, "Picking a booking time"),
  "how-3": img("/images/how-it-works/how-step-3-we-come.webp", 800, 800, "The van arriving at a house"),
  // Fleet
  "fleet-depot": img("/images/fleet/fleet-depot-service.webp", 1200, 900, "A technician servicing a van at a depot"),
  "fleet-manager": img("/images/fleet/fleet-manager.webp", 1200, 900, "A fleet manager with a tablet"),
  // Our range (8:3 banners)
  "range-premium": img("/images/banners/brand-banner-premium.webp", 1600, 600, "Premium tyres"),
  "range-mid": img("/images/banners/brand-banner-midrange.webp", 1600, 600, "Mid-range tyres"),
  "range-budget": img("/images/banners/brand-banner-budget.webp", 1600, 600, "Budget tyres"),
  // Blog thumbnails (16:9 fallbacks by category)
  "blog-advice": img("/images/blog/blog-thumb-advice.webp", 1280, 720, "Tyre advice"),
  "blog-company": img("/images/blog/blog-thumb-company.webp", 1280, 720, "Company news"),
  "blog-ev": img("/images/blog/blog-thumb-ev.webp", 1280, 720, "Electric vehicle tyres"),
  "blog-fleet": img("/images/blog/blog-thumb-fleet.webp", 1280, 720, "Fleet tyres"),
  "blog-safety": img("/images/blog/blog-thumb-safety.webp", 1280, 720, "Tyre safety"),
  "blog-generic": img("/images/blog/blog-thumb-generic-tread.webp", 1280, 720, "Tyre tread"),
  // Auth / account
  "auth-side": img("/images/auth/auth-side-van.webp", 1000, 1250, "A Tiro van at a driveway at sunrise"),
  "empty-vehicles": img("/images/empty/empty-vehicles.webp", 800, 800, "An empty garage"),
  "empty-addresses": img("/images/empty/empty-addresses.webp", 800, 800, "A map pin on a street"),
  "empty-orders": img("/images/illustrations/empty-orders.webp", 1200, 896, "An empty parcel box"),
  "empty-cart": img("/images/illustrations/empty-cart.webp", 1200, 896, "A shopping cart beside a tyre and a Tiro van"),
  "empty-results": img("/images/illustrations/empty-results.webp", 1200, 896, "A magnifying glass over a wheel"),
  "error-404": img("/images/illustrations/error-404.webp", 1264, 848, "A Tiro van on a road with a tyre that rolled away"),
} as const satisfies Record<string, ContentImage>;

export type ContentImageKey = keyof typeof CONTENT_IMAGES;

/** Blog/guide thumbnail slot for a category slug (falls back to the generic tread image). */
export function blogImageKey(category: string | null | undefined): ContentImageKey {
  const c = (category ?? "").toLowerCase();
  if (c.includes("ev") || c.includes("electric")) return "blog-ev";
  if (c.includes("fleet")) return "blog-fleet";
  if (c.includes("safe")) return "blog-safety";
  if (c.includes("company") || c.includes("news")) return "blog-company";
  if (c.includes("advice") || c.includes("buying") || c.includes("guide")) return "blog-advice";
  return "blog-generic";
}
