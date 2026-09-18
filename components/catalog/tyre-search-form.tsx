"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClassName, primaryButtonClassName } from "@/components/ui/form-field";

const WIDTHS = [165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295, 305, 315];
const PROFILES = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
const RIMS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

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

function SizeSelects({
  prefix,
  width,
  profile,
  rim,
  onChange,
}: {
  prefix: string;
  width: string;
  profile: string;
  rim: string;
  onChange: (field: "width" | "profile" | "rim", value: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        aria-label={`${prefix} width`}
        value={width}
        onChange={(e) => onChange("width", e.target.value)}
        className={inputClassName}
      >
        <option value="">Width</option>
        {WIDTHS.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>
      <select
        aria-label={`${prefix} profile`}
        value={profile}
        onChange={(e) => onChange("profile", e.target.value)}
        className={inputClassName}
      >
        <option value="">Profile</option>
        {PROFILES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select
        aria-label={`${prefix} rim diameter`}
        value={rim}
        onChange={(e) => onChange("rim", e.target.value)}
        className={inputClassName}
      >
        <option value="">Rim</option>
        {RIMS.map((r) => (
          <option key={r} value={r}>
            R{r}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Tyre-size search UI — requirements §3.1 (P0 core flow). Width/profile/rim
 * selectors, plus an explicit staggered-fit toggle revealing separate
 * front/rear selectors. Submitting navigates to `/tyres?...` — the search
 * results page (`app/tyres/page.tsx`) reads `searchParams` server-side and
 * SSRs the first paint, per the contract's server-rendered-vs-client-fetched
 * table. This is a client-side URL-driven navigation (`router.push`), not a
 * separate fetch/proxy layer, so results stay crawlable/bookmarkable.
 */
export function TyreSearchForm({ initial }: { initial: TyreSearchFormValues }) {
  const router = useRouter();

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
      params.set("width", width);
      params.set("profile", profile);
      params.set("rim_diameter", rim);
    }

    router.push(`/tyres?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={staggered}
          onChange={(e) => setStaggered(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        My front and rear tyres are different sizes (staggered fitment)
      </label>

      {staggered ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Front</span>
            <SizeSelects
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
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Rear</span>
            <SizeSelects
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
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button type="submit" className={`${primaryButtonClassName} sm:w-auto`}>
        Search tyres
      </button>
    </form>
  );
}
