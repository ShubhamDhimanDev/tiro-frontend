"use client";

import { useId, useState } from "react";
import { OutOfAreaCapture } from "@/components/forms/out-of-area-capture";
import { useLocation } from "@/components/location/location-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { locationApi } from "@/lib/location/client-api";
import { suburbMatches } from "@/lib/locations/format";
import type { LocationSuburb } from "@/lib/locations/types";

type Check =
  | { kind: "idle" }
  | { kind: "covered"; label: string }
  | { kind: "not_served"; query: string }
  | { kind: "error"; message: string };

/** Suburbs shown before "Show all"; searching always searches the whole list. */
const INITIAL = 24;

/**
 * Suburb search and list for a city page. The list (from the API tree) filters
 * as you type with no request. Choosing a suburb sets it as your area through
 * the same serviceability check the header uses, so prices and times follow.
 * When nothing in the list matches, "Check this suburb" asks the API directly,
 * and a suburb we don't serve gets the notify-me capture instead of a dead end.
 */
export function CitySuburbs({ cityName, suburbs }: { cityName: string; suburbs: LocationSuburb[] }) {
  const { setZone } = useLocation();
  const id = useId();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [check, setCheck] = useState<Check>({ kind: "idle" });

  const matches = suburbs.filter((s) => suburbMatches(s, query));
  const visible = query || showAll ? matches : matches.slice(0, INITIAL);
  const hidden = matches.length - visible.length;

  async function run(input: { postcode: string } | { suburb: string }, key: string, label: string) {
    setBusy(key);
    setCheck({ kind: "idle" });
    const res = await locationApi.check(input);
    setBusy(null);
    if (res.kind === "success") {
      const d = res.data;
      if (d.serviceable && d.service_zone_id !== null && d.label) {
        setZone({ zoneId: String(d.service_zone_id), label: d.label });
        setCheck({ kind: "covered", label: d.label });
      } else {
        setCheck({ kind: "not_served", query: label });
      }
      return;
    }
    setCheck({ kind: "error", message: res.message });
  }

  function checkTyped() {
    const q = query.trim();
    if (!q) return;
    void run(/^\d{4}$/.test(q) ? { postcode: q } : { suburb: q }, "typed", q);
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        id={`${id}-search`}
        label={`Search suburbs in ${cityName}`}
        type="search"
        name="suburb-search"
        autoComplete="off"
        hint="Type a suburb or postcode."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCheck({ kind: "idle" });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (matches.length === 0) checkTyped();
          }
        }}
      />

      <p role="status" aria-live="polite" className="text-sm text-muted">
        {matches.length === 0
          ? `No suburb in our ${cityName} list matches "${query}".`
          : `${matches.length} ${matches.length === 1 ? "suburb" : "suburbs"}${query ? " match" : ` in ${cityName}`}. Choose one to see prices and times for it.`}
      </p>

      {matches.length === 0 && query.trim() && (
        <div className="flex flex-col items-start gap-3">
          <Button variant="secondary" size="sm" loading={busy === "typed"} onClick={checkTyped}>
            Check &ldquo;{query.trim()}&rdquo;
          </Button>
        </div>
      )}

      {visible.length > 0 && (
        <ul aria-label={`Suburbs in ${cityName}`} className="flex flex-wrap gap-2">
          {visible.map((s) => {
            const key = `${s.slug}-${s.postcode}`;
            return (
              <li key={key}>
                <button
                  type="button"
                  disabled={busy !== null}
                  aria-busy={busy === key || undefined}
                  onClick={() => void run({ postcode: s.postcode }, key, `${s.name} ${s.postcode}`)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium transition-colors hover:bg-chip disabled:opacity-60"
                >
                  {s.name}
                  <span className="font-mono text-xs text-muted">{s.postcode}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex min-h-11 w-fit items-center font-semibold text-link underline underline-offset-4 hover:text-ink"
        >
          Show all {matches.length} suburbs
        </button>
      )}

      <div aria-live="polite" className="text-base">
        {check.kind === "covered" && (
          <p className="font-medium text-success">Good news, we fit tyres in {check.label}. Prices and times now match your area.</p>
        )}
        {check.kind === "error" && <p role="alert" className="msg-error">{check.message}</p>}
      </div>
      {check.kind === "not_served" && (
        <div className="flex flex-col gap-3">
          <p role="alert" className="msg-error">We don&apos;t fit tyres in {check.query} yet.</p>
          <OutOfAreaCapture query={check.query} />
        </div>
      )}
    </div>
  );
}
