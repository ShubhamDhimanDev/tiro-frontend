import Link from "next/link";
import { AuthStatus } from "@/components/auth/auth-status";
import { CartBadge } from "@/components/cart/cart-badge";
import { HeaderScrollState } from "@/components/layout/header-scroll-state";
import { HeaderNav } from "@/components/layout/header-nav";
import { Logo } from "@/components/layout/logo";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { LocationChip } from "@/components/location/location-chip";
import { loadNavGroups } from "@/components/layout/site-header-data";
import { LocationSheet } from "@/components/location/location-sheet";
import { buttonClassName } from "@/components/ui/button";
import { PhoneIcon, SearchIcon } from "@/components/ui/icons";
import { CTA } from "@/lib/site/nav";
import { PHONE_DISPLAY, PHONE_HREF, SITE_NAME } from "@/lib/site/config";

/**
 * Global header (design v2, modelled on the reference storefront's two-row
 * header).
 *
 * - Desktop (>=992px): sticky, 115px = row 1 (72px: logo, location pill,
 *   yellow "Search tyres", phone, account, cart) + row 2 (43px: seven nav
 *   items with hover/click mega panels).
 * - Phone/tablet (<992px): sticky row 1 only (56px: menu, logo, phone, cart).
 *   The second row (location pill + "Search tyres") sits directly under it
 *   and scrolls away, so permanent chrome is 56px, not the reference's 121px.
 *
 * Fixed heights, so client-hydrated widgets (zone, session, cart count) never
 * shift the page. Server component; nothing here reads cookies.
 */
export async function SiteHeader() {
  const groups = await loadNavGroups();
  return (
    <>
      {/* Landscape phones (under 500px tall): not sticky, so the header does not take a seventh of the screen while scrolling. */}
      <header aria-label="Site header" className="site-header sticky top-0 z-40 border-b border-black/10 bg-surface [@media(max-height:500px)_and_(max-width:991px)]:static">
        <HeaderScrollState />
        <div className="site-header-main relative z-10 bg-surface">
        <div className="container-page flex h-14 items-center gap-2 lg:h-[72px] lg:gap-3">
          <MobileMenu groups={groups} />

          <Link href="/" aria-label={`${SITE_NAME} home`} className="shrink-0 rounded-control">
            <Logo />
          </Link>

          <div className="ml-auto flex items-center gap-2 lg:gap-3">
            <div className="hidden lg:block">
              <LocationChip />
            </div>

            <div className="hidden lg:block">
              <Link href={CTA.href} className={buttonClassName({ variant: "yellow", size: "md" })}>
                <SearchIcon className="h-5 w-5" />
                {CTA.label}
              </Link>
            </div>

            <a
              href={PHONE_HREF}
              aria-label={`Call ${PHONE_DISPLAY}`}
              className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-control text-black transition-colors duration-300 hover:bg-chip xl:px-3"
            >
              <PhoneIcon className="h-5 w-5" />
              <span className="type-mono hidden text-[15px] font-bold whitespace-nowrap min-[1360px]:inline">{PHONE_DISPLAY}</span>
            </a>

            <div className="hidden lg:block">
              <AuthStatus variant="header" />
            </div>
            <CartBadge />
          </div>
        </div>
        </div>

        {/* Row 2 (desktop): the seven-item nav + mega panels. */}
        <div className="site-header-nav hidden h-[43px] border-b border-black/10 bg-surface lg:block">
          <div className="container-page flex h-full items-center">
            <HeaderNav groups={groups} />
          </div>
        </div>
      </header>

      {/* Phone/tablet second row: not sticky, so it scrolls away. */}
      <div className="border-b border-line bg-surface lg:hidden">
        <div className="container-page flex items-center gap-2 py-2.5">
          <LocationChip variant="field" className="min-w-0 flex-1" />
          <Link href={CTA.href} className={buttonClassName({ variant: "yellow", size: "md", className: "shrink-0 !gap-1.5 !px-3" })}>
            <SearchIcon className="h-5 w-5" />
            {CTA.label}
          </Link>
        </div>
      </div>

      <LocationSheet />
    </>
  );
}
