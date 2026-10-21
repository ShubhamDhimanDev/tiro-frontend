"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TyreSearchForm } from "@/components/catalog/tyre-search-form";
import { useLocation } from "@/components/location/location-provider";
import { Button, buttonClassName } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Input, Select } from "@/components/ui/field";
import { PinIcon, SearchIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";
import { lookupRego as defaultLookup } from "@/lib/rego/adapter";
import type { RegoLookup } from "@/lib/rego/adapter";
import { AU_STATES, REGO_NO_MATCH_MESSAGE, validateRego } from "@/lib/rego/validate";

type TabKey = "size" | "vehicle" | "rego";

/**
 * Rego tab. Validates locally, then calls the adapter. Until the lookup provider is chosen the
 * adapter is a stub, so a valid plate gets a plain "not available yet" note.
 */
export function RegoPanel({
  lookup = defaultLookup,
  onUseSize,
  defaultState = "",
}: {
  lookup?: RegoLookup;
  onUseSize?: () => void;
  /** Pre-selected plate state, e.g. the state of the city page the finder sits on. */
  defaultState?: string;
}) {
  const router = useRouter();
  const [plate, setPlate] = useState("");
  const [state, setState] = useState(defaultState);
  const [errors, setErrors] = useState<{ plate?: string; state?: string }>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormMessage(null);
    const v = validateRego(plate, state);
    if (!v.ok) {
      setErrors({ [v.field]: v.message });
      return;
    }
    setErrors({});
    setLoading(true);
    const result = await lookup({ plate: v.plate, state: v.state });
    setLoading(false);
    if (result.kind === "no_match") setFormMessage(REGO_NO_MATCH_MESSAGE);
    else if (result.kind === "not_implemented") setFormMessage("Number plate search isn't available yet.");
    else if (result.kind === "error") setFormMessage(result.message);
    else router.push(`/tyres/by-vehicle?vehicle=${result.vehicleId}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Input
          label="Vehicle registration"
          name="plate"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          error={errors.plate}
          className="!min-h-[62px] font-semibold uppercase"
        />
        <Select label="State" name="state" value={state} onChange={(e) => setState(e.target.value)} error={errors.state} className="!min-h-[62px] font-semibold">
          <option value="">Select</option>
          {AU_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      {formMessage && (
        <p role="alert" className="text-sm msg-error">
          {formMessage}
          {onUseSize && (
            <>
              {" "}
              <button type="button" onClick={onUseSize} className="font-semibold underline underline-offset-2">
                Search by size
              </button>
            </>
          )}
        </p>
      )}
      <Button type="submit" loading={loading} fullWidth size="lg">
        {!loading && <SearchIcon className="h-5 w-5" />}
        {loading ? "Looking up" : "Find tyres"}
      </Button>
    </form>
  );
}

/** Suburb chip inside the finder. Opens the shared location modal; never blocks. */
export function FinderLocation() {
  const { zone, loading, openPicker } = useLocation();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={openPicker}
      className="flex min-h-12 w-full items-center gap-2 rounded-control border border-dashed border-field bg-band px-3.5 text-left text-sm text-black transition-colors duration-300 hover:border-black"
    >
      <PinIcon className={cx("h-5 w-5 shrink-0", zone ? "text-green" : "text-black")} />
      <span className="min-w-0 flex-1 truncate">
        {loading ? (
          " "
        ) : zone ? (
          <>
            <span className="font-bold">{zone.label}</span> prices and times
          </>
        ) : (
          "Add your suburb"
        )}
      </span>
      <span className="shrink-0 text-xs font-bold text-link">{zone ? "Change" : "Add"}</span>
    </button>
  );
}

/**
 * Finder card (home hero, location pages): tabs "Search by size" | "Search by
 * vehicle" | "Search by rego" (rego only when the feature flag is on). Size
 * embeds the existing `TyreSearchForm` in finder style (staggered fitment
 * stays behind its checkbox); vehicle hands off to the make/model/year picker
 * at /tyres/by-vehicle. Visual spec: white card, 10px radius, 32px padding.
 */
export function HeroFinder({
  regoEnabled = false,
  lookupRego,
  defaultRegoState,
}: {
  regoEnabled?: boolean;
  lookupRego?: RegoLookup;
  /** Pre-select this state (e.g. "VIC") in the Rego tab. Used on city pages. */
  defaultRegoState?: string;
}) {
  const [active, setActive] = useState<TabKey>("size");
  const tabs: { key: TabKey; label: string; panel: React.ReactNode }[] = [
    { key: "size", label: "Search by size", panel: <TyreSearchForm initial={{}} finder /> },
    {
      key: "vehicle",
      label: "Search by vehicle",
      panel: (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] text-muted">Pick your make, model and year and we will show the sizes that fit.</p>
          <Link href="/tyres/by-vehicle" className={buttonClassName({ size: "lg", fullWidth: true })}>
            <SearchIcon className="h-5 w-5" />
            Find by vehicle
          </Link>
        </div>
      ),
    },
  ];
  if (regoEnabled) {
    tabs.push({
      key: "rego",
      label: "Search by rego",
      panel: <RegoPanel lookup={lookupRego} onUseSize={() => setActive("size")} defaultState={defaultRegoState} />,
    });
  }

  return (
    <div className="rounded-card bg-surface p-5 shadow-raised md:p-8" data-testid="hero-finder">
      <Tabs
        tabs={tabs}
        label="How do you want to find your tyres?"
        activeKey={active}
        onChange={(k) => setActive(k as TabKey)}
        panelClassName="pt-5"
      />
      <div className="mt-4">
        <FinderLocation />
      </div>
    </div>
  );
}
