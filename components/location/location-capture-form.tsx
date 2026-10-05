"use client";

import { useId, useState } from "react";
import { locationApi } from "@/lib/location/client-api";
import { useLocation } from "@/components/location/location-provider";
import { OutOfAreaCapture } from "@/components/forms/out-of-area-capture";
import { ServiceError } from "@/components/ui/service-error";
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
  const inputId = useId();

  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Non-422 failure (5xx / network / timeout): friendly banner + Retry + call-us, never raw server text.
  const [serviceFailure, setServiceFailure] = useState<{ query: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [notServed, setNotServed] = useState<string | null>(null);

  async function submit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError("Enter a suburb or postcode.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setServiceFailure(null);
    setNotice(null);
    setSuggestions([]);
    setNotServed(null);

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
      setNotServed(trimmed);
      return;
    }

    if (result.kind === "validation_error") {
      setError(result.message);
      return;
    }

    // `unknown_error` (5xx / network / timeout): fixed friendly copy, never the server text.
    setServiceFailure({ query: trimmed });
  }

  return (
    <div className="flex flex-col gap-3">
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(value);
      }}
      className="flex flex-col gap-3"
    >
      {notice && <FormNotice message={notice} />}
      {error && <FormError message={error} />}
      {serviceFailure && (
        <ServiceError
          message="We couldn't check your area right now. Please try again, or call us and we'll sort it out."
          onRetry={() => void submit(serviceFailure.query)}
          retrying={submitting}
        />
      )}

      <FormField label="Suburb or postcode" htmlFor={inputId} hint="e.g. Richmond or 3121">
        <div className="flex gap-2">
          <input
            id={inputId}
            name="location"
            type="text"
            autoComplete="postal-code"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            // `min-w-0 flex-1` so this input actually claims the flex row's
            // remaining space (see the button's own comment below for the
            // real bug this pairs with).
            className={`${inputClassName} min-w-0 flex-1`}
            placeholder="Suburb or postcode"
          />
          {/*
            `!w-auto` (Tailwind's important-modifier), not plain `w-auto` —
            found during this pass's mobile audit: `primaryButtonClassName`
            bakes in `w-full` for its many standalone-button call sites, and
            a same-specificity `w-auto` appended after it in this className
            string does NOT reliably win — Tailwind emits one stylesheet
            ordered by its own utility-category order, not by a call site's
            string-concatenation order, so `w-full` was winning here and
            this button was rendering at the full width of its flex row,
            squeezing the suburb/postcode input beside it down to a
            genuinely unusable ~26px on a real phone viewport (confirmed:
            333px-wide row, this button alone claiming all of it). `!w-auto`
            forces `width: auto !important`, which no plain utility can
            out-specificity regardless of source order.
          */}
          <button
            type="submit"
            disabled={submitting}
            className={`${primaryButtonClassName} !w-auto shrink-0 px-4`}
          >
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
              className="min-h-11 rounded-md border border-line px-3 py-1 text-sm text-black transition-colors hover:border-black"
            >
              {area}
            </button>
          ))}
        </div>
      )}
    </form>
    {notServed && <OutOfAreaCapture query={notServed} />}
    </div>
  );
}
