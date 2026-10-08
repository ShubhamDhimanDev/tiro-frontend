import Link from "next/link";
import type { ReactNode } from "react";
import { FooterColumns, type FooterColumn } from "@/components/layout/footer-columns";
import { Logo } from "@/components/layout/logo";
import { FacebookIcon, InstagramIcon, PhoneIcon, YoutubeIcon } from "@/components/ui/icons";
import { flattenCities, loadLocationTree } from "@/lib/locations/helpers";
import { TRUST_BADGES } from "@/lib/site/trust-badges";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF, SITE_NAME } from "@/lib/site/config";

/**
 * Site footer (design v2): a black contact bar, then the dark (#242424)
 * footer with yellow column headings. Columns collapse to accordions below
 * 768px. Every link points at a real route. There is no newsletter surface
 * here: the home page carries the single signup (no endpoint yet).
 */
const linkClass =
  "flex min-h-11 items-center text-[15px] text-white transition-colors duration-300 hover:text-gold";

function LinkList({ links }: { links: { href: string; label: string }[] }): ReactNode {
  return (
    <ul>
      {links.map((link) => (
        <li key={link.href + link.label}>
          <Link href={link.href} className={linkClass}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const CUSTOMER_SERVICE = [
  { href: "/about", label: "About us" },
  { href: "/tyres", label: "Shop tyres" },
  { href: "/services/onsite-fitting", label: "Onsite fitting" },
  { href: "/services/puncture-repair", label: "Puncture repair" },
  { href: "/services/rotation-balancing", label: "Wheel balancing" },
  { href: "/locations", label: "Locations" },
  { href: "/blog", label: "Blog" },
  { href: "/reviews", label: "Customer reviews" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];

const YOULL_LOVE = [
  { href: "/brands", label: "Best brands" },
  { href: "/services/onsite-fitting", label: "Free delivery and fitting" },
  { href: "/price-guarantee", label: "Price-match guarantee" },
  { href: "/booking", label: "Book a fitting" },
  { href: "/services/recycling", label: "Old tyres recycled" },
  { href: "/fleet", label: "Fleet services" },
  { href: "/account", label: "My account" },
];

const LEGAL = [
  { href: "/pages/terms-conditions", label: "Terms & conditions" },
  { href: "/pages/privacy-policy", label: "Privacy policy" },
  { href: "/contact", label: "Contact" },
];

export async function SiteFooter() {
  const year = new Date().getFullYear();
  const cities = flattenCities(await loadLocationTree());

  const columns: FooterColumn[] = [
    {
      heading: `About ${SITE_NAME.replace(" Mobile Tyres", "")}`,
      body: (
        <p className="max-w-sm text-[15px] leading-6 text-white">
          {SITE_NAME} brings the tyre shop to you. Choose your tyres online, pick a time, and our technician fits them at your home or work, with
          balancing and old-tyre recycling included.
        </p>
      ),
    },
    { heading: "Customer service", body: <LinkList links={CUSTOMER_SERVICE} /> },
    { heading: "You'll love", body: <LinkList links={YOULL_LOVE} /> },
    {
      heading: "Contact",
      body: (
        <div>
          <a href={PHONE_HREF} className="type-mono flex min-h-11 items-center gap-2 text-base font-bold text-white hover:text-gold">
            <PhoneIcon className="h-5 w-5 text-gold" />
            {PHONE_DISPLAY}
          </a>
          <p className="mb-2 text-sm text-footer-muted">{HOURS_LINE}</p>
          {cities.length > 0 && (
            <ul aria-label="Cities we service">
              {cities.slice(0, 6).map(({ state, city, href }) => (
                <li key={href}>
                  <Link href={href} className={linkClass}>
                    {city.name}
                    <span className="sr-only">, {state.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Contact bar */}
      <div className="bg-black text-white">
        <div className="container-page flex flex-col items-start gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <p className="text-balance text-lg font-bold tracking-[-0.5px]">Can&apos;t find your size? We&apos;ll find it for you.</p>
          {/* Two buttons side by side on every width: stacked full-width buttons made this bar 216px tall on phones. */}
          <div className="flex w-full gap-3 md:w-auto">
            <Link
              href="/contact"
              className="flex min-h-12 flex-1 items-center justify-center whitespace-nowrap rounded-control border-2 border-white px-5 text-[15px] font-bold text-white transition-colors duration-300 hover:bg-white hover:text-black md:flex-none"
            >
              Get a free quote
            </Link>
            <a
              href={PHONE_HREF}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-control border-2 border-gold bg-gold px-5 text-[15px] font-bold text-black transition-colors duration-300 hover:border-[#e6b900] hover:bg-[#e6b900] md:flex-none"
            >
              <PhoneIcon className="h-5 w-5" />
              Call
            </a>
          </div>
        </div>
      </div>

      <footer aria-label="Site footer" className="bg-footer text-white">
        <div className="container-page flex flex-col gap-6 py-8 md:gap-8 md:py-10">
          <Link href="/" aria-label={`${SITE_NAME} home`} className="self-start">
            <Logo tone="light" />
          </Link>

          <FooterColumns columns={columns} />

          {TRUST_BADGES.length > 0 && (
            <ul aria-label="Awards and accreditation" className="flex flex-wrap items-center gap-6 border-t border-white/15 pt-6">
              {TRUST_BADGES.map((b) => (
                <li key={b.label}>
                  {b.href ? (
                    <a href={b.href} target="_blank" rel="noopener noreferrer" aria-label={b.label}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size partner badge, not content imagery */}
                      <img src={b.src} alt={b.label} className="h-14 w-auto" />
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- fixed-size partner badge, not content imagery
                    <img src={b.src} alt={b.label} className="h-14 w-auto" />
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-4 border-t border-white/15 pt-6 md:flex-row md:items-center md:justify-between">
            <ul className="flex flex-wrap gap-x-6">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-11 items-center text-sm text-footer-muted hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul aria-label="Social media" className="flex gap-2">
              {[
                { label: "Facebook", Icon: FacebookIcon },
                { label: "Instagram", Icon: InstagramIcon },
                { label: "YouTube", Icon: YoutubeIcon },
              ].map(({ label, Icon }) => (
                <li key={label}>
                  {/* TODO(client): real social profile URLs. */}
                  <a
                    href="#"
                    aria-label={`${SITE_NAME} on ${label}`}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors duration-300 hover:border-gold hover:text-gold"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-footer-muted">
            &copy; {year} {SITE_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
