"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, SECONDARY_LINKS, CTA, isActivePath, isGroupActive, type NavGroup } from "@/lib/site/nav";
import { HOURS_LINE, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";
import { AuthStatus } from "@/components/auth/auth-status";
import { LocationChip } from "@/components/location/location-chip";
import { buttonClassName } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, MenuIcon, PhoneIcon, SearchIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { cx } from "@/components/ui/cx";

const rowClass = "flex min-h-14 w-full items-center justify-between gap-3 border-b border-line text-left text-lg font-bold text-black";

/**
 * Hamburger + full-height menu drawer for everything below 992px.
 *
 * Seven rows like the desktop nav; rows with children drill into a sub-panel
 * (back button on top). Built on the shared `Sheet` (focus trap, Escape,
 * scroll lock, focus return). Closes on any link click and on route change
 * (open state is keyed to the pathname, so no effect is needed). Phone number,
 * location, account and the search CTA are in the menu too.
 */
export function MobileMenu({ groups = NAV_GROUPS }: { groups?: NavGroup[] }) {
  const pathname = usePathname();
  const [state, setState] = useState<{ path: string } | null>(null);
  const open = state !== null && state.path === pathname;
  const close = () => {
    setState(null);
    setDrill(null);
  };
  const [drill, setDrill] = useState<NavGroup["key"] | null>(null);
  const drilled = groups.find((g) => g.key === drill) ?? null;

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setState({ path: pathname })}
        className="-ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-control text-black transition-colors hover:bg-chip lg:hidden"
      >
        <MenuIcon className="h-7 w-7" />
      </button>

      <Sheet open={open} onClose={close} title="Menu" presentation="drawer">
        <div className="flex flex-col gap-6 pb-4">
          {drilled ? (
            <div>
              <button
                type="button"
                onClick={() => setDrill(null)}
                className="-ml-1 flex min-h-12 items-center gap-1 pr-3 text-base font-bold text-black"
              >
                <ChevronLeftIcon className="h-5 w-5" />
                <span className="sr-only">Back to </span>Menu
              </button>
              <p className="mb-1 text-2xl font-extrabold tracking-[-1px] text-black">{drilled.label}</p>
              <ul>
                {drilled.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      onClick={close}
                      aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                      className={cx(rowClass, "text-base")}
                    >
                      {link.label}
                      <ChevronRightIcon className="h-5 w-5 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
              {drilled.aside && (
                <Link href={drilled.aside.cta.href} onClick={close} className={buttonClassName({ variant: "green", fullWidth: true, className: "mt-4" })}>
                  {drilled.aside.cta.label}
                </Link>
              )}
            </div>
          ) : (
            <>
              <Link href={CTA.href} onClick={close} className={buttonClassName({ variant: "yellow", fullWidth: true })}>
                <SearchIcon className="h-5 w-5" />
                {CTA.label}
              </Link>

              <nav aria-label="Primary">
                <ul className="border-t border-line">
                  {groups.map((group) => (
                    <li key={group.key}>
                      {group.links.length === 0 ? (
                        <Link
                          href={group.href}
                          onClick={close}
                          aria-current={isGroupActive(pathname, group) ? "page" : undefined}
                          className={rowClass}
                        >
                          {group.label}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDrill(group.key)}
                          aria-current={isGroupActive(pathname, group) ? "page" : undefined}
                          className={rowClass}
                        >
                          {group.label}
                          <ChevronRightIcon className="h-5 w-5 shrink-0" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              <section aria-label="Account">
                <AuthStatus variant="menu" onNavigate={close} />
              </section>

              <section aria-label="Your location" className="flex flex-col gap-2">
                <p className="text-sm font-bold text-black">Fitting location</p>
                <LocationChip variant="field" onBeforeOpen={close} />
              </section>

              <section aria-label="Contact" className="rounded-card bg-band p-4">
                <a href={PHONE_HREF} className="flex min-h-11 items-center gap-2 text-lg font-extrabold text-black">
                  <PhoneIcon className="h-5 w-5" />
                  <span className="type-mono">{PHONE_DISPLAY}</span>
                </a>
                <p className="pl-7 text-sm text-muted">{HOURS_LINE}</p>
              </section>

              <nav aria-label="More">
                <ul className="grid grid-cols-2">
                  {SECONDARY_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={close}
                        aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                        className="flex min-h-11 items-center px-1 text-sm font-medium text-muted hover:text-black"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
