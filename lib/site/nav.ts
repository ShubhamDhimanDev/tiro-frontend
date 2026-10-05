/**
 * Global navigation data (design v2): seven top-level items modelled on the
 * reference storefront's IA, shared by the desktop mega menu, the mobile menu
 * and the footer so each link exists in one place.
 *
 * A group with `links` opens a mega panel (left rail of links + a feature
 * aside); a group with no links (Fleet) is a plain link.
 */
export type NavLink = { href: string; label: string; description?: string };

export type NavPromo = { href: string; eyebrow: string; title: string; body: string; cta: string };

export type NavGroup = {
  key: "shop" | "locations" | "offers" | "services" | "fleet" | "about" | "help";
  label: string;
  /** Landing link for the group (the trigger's destination when it has no panel). */
  href: string;
  /** Left-rail links. Empty = plain link, no panel. */
  links: NavLink[];
  /** Right-hand feature card in the mega panel. */
  aside?: { title: string; body: string; cta: { href: string; label: string } };
  /** Offer tile in the aside (filled from the offers API when available). */
  promo?: NavPromo;
};

export const SERVICES: (NavLink & { slug: string })[] = [
  { slug: "tyre-sales", href: "/services/tyre-sales", label: "Tyre sales" },
  { slug: "onsite-fitting", href: "/services/onsite-fitting", label: "Onsite fitting" },
  { slug: "puncture-repair", href: "/services/puncture-repair", label: "Puncture repair" },
  { slug: "rotation-balancing", href: "/services/rotation-balancing", label: "Rotation & balancing" },
  { slug: "inspections", href: "/services/inspections", label: "Tyre inspections" },
  { slug: "recycling", href: "/services/recycling", label: "Tyre recycling" },
  { slug: "fleet", href: "/fleet", label: "Fleet" },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "shop",
    label: "Shop tyres",
    href: "/tyres",
    links: [
      { href: "/tyres", label: "By size" },
      { href: "/tyres/by-vehicle", label: "By vehicle" },
      { href: "/brands", label: "By brand" },
      { href: "/tyres/type/highway", label: "By type" },
      { href: "/tyres/latest-releases", label: "Latest releases" },
      { href: "/deals", label: "By promo" },
    ],
    aside: {
      title: "Find your tyres",
      body: "Search by size or vehicle. Fitting, balancing and old-tyre recycling are included in the price.",
      cta: { href: "/tyres", label: "Search tyres" },
    },
  },
  {
    key: "locations",
    label: "Locations",
    href: "/locations",
    links: [{ href: "/locations", label: "All locations" }],
    aside: {
      title: "Do we come to you?",
      body: "Enter your suburb or postcode to check coverage and see the next available fitting time.",
      cta: { href: "/locations", label: "Check my suburb" },
    },
  },
  {
    key: "offers",
    label: "Offers",
    href: "/deals",
    links: [
      { href: "/deals", label: "Latest offers" },
      { href: "/price-guarantee", label: "Price guarantee" },
      { href: "/payment-options", label: "Payment options" },
      { href: "/delivery-promise", label: "Delivery promise" },
      { href: "/price-guarantee-claims", label: "Price-match claims" },
      { href: "/tyres/latest-releases", label: "Latest releases" },
    ],
    aside: {
      title: "Flexible booking",
      body: "Be available anytime between 8am and 5pm and take $10 off your fitting.",
      cta: { href: "/deals", label: "See all offers" },
    },
  },
  {
    key: "services",
    label: "Mobile services",
    href: "/services",
    links: [...SERVICES.slice(0, 6), { href: "/services", label: "All services" }],
    aside: {
      title: "The tyre shop comes to you",
      body: "A fully equipped van arrives at your home or work. Pick a time and we do the rest.",
      cta: { href: "/booking", label: "Book a fitting" },
    },
  },
  { key: "fleet", label: "Fleet", href: "/fleet", links: [] },
  {
    key: "about",
    label: "About us",
    href: "/about",
    links: [
      { href: "/about", label: "About us" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/faq", label: "FAQs" },
      { href: "/reviews", label: "Customer reviews" },
      { href: "/about/our-range", label: "Our range" },
      { href: "/warranties", label: "Warranties and returns" },
      { href: "/contact", label: "Contact us" },
    ],
    aside: {
      title: "Tyres without the trip",
      body: "Meet the team and read what customers say about getting their tyres fitted at home.",
      cta: { href: "/reviews", label: "Read reviews" },
    },
  },
  {
    key: "help",
    label: "Help center",
    href: "/help",
    links: [
      { href: "/help", label: "Help centre" },
      { href: "/faq", label: "FAQ" },
      { href: "/guides", label: "Tyre guides" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact us" },
    ],
    aside: {
      title: "Need a hand?",
      body: "Call us or send a message and a real person will get back to you.",
      cta: { href: "/contact", label: "Contact us" },
    },
  },
];

/** Secondary links shown at the bottom of the mobile menu. */
export const SECONDARY_LINKS: NavLink[] = [
  { href: "/blog", label: "Blog" },
  { href: "/guides", label: "Guides" },
  { href: "/faq", label: "FAQ" },
  { href: "/help", label: "Help" },
  { href: "/reviews", label: "Reviews" },
];

export const CTA = { href: "/tyres", label: "Search tyres" };

/** True when `pathname` is `href` or a child of it (`/` only matches itself). */
export function isActivePath(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Extra path prefixes (besides the group's landing href) that make a group "current". */
const GROUP_MATCH: Record<NavGroup["key"], string[]> = {
  shop: ["/brands"],
  locations: [],
  offers: ["/price-guarantee", "/payment-options", "/delivery-promise", "/price-guarantee-claims", "/promotions"],
  services: [],
  fleet: ["/services/fleet"],
  about: ["/reviews", "/about", "/how-it-works", "/warranties", "/pages/about-us"],
  help: ["/faq", "/guides", "/blog", "/contact"],
};

export function isGroupActive(pathname: string | null | undefined, group: NavGroup): boolean {
  return [group.href, ...GROUP_MATCH[group.key]].some((h) => isActivePath(pathname, h));
}

/** Most cities listed in the Locations panel; the rest are one click away on /locations. */
export const NAV_MAX_CITIES = 8;

/**
 * Returns the nav groups with API data folded in: Locations lists the served
 * cities (state code beside the name), and the Offers group gets a tile for
 * the offer ending soonest. Both fall back to the static groups when the API
 * has nothing, so the menu never breaks.
 */
export function withApiNav(
  groups: NavGroup[],
  data: { cities: { name: string; stateCode: string; href: string }[]; promo: NavPromo | null },
): NavGroup[] {
  return groups.map((group) => {
    if (group.key === "locations" && data.cities.length > 0) {
      const shown = data.cities.slice(0, NAV_MAX_CITIES);
      return {
        ...group,
        links: [...shown.map((c) => ({ href: c.href, label: `${c.name}, ${c.stateCode}` })), { href: "/locations", label: "All locations" }],
      };
    }
    if (group.key === "offers" && data.promo) return { ...group, promo: data.promo };
    return group;
  });
}
