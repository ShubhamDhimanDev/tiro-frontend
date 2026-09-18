"use client";

import { useState } from "react";
import { locationApi } from "@/lib/location/client-api";
import { useLocation } from "@/components/location/location-provider";
import { FormField, FormError, FormNotice, inputClassName, primaryButtonClassName } from "@/components/ui/form-field";

const AU_POSTCODE = /^\d{4}$/;

/**
 * Suburb/postcode capture UI — `docs/architecture/03-integrations.md`'s
 * Google Places-style autocomplete isn't built/committed yet this round
 * (per task brief: "don't block on it"), so this is a plain text input with
 * basic client-side validation only. Accepts either a 4-digit AU postcode
 * or a suburb name in the same field and infers which one it is client-side
 * — Laravel does the real resolution either way (`POST /api/v1/serviceability`,
 * "the frontend never computes serviceability itself").
 */
export function LocationCaptureForm({ onResolved }: { onResolved?: () => void }) {
  const { setZone } = useLocation();

  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  async function submit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError("Enter a suburb or postcode.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    setSuggestions([]);

    const input = AU_POSTCODE.test(trimmed) ? { postcode: trimmed } : { suburb: trimmed };
    const result = await locationApi.check(input);
    setSubmitting(false);

    if (result.kind === "success") {
      if (result.data.serviceable && result.data.service_zone_id !== null && result.data.label) {
        setZone({ zoneId: String(result.data.service_zone_id), label: result.data.label });
        setNotice(`Great — we deliver to ${result.data.label}.`);
        onResolved?.();
        return;
      }
      setError(`We don't currently service "${trimmed}".`);
      setSuggestions(result.data.suggested_areas);
      return;
    }

    if (result.kind === "validation_error") {
      setError(result.message);
      return;
    }

    setError(result.message);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(value);
      }}
      className="flex flex-col gap-3"
    >
      {notice && <FormNotice message={notice} />}
      {error && <FormError message={error} />}

      <FormField label="Suburb or postcode" htmlFor="location-input" hint="e.g. Richmond or 3121">
        <div className="flex gap-2">
          <input
            id="location-input"
            name="location"
            type="text"
            autoComplete="postal-code"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClassName}
            placeholder="Enter your suburb or postcode"
          />
          <button type="submit" disabled={submitting} className={`${primaryButtonClassName} w-auto shrink-0 px-4`}>
            {submitting ? "Checking…" : "Check"}
          </button>
        </div>
      </FormField>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => {
                setValue(area);
                void submit(area);
              }}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {area}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
