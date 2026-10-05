"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useLocation } from "@/components/location/location-provider";
import { OutOfAreaCapture } from "@/components/forms/out-of-area-capture";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { PinIcon } from "@/components/ui/icons";
import { locationApi } from "@/lib/location/client-api";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";

const AU_POSTCODE = /^\d{4}$/;

type Result =
  | { kind: "idle" }
  | { kind: "covered"; label: string }
  | { kind: "not_covered"; query: string; suggestions: string[] }
  | { kind: "error"; message: string };

/**
 * Home coverage checker. Uses the same serviceability call and zone state as
 * the header location sheet, so a successful check also sets the visitor's
 * area (prices and times) without a modal.
 */
export function CoverageChecker({ cities = [] }: { cities?: { name: string; href: string }[] }) {
  const { setZone } = useLocation();
  const id = useId();
  const [value, setValue] = useState("");
  const [inputError, setInputError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>({ kind: "idle" });

  async function check(raw: string) {
    const query = raw.trim();
    if (!query) {
      setInputError("Enter a suburb or a 4-digit postcode.");
      return;
    }
    setInputError(undefined);
    setLoading(true);
    const res = await locationApi.check(AU_POSTCODE.test(query) ? { postcode: query } : { suburb: query });
    setLoading(false);

    if (res.kind === "success") {
      const d = res.data;
      if (d.serviceable && d.service_zone_id !== null && d.label) {
        setZone({ zoneId: String(d.service_zone_id), label: d.label });
        setResult({ kind: "covered", label: d.label });
      } else {
        setResult({ kind: "not_covered", query, suggestions: d.suggested_areas });
      }
      return;
    }
    setResult({ kind: "error", message: res.message });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void check(value);
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h2 id="coverage-heading" className="type-h2 text-white">
        Nationwide, we come to you
      </h2>

      <div className="flex w-full max-w-[640px] flex-col gap-4 rounded-card bg-surface p-5 text-left shadow-raised md:p-8">
        <p className="text-[15px] font-bold text-black">Enter your suburb or postcode to see if we come to you.</p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3" aria-labelledby="coverage-heading">
        <Input
          id={`${id}-area`}
          label="Your suburb"
          hint="Or a 4-digit postcode, like 3121."
          className="!min-h-[62px]"
          name="area"
          autoComplete="postal-code"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={inputError}
        />
        <Button type="submit" loading={loading} fullWidth size="lg" variant="green">
          {loading ? "Checking" : "Check my area"}
        </Button>

        <div aria-live="polite" className="text-base">
          {result.kind === "covered" && (
            <p className="font-bold text-success">
              Good news, we fit tyres in {result.label}. Prices and times now match your area.
            </p>
          )}
          {result.kind === "not_covered" && (
            <div className="flex flex-col gap-3">
              <p role="alert" className="msg-error">
                We don&apos;t cover &ldquo;{result.query}&rdquo; yet. Call us on{" "}
                <a href={PHONE_HREF} className="underline underline-offset-2">
                  {PHONE_DISPLAY}
                </a>{" "}
                and we will tell you what is possible.
              </p>
              {result.suggestions.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Nearby areas we cover">
                  {result.suggestions.map((area) => (
                    <li key={area}>
                      <button
                        type="button"
                        onClick={() => {
                          setValue(area);
                          void check(area);
                        }}
                        className="min-h-10 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:bg-chip"
                      >
                        {area}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/contact" className={buttonClassName({ variant: "secondary", size: "sm", className: "w-fit" })}>
                Contact us
              </Link>
            </div>
          )}
          {result.kind === "error" && <p role="alert" className="msg-error">{result.message}</p>}
        </div>
      </form>
      {result.kind === "not_covered" && <OutOfAreaCapture query={result.query} />}
      </div>

      {cities.length > 0 && (
        <ul aria-label="Cities we cover" className="flex flex-wrap justify-center gap-2">
          {cities.map((city) => (
            <li key={city.href + city.name}>
              <Link
                href={city.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-control bg-black px-4 text-sm font-bold text-white transition-colors duration-300 hover:bg-gold hover:text-black"
              >
                <PinIcon className="h-4 w-4" />
                {city.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
