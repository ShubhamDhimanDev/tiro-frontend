"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { cx } from "@/components/ui/cx";

/**
 * Segmented control (WAI-ARIA tabs, automatic activation) over the three
 * enquiry forms on /contact. Arrow keys, Home and End move between tabs;
 * only the active tab is in the tab order.
 *
 * Deep links: `/contact?type=quote&size=205%2F55R16` opens "Get a quote" with
 * the size prefilled (used by tyre empty states). Only the tab and a tyre size
 * ever appear in the URL, never anything personal. Changing tab rewrites the
 * `type` param in place without a navigation.
 */

const TABS = [
  { key: "contact", label: "Contact", blurb: "A question about an order, a booking or anything else." },
  { key: "quote", label: "Get a quote", blurb: "Can't find your tyre, or want a price for an unusual size? Tell us what you need." },
  { key: "fleet", label: "Fleet enquiry", blurb: "Tyres for a work fleet. Tell us about your vehicles and we will come back with options." },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function isTab(value: string | null): value is TabKey {
  return TABS.some((t) => t.key === value);
}

const SIZE_PARAM = /^[0-9]{3}\/[0-9]{2}\s?[A-Za-z]{0,2}\s?R?[0-9]{2}[A-Za-z0-9 ]{0,8}$/;

export function ContactTabs() {
  const params = useSearchParams();
  const requested = params.get("type");
  const size = params.get("size");
  const [active, setActive] = useState<TabKey>(isTab(requested) ? requested : "contact");
  const baseId = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const prefillSize = size && size.length <= 40 && SIZE_PARAM.test(size) ? size : undefined;

  function select(key: TabKey, focus = false) {
    setActive(key);
    const url = new URL(window.location.href);
    url.searchParams.set("type", key);
    if (key !== "quote") url.searchParams.delete("size");
    window.history.replaceState(null, "", url);
    if (focus) refs.current[key]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    select(TABS[next].key, true);
  }

  const current = TABS.find((t) => t.key === active)!;

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="What is your enquiry about?"
        className="grid grid-cols-3 gap-1 rounded-full bg-chip p-1"
      >
        {TABS.map((tab, i) => {
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                refs.current[tab.key] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cx(
                "min-h-11 rounded-full px-2 text-sm font-semibold transition-colors sm:px-4",
                selected ? "bg-ink text-white" : "text-ink hover:bg-surface",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active}`} className="flex flex-col gap-4">
        <p className="text-muted">{current.blurb}</p>
        {/* `key` resets the form (and its errors) when the tab changes. */}
        <EnquiryForm key={active} type={active} initial={active === "quote" && prefillSize ? { tyre_size: prefillSize } : undefined} />
      </div>
    </div>
  );
}
