"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { LayoutGroup, m } from "framer-motion";
import { DUR, tween } from "@/components/motion/variants";
import { cx } from "./cx";

export type TabItem = { key: string; label: string; panel: ReactNode };

/**
 * Underline tabs (finder, product tabs): inactive grey, active black with a
 * 3px yellow underline, on a 1px rule. WAI-ARIA tabs: roving tabindex,
 * Arrow/Home/End keys. Only the active panel is mounted.
 */
export function Tabs({
  tabs,
  label,
  className,
  panelClassName,
  defaultKey,
  activeKey,
  onChange,
}: {
  tabs: TabItem[];
  /** Accessible name of the tablist. */
  label: string;
  className?: string;
  panelClassName?: string;
  defaultKey?: string;
  /** Controlled mode: the active tab key. Pair with `onChange`. */
  activeKey?: string;
  onChange?: (key: string) => void;
}) {
  const baseId = useId();
  const [inner, setActive] = useState(defaultKey ?? tabs[0]?.key);
  const active = activeKey ?? inner;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function select(key: string) {
    setActive(key);
    onChange?.(key);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex((t) => t.key === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    select(tabs[next].key);
    refs.current[tabs[next].key]?.focus();
  }

  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className={className}>
      <LayoutGroup id={baseId}>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex border-b border-line">
        {tabs.map((t) => {
          const selected = t.key === current.key;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[t.key] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(t.key)}
              className={cx(
                "relative -mb-px min-h-12 flex-1 border-b-[3px] border-transparent px-2 text-sm font-bold md:text-[15px] transition-colors duration-300 md:flex-none md:px-6",
                selected ? "text-black" : "text-muted hover:text-black",
              )}
            >
              {t.label}
              {selected && (
                <m.span
                  layoutId="tab-underline"
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-[3px] h-[3px] bg-gold"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          );
        })}
      </div>
      </LayoutGroup>
      <m.div
        key={current.key}
        role="tabpanel"
        id={`${baseId}-panel-${current.key}`}
        aria-labelledby={`${baseId}-tab-${current.key}`}
        className={panelClassName}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1, transition: tween(DUR.base) }}
      >
        {current.panel}
      </m.div>
    </div>
  );
}
