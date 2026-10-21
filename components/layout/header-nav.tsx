"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, isActivePath, isGroupActive, type NavGroup } from "@/lib/site/nav";
import { buttonClassName } from "@/components/ui/button";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";

const HOVER_OPEN_MS = 120;
const HOVER_CLOSE_MS = 250;

const triggerClass =
  "relative flex min-h-11 items-center gap-1 whitespace-nowrap px-2.5 text-[15px] font-bold text-black transition-colors duration-300 hover:bg-chip xl:px-3.5";

/**
 * Desktop (>=992px) nav row with hover/click mega panels.
 *
 * - Opens on click (and Enter/Space) and on hover intent for mouse pointers.
 *   Nothing is hover-only: every panel is operable by keyboard and by tap
 *   (touch pointers never hover-open, they click).
 * - Triggers carry `aria-expanded` / `aria-controls`; Escape closes the open
 *   panel and returns focus to its trigger; focus leaving the nav closes it.
 * - Panels are in the DOM (`hidden` while closed) so links are crawlable.
 * - Open state is keyed to the pathname, so any navigation closes the menu.
 * - A dim layer covers the page below the header while a panel is open.
 */
export function HeaderNav({ groups = NAV_GROUPS }: { groups?: NavGroup[] }) {
  const pathname = usePathname();
  const baseId = useId();
  const [state, setState] = useState<{ key: NavGroup["key"]; path: string } | null>(null);
  const openKey = state && state.path === pathname ? state.key : null;

  const rootRef = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const timer = useRef<number | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = undefined;
  }, []);
  useEffect(() => clearTimer, [clearTimer]);

  const open = useCallback((key: NavGroup["key"]) => setState({ key, path: pathname }), [pathname]);
  const close = useCallback(() => setState(null), []);

  useEffect(() => {
    if (!openKey) return;
    function onPointerDown(e: globalThis.PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setState(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openKey]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && openKey) {
      e.stopPropagation();
      const trigger = triggers.current.get(openKey);
      close();
      trigger?.focus();
    }
  }

  function onBlur(e: React.FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && rootRef.current?.contains(next)) return;
    if (next === null) return; // window blur / non-focusable click: pointerdown handler covers it
    close();
  }

  function hoverOpen(key: NavGroup["key"], e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    clearTimer();
    timer.current = window.setTimeout(() => open(key), openKey ? 40 : HOVER_OPEN_MS);
  }
  function hoverLeave(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    clearTimer();
    timer.current = window.setTimeout(close, HOVER_CLOSE_MS);
  }

  return (
    <div
      ref={rootRef}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onPointerLeave={hoverLeave}
      onPointerEnter={(e) => e.pointerType === "mouse" && clearTimer()}
    >
      <nav aria-label="Primary">
        <ul className="flex items-center">
          {groups.map((group) => {
            const isOpen = openKey === group.key;
            const active = isGroupActive(pathname, group);
            const activeBar =
              active && "after:absolute after:inset-x-2.5 after:bottom-0 after:h-[3px] after:rounded-full after:bg-gold";

            if (group.links.length === 0) {
              return (
                <li key={group.key} onPointerEnter={() => clearTimer()}>
                  <Link
                    href={group.href}
                    aria-current={active ? "page" : undefined}
                    onClick={close}
                    className={cx(triggerClass, activeBar)}
                  >
                    {group.label}
                  </Link>
                </li>
              );
            }

            return (
              <li key={group.key} onPointerEnter={(e) => hoverOpen(group.key, e)}>
                <button
                  ref={(el) => {
                    if (el) triggers.current.set(group.key, el);
                    else triggers.current.delete(group.key);
                  }}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`${baseId}-${group.key}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    clearTimer();
                    if (isOpen) close();
                    else open(group.key);
                  }}
                  className={cx(triggerClass, (isOpen || active) && "after:absolute after:inset-x-2.5 after:bottom-0 after:h-[3px] after:rounded-full after:bg-gold")}
                >
                  {group.label}
                  <ChevronDownIcon className={cx("h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")} />
                </button>
                <div
                  id={`${baseId}-${group.key}`}
                  role="region"
                  aria-label={`${group.label} menu`}
                  hidden={!isOpen}
                  className="mega-panel absolute inset-x-0 top-full z-10 border-b border-line bg-surface shadow-overlay"
                >
                  <div className="container-page grid grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-10 py-8">
                    <ul className="flex flex-col">
                      {group.links.map((link) => {
                        const current = isActivePath(pathname, link.href);
                        return (
                          <li key={link.href + link.label}>
                            <Link
                              href={link.href}
                              onClick={close}
                              aria-current={current ? "page" : undefined}
                              className="group/link flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 text-base font-bold text-black transition-colors duration-300 hover:bg-chip"
                            >
                              {link.label}
                              <ChevronRightIcon className="h-5 w-5 shrink-0" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,260px)] gap-6">
                      {group.aside && (
                        <div className="flex flex-col items-start justify-center gap-3 rounded-card bg-band p-8">
                          <p className="text-2xl font-extrabold leading-tight tracking-[-1px] text-black">{group.aside.title}</p>
                          <p className="max-w-md text-[15px] text-muted">{group.aside.body}</p>
                          <Link
                            href={group.aside.cta.href}
                            onClick={close}
                            className={buttonClassName({ variant: "green", className: "mt-1" })}
                          >
                            {group.aside.cta.label}
                          </Link>
                        </div>
                      )}
                      {group.promo ? (
                        <Link
                          href={group.promo.href}
                          onClick={close}
                          className="flex flex-col justify-between gap-4 rounded-card bg-black p-6 text-white transition-colors duration-300 hover:bg-[#222]"
                        >
                          <span>
                            <span className="text-xs font-bold text-gold">{group.promo.eyebrow}</span>
                            <span className="mt-1 block text-3xl font-extrabold leading-none tracking-[-1px]">{group.promo.title}</span>
                            <span className="mt-2 block text-sm text-footer-muted">{group.promo.body}</span>
                          </span>
                          <span className="text-sm font-bold text-gold">{group.promo.cta} &rarr;</span>
                        </Link>
                      ) : (
                        <Link
                          href="/deals"
                          onClick={close}
                          className="flex flex-col justify-between gap-4 rounded-card bg-gold p-6 text-black transition-colors duration-300 hover:bg-[#e6b900]"
                        >
                          <span>
                            <span className="text-xs font-bold">Latest offers</span>
                            <span className="mt-1 block text-3xl font-extrabold leading-none tracking-[-1px]">4 for 3</span>
                            <span className="mt-2 block text-sm">Selected sets, fitted at your place.</span>
                          </span>
                          <span className="text-sm font-bold">See all offers &rarr;</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
      {openKey && (
        <div
          aria-hidden="true"
          data-testid="mega-dim"
          className="pointer-events-none fixed inset-x-0 bottom-0 top-[115px] -z-10 bg-black/60"
        />
      )}
    </div>
  );
}
