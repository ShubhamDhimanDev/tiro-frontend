"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "./cx";

export type AccordionItem = {
  id: string | number;
  title: string;
  /** Plain strings render as a paragraph; nodes render as-is. */
  content: ReactNode;
  /** Optional leading icon, shown in a yellow circle when `variant="icons"`. */
  icon?: ReactNode;
};

/**
 * Accessible accordion: each header is a real button with `aria-expanded` and
 * `aria-controls`, the panel is a labelled region. Enter/Space toggle natively;
 * ArrowUp/ArrowDown/Home/End move between headers. Several panels can be open.
 * Headers are not headings on purpose (the FAQ page supplies its own h2 groups).
 *
 * Variants: `boxed` (bordered card, FAQ), `plain` (hairline rows), `icons`
 * (rows with a yellow icon circle, "Our core services").
 */
export function Accordion({
  items,
  className,
  defaultOpenId,
  defaultOpenIds,
  variant = "boxed",
}: {
  items: AccordionItem[];
  className?: string;
  defaultOpenId?: string | number;
  /** Several panels open at first render. Combined with `defaultOpenId` when both are given. */
  defaultOpenIds?: (string | number)[];
  variant?: "boxed" | "plain" | "icons";
}) {
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Set<string | number>>(
    () => new Set([...(defaultOpenId !== undefined ? [defaultOpenId] : []), ...(defaultOpenIds ?? [])]),
  );

  function toggle(id: string | number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const triggers = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>("[data-accordion-trigger]") ?? []);
    const index = triggers.indexOf(e.currentTarget);
    if (index === -1 || triggers.length === 0) return;
    e.preventDefault();
    let nextIndex = index;
    if (e.key === "ArrowDown") nextIndex = (index + 1) % triggers.length;
    if (e.key === "ArrowUp") nextIndex = (index - 1 + triggers.length) % triggers.length;
    if (e.key === "Home") nextIndex = 0;
    if (e.key === "End") nextIndex = triggers.length - 1;
    triggers[nextIndex]?.focus();
  }

  return (
    <div
      ref={rootRef}
      className={cx(
        "divide-y divide-line bg-surface",
        variant === "boxed" ? "overflow-hidden rounded-card border border-line" : "border-y border-line",
        className,
      )}
    >
      {items.map((item) => {
        const isOpen = open.has(item.id);
        const triggerId = `${baseId}-t-${item.id}`;
        const panelId = `${baseId}-p-${item.id}`;
        return (
          <div key={item.id}>
            <button
              type="button"
              id={triggerId}
              data-accordion-trigger=""
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
              onKeyDown={onKeyDown}
              className={cx(
                "flex w-full cursor-pointer items-center gap-4 text-left font-bold text-black hover:bg-chip/60",
                variant === "icons" ? "min-h-[72px] px-2 py-3 text-base" : "min-h-14 px-5 py-3 text-base",
              )}
            >
              {variant === "icons" && item.icon && (
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-black md:h-[52px] md:w-[52px]"
                >
                  {item.icon}
                </span>
              )}
              <span className="min-w-0 flex-1">{item.title}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={cx("h-5 w-5 shrink-0 transition-transform duration-300", isOpen && "rotate-180")}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {/* Always in the DOM (`hidden` while closed) so answers stay crawlable; opening plays a short CSS enter (.accordion-panel). */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className={cx("accordion-panel pb-5 text-muted", variant === "icons" ? "px-2 md:pl-[72px]" : "px-5")}
            >
              {typeof item.content === "string" ? (
                <p className="max-w-[68ch] whitespace-pre-line">{item.content}</p>
              ) : (
                item.content
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
