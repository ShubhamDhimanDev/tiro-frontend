import type { TyreCategory } from "@/lib/catalog/types";

/** Static (non-data) copy for the home page. Not mock data: it is our own how-it-works text. */
export const HOME_STEPS = [
  { title: "Select your tyres", body: "Search by size or vehicle and compare brands at a fitted price." },
  { title: "Book a time", body: "Pick a day and window that suits you, at home, work or wherever the car is." },
  { title: "We come to you", body: "Our technician arrives in a fully equipped van and fits your new tyres on the spot." },
];

/** The three ticks under the hero finder. Static: nothing rotates, so there is nothing to pause. */
export const HERO_TICKS = ["At home, work or roadside", "Balancing included", "Old tyres recycled"];

/**
 * Trust strip under the hero. `label: null` marks the point that names the service area: the component fills it from
 * the admin's served cities (`trustedTitle()` in lib/locations/coverage.ts), so no place is written here.
 */
export const HOME_TRUST_POINTS = [
  { id: "trusted", label: null, note: "Local mobile tyre service" },
  { id: "delivery", label: "Delivery included", note: "Straight to where we fit" },
  { id: "prices", label: "Competitive prices", note: "Top brands available" },
  { id: "recycling", label: "Old tyres recycled", note: "Included in the service" },
] as const;

/**
 * Value cards under the brands strip. Each point is backed by the page it links to (lib/site/info-pages.ts) and is chosen
 * so it does not repeat the trust strip or "How it works". The icon is picked in the component.
 */
export const HOME_VALUE_CARDS = [
  { id: "price-match", title: "Price-match guarantee", body: "Found the same tyre cheaper with fitting included? Tell us.", href: "/price-guarantee" },
  { id: "payments", title: "Flexible payment options", body: "Pay by card, over time where available, or when we arrive.", href: "/payment-options" },
  { id: "warranties", title: "Warranties and returns", body: "Manufacturer warranty, guaranteed fitting and how returns work.", href: "/warranties" },
  { id: "fleet", title: "Fleet and business", body: "Fitting, repairs and inspections at your depot or worksite.", href: "/fleet" },
] as const;

/**
 * Vehicle band tiles. Only the types the catalogue can filter on today (`TyreCategory`, see lib/catalog/labels.ts), so every
 * tile lands on real results. Vans, EV and trailers have no filter yet and are deliberately absent.
 */
export const HOME_VEHICLE_TYPES: { category: TyreCategory; label: string; href: string }[] = [
  { category: "car", label: "Cars", href: "/tyres?category=car" },
  { category: "suv", label: "SUVs", href: "/tyres?category=suv" },
  { category: "4x4", label: "4WD & Utes", href: "/tyres?category=4x4" },
  { category: "light_truck", label: "Light Trucks", href: "/tyres?category=light_truck" },
];
