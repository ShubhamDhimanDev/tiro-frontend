"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/field";
import { suburbsApi } from "@/lib/suburbs/client-api";
import type { SuburbSuggestion } from "@/lib/suburbs/types";

/** Wait this long after the last keystroke before asking the API, so typing "rich" is one request, not four. */
export const SUGGEST_DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

/**
 * Suburb field with live suggestions from `GET /suburbs/search`: type a suburb
 * or postcode and pick "Richmond VIC 3121", which fills suburb, state and
 * postcode together. Suggestions we do not serve are labelled and still
 * pickable (the address step then explains it), so a customer is never told
 * their suburb does not exist when it is simply outside our area.
 *
 * Plain typing keeps working with no suggestions at all (the API being down,
 * or a suburb it does not list): this only ever adds help, it never blocks
 * entry. ARIA combobox pattern: the input owns focus, arrow keys move through
 * the options, Enter picks, Escape closes.
 */
export function SuburbTypeahead({
  value,
  onChange,
  onPick,
  disabled,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  onPick: (suggestion: SuburbSuggestion) => void;
  disabled?: boolean;
  error?: string;
}) {
  const listId = useId();
  const [options, setOptions] = useState<SuburbSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const seq = useRef(0);
  const picked = useRef<string | null>(null);

  useEffect(() => {
    const term = value.trim();
    // Right after a pick the field holds the chosen suburb: do not search for it again.
    if (picked.current === term || term.length < MIN_CHARS) {
      const mySeq = ++seq.current;
      queueMicrotask(() => {
        if (mySeq === seq.current) {
          setOptions([]);
          setOpen(false);
        }
      });
      return;
    }
    const mySeq = ++seq.current;
    const timer = window.setTimeout(() => {
      suburbsApi.search(term).then((res) => {
        if (mySeq !== seq.current) return; // A newer keystroke superseded this call.
        const list = res.kind === "success" ? res.data.data : [];
        setOptions(list);
        setActive(-1);
        setOpen(list.length > 0);
      });
    }, SUGGEST_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  function choose(option: SuburbSuggestion) {
    picked.current = option.name.trim();
    setOpen(false);
    setOptions([]);
    onPick(option);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Input
        id="manual-suburb"
        label="Suburb"
        aria-required="true"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        disabled={disabled}
        error={error}
        onChange={(e) => {
          picked.current = null;
          onChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suburb suggestions"
          className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-control border border-field bg-surface shadow-overlay"
        >
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Mouse down (not click) so the pick lands before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-sm text-black ${i === active ? "bg-gold-soft" : "hover:bg-band"}`}
            >
              <span className="font-medium">{o.label}</span>
              {!o.serviceable && <span className="shrink-0 text-xs font-bold text-black">Outside our area</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
