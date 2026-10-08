"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputClassName } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";
import { readLastSize, writeLastSize } from "@/lib/catalog/last-search";

export const WIDTHS = [165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295, 305, 315];
export const PROFILES = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
export const RIMS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

export interface TyreSearchFormValues {
  width?: string;
  profile?: string;
  rim_diameter?: string;
  staggered?: string;
  front_width?: string;
  front_profile?: string;
  front_rim_diameter?: string;
  rear_width?: string;
  rear_profile?: string;
  rear_rim_diameter?: string;
}

export function SizeSelects({
  prefix,
  width,
  profile,
  rim,
  onChange,
  large = false,
}: {
  prefix: string;
  width: string;
  profile: string;
  rim: string;
  onChange: (field: "width" | "profile" | "rim", value: string) => void;
  /** Finder style: 62px controls with a visible label above each. */
  large?: boolean;
}) {
  // 16px minimum on phones: iOS Safari zooms the page when a control under 16px takes focus.
  const selectClass = cx(inputClassName, "font-mono", large && "!min-h-[62px] !px-2.5 text-base font-semibold max-[359px]:!pl-1.5 md:!px-4");
  const wrap = (label: string, node: React.ReactNode) =>
    large ? (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-black">{label}</span>
        {node}
      </div>
    ) : (
      node
    );
  return (
    // Below 360px the three equal columns are too narrow for the 16px placeholders ("Profile" is the longest), so give the columns uneven shares.
    <div className="grid grid-cols-[1.33fr_1.63fr_1fr] gap-2 min-[360px]:grid-cols-3 md:gap-3">
      {wrap("Width", <select
        aria-label={`${prefix} width`}
        value={width}
        onChange={(e) => onChange("width", e.target.value)}
        className={selectClass}
      >
        <option value="">Width</option>
        {WIDTHS.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>)}
      {wrap("Profile", <select
        aria-label={`${prefix} profile`}
        value={profile}
        onChange={(e) => onChange("profile", e.target.value)}
        className={selectClass}
      >
        <option value="">Profile</option>
        {PROFILES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>)}
      {wrap("Rim", <select
        aria-label={`${prefix} rim diameter`}
        value={rim}
        onChange={(e) => onChange("rim", e.target.value)}
        className={selectClass}
      >
        <option value="">Rim</option>
        {RIMS.map((r) => (
          <option key={r} value={r}>
            R{r}
          </option>
        ))}
      </select>)}
    </div>
  );
}

/**
 * Tyre-size search UI — requirements §3.1 (P0 core flow). Width/profile/rim
 * selectors, plus an explicit staggered-fit toggle revealing separate
 * front/rear selectors. Submitting navigates to `/tyres?...` — the search
 * results page (`app/tyres/(catalog)/page.tsx`) reads `searchParams` server-side and
 * SSRs the first paint, per the contract's server-rendered-vs-client-fetched
 * table. This is a client-side URL-driven navigation (`router.push`), not a
 * separate fetch/proxy layer, so results stay crawlable/bookmarkable.
 */
export function TyreSearchForm({
  initial,
  finder = false,
}: {
  initial: TyreSearchFormValues;
  /** Home/landing finder style: large controls, green "Find tyres" button. */
  finder?: boolean;
}) {
  const router = useRouter();
  // Drives the submit button's "Searching…" pending state below —
  // `router.push` itself doesn't return anything awaitable, so `isPending`
  // here is what actually stays `true` until the new `/tyres?...` route's
  // RSC render commits (the same signal React uses internally to decide
  // when to show `app/tyres/(catalog)/loading.tsx`'s fallback instead of blocking).
  // Without this the button gave no feedback at all between click and the
  // page visibly changing — the exact "feels laggy" gap this pass is fixing.
  const [isPending, startTransition] = useTransition();

  const [staggered, setStaggered] = useState(initial.staggered === "true");
  const [width, setWidth] = useState(initial.width ?? "");
  const [profile, setProfile] = useState(initial.profile ?? "");
  const [rim, setRim] = useState(initial.rim_diameter ?? "");
  const [frontWidth, setFrontWidth] = useState(initial.front_width ?? "");
  const [frontProfile, setFrontProfile] = useState(initial.front_profile ?? "");
  const [frontRim, setFrontRim] = useState(initial.front_rim_diameter ?? "");
  const [rearWidth, setRearWidth] = useState(initial.rear_width ?? "");
  const [rearProfile, setRearProfile] = useState(initial.rear_profile ?? "");
  const [rearRim, setRearRim] = useState(initial.rear_rim_diameter ?? "");
  const [error, setError] = useState<string | null>(null);

  // Prefill an untouched finder with the visitor's last size search (this browser only). Deferred to a microtask, same
  // reason as the cart/location providers: no synchronous setState in the effect body.
  useEffect(() => {
    const untouched = !initial.width && !initial.profile && !initial.rim_diameter && initial.staggered !== "true";
    if (!untouched) return;
    queueMicrotask(() => {
      const last = readLastSize();
      // Only sizes the selects actually offer, so a stale value never shows a blank control.
      if (!last || !WIDTHS.includes(+last.width) || !PROFILES.includes(+last.profile) || !RIMS.includes(+last.rim_diameter)) return;
      setWidth((w) => w || last.width);
      setProfile((p) => p || last.profile);
      setRim((r) => r || last.rim_diameter);
    });
  }, [initial.width, initial.profile, initial.rim_diameter, initial.staggered]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const params = new URLSearchParams();

    if (staggered) {
      if (!frontWidth || !frontProfile || !frontRim || !rearWidth || !rearProfile || !rearRim) {
        setError("Select a complete size for both front and rear tyres.");
        return;
      }
      params.set("staggered", "true");
      params.set("front_width", frontWidth);
      params.set("front_profile", frontProfile);
      params.set("front_rim_diameter", frontRim);
      params.set("rear_width", rearWidth);
      params.set("rear_profile", rearProfile);
      params.set("rear_rim_diameter", rearRim);
    } else {
      if (!width || !profile || !rim) {
        setError("Select a width, profile, and rim diameter.");
        return;
      }
      writeLastSize({ width, profile, rim_diameter: rim });
      params.set("width", width);
      params.set("profile", profile);
      params.set("rim_diameter", rim);
    }

    const href = `/tyres?${params.toString()}`;
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm text-black">
        <input
          type="checkbox"
          checked={staggered}
          onChange={(e) => setStaggered(e.target.checked)}
          className="h-5 w-5 shrink-0 rounded-xs border-steel accent-green"
        />
        Different front and rear sizes? (staggered fitment)
      </label>

      {staggered ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Front</span>
            <SizeSelects
              large={finder}
              prefix="Front"
              width={frontWidth}
              profile={frontProfile}
              rim={frontRim}
              onChange={(field, value) => {
                if (field === "width") setFrontWidth(value);
                if (field === "profile") setFrontProfile(value);
                if (field === "rim") setFrontRim(value);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Rear</span>
            <SizeSelects
              large={finder}
              prefix="Rear"
              width={rearWidth}
              profile={rearProfile}
              rim={rearRim}
              onChange={(field, value) => {
                if (field === "width") setRearWidth(value);
                if (field === "profile") setRearProfile(value);
                if (field === "rim") setRearRim(value);
              }}
            />
          </div>
        </div>
      ) : (
        <SizeSelects
          large={finder}
          prefix="Size"
          width={width}
          profile={profile}
          rim={rim}
          onChange={(field, value) => {
            if (field === "width") setWidth(value);
            if (field === "profile") setProfile(value);
            if (field === "rim") setRim(value);
          }}
        />
      )}

      {error && (
        <p role="alert" className="text-sm msg-error">
          {error}
        </p>
      )}

      <Button type="submit" loading={isPending} size={finder ? "lg" : "md"} fullWidth={finder} className={finder ? undefined : "sm:w-auto"}>
        {!isPending && finder && <SearchIcon className="h-5 w-5" />}
        {isPending ? "Searching…" : finder ? "Find tyres" : "Search tyres"}
      </Button>
    </form>
  );
}
