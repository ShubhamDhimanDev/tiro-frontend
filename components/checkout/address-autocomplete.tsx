"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { SuburbTypeahead } from "@/components/checkout/suburb-typeahead";
import { Input, Select } from "@/components/ui/field";
import { AU_STATES } from "@/lib/checkout/au-states";
import type { PlacesAddress } from "@/lib/checkout/address";

/**
 * Google Places Autocomplete for the checkout address step
 * (docs/architecture/03-integrations.md item 2). Fully independent of
 * cart/checkout/payment logic: this component's only job is turning a picked
 * place into a `PlacesAddress`, via `onSelect`.
 *
 * Uses the classic `google.maps.places.Autocomplete` widget bound to a plain
 * `<input>` (not the newer `PlaceAutocompleteElement` web component): still
 * fully supported and simpler for a controlled-input React integration. If a
 * key is later provisioned under a program that requires the newer element,
 * this may need revisiting.
 *
 * **No `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` exists in this environment.** Without
 * a key this renders the manual-entry fields directly (never loads the Maps
 * script), so the address step is fully usable/testable; the autocomplete
 * itself is unverified live until a key is wired in.
 *
 * `showErrors` (checkout sets it after a failed "Place order" when no usable
 * address exists) turns on per-field messages. It is off by default so the
 * account address form behaves as before. `hideLine2` lets checkout render one
 * shared "Unit / apartment" field instead of a second one here.
 */
export function AddressAutocomplete({
  onSelect,
  disabled,
  showErrors = false,
  hideLine2 = false,
}: {
  onSelect: (address: PlacesAddress) => void;
  disabled?: boolean;
  showErrors?: boolean;
  hideLine2?: boolean;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <ManualAddressFields
        onSelect={onSelect}
        disabled={disabled}
        showErrors={showErrors}
        hideLine2={hideLine2}
        notice="Enter the address where we'll fit your tyres."
      />
    );
  }

  return (
    <LiveAutocomplete
      apiKey={apiKey}
      onSelect={onSelect}
      disabled={disabled}
      showErrors={showErrors}
      hideLine2={hideLine2}
    />
  );
}

function LiveAutocomplete({
  apiKey,
  onSelect,
  disabled,
  showErrors,
  hideLine2,
}: {
  apiKey: string;
  onSelect: (address: PlacesAddress) => void;
  disabled?: boolean;
  showErrors: boolean;
  hideLine2: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptState, setScriptState] = useState<"loading" | "ready" | "error">("loading");
  const [manualFallback, setManualFallback] = useState(false);

  useEffect(() => {
    if (scriptState !== "ready" || !inputRef.current || typeof google === "undefined") return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "au" },
      fields: ["address_components", "geometry", "formatted_address"],
      types: ["address"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const parsed = parsePlace(place);
      if (parsed) onSelect(parsed);
    });

    return () => listener.remove();
  }, [scriptState, onSelect]);

  if (manualFallback || scriptState === "error") {
    return (
      <ManualAddressFields
        onSelect={onSelect}
        disabled={disabled}
        showErrors={showErrors}
        hideLine2={hideLine2}
        notice="Address search couldn't load. Enter your address below."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`}
        strategy="afterInteractive"
        onLoad={() => setScriptState("ready")}
        onError={() => setScriptState("error")}
      />
      <Input
        id="checkout-address-search"
        ref={inputRef}
        label="Fitting address"
        type="text"
        // Google's widget owns the suggestion list; the browser's own autofill
        // would fight it, so it is off here (manual fields use address tokens).
        autoComplete="off"
        disabled={disabled || scriptState === "loading"}
        placeholder={scriptState === "loading" ? "Loading address search…" : "Start typing your address…"}
        hint="Start typing, then pick your address from the list."
        error={showErrors ? "Pick your address from the list, or enter it manually below." : undefined}
      />
      <button
        type="button"
        onClick={() => setManualFallback(true)}
        className="tap-target w-fit text-sm font-semibold text-black underline underline-offset-2"
      >
        Enter address manually instead
      </button>
    </div>
  );
}

function parsePlace(place: google.maps.places.PlaceResult): PlacesAddress | null {
  const components = place.address_components;
  const location = place.geometry?.location;
  if (!components || !location) return null;

  const find = (type: string, useShort = false): string =>
    components.find((c) => c.types.includes(type))?.[useShort ? "short_name" : "long_name"] ?? "";

  const streetNumber = find("street_number");
  const route = find("route");
  const suburb = find("locality") || find("sublocality") || find("postal_town");
  const state = find("administrative_area_level_1", true);
  const postcode = find("postal_code");

  const line1 = [streetNumber, route].filter(Boolean).join(" ").trim();
  if (!line1 || !suburb || !state || !postcode) return null;

  return {
    line1,
    line2: null,
    suburb,
    state,
    postcode,
    lat: location.lat(),
    lng: location.lng(),
    formatted: place.formatted_address ?? line1,
  };
}

/**
 * Manual entry: the fallback when no Maps key is configured, the script fails
 * to load, or the customer opts out of the picker. The suburb field suggests
 * suburbs and postcodes from the API (`GET /suburbs/search`) as the customer
 * types, which is the address help available without a Maps key. `lat`/`lng` are required by
 * `POST /api/v1/orders`'s `address` shape but have no manual-entry equivalent;
 * this fallback sends `0`/`0` rather than blocking submission, since crew
 * dispatch already has the full street address to work from (judgment call,
 * not specified by the contract, which assumes Places always supplies
 * coordinates).
 *
 * Fields carry the standard autofill tokens (`address-line1`, `address-line2`,
 * `address-level2`, `address-level1`, `postal-code`) and a numeric keypad for
 * the postcode. They are not marked `required` natively because this component
 * is also used inside the account address `<form>`, where native validation
 * would change behaviour; `aria-required` conveys the requirement instead.
 */
function ManualAddressFields({
  onSelect,
  disabled,
  notice,
  showErrors,
  hideLine2,
}: {
  onSelect: (address: PlacesAddress) => void;
  disabled?: boolean;
  notice: string;
  showErrors: boolean;
  hideLine2: boolean;
}) {
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");

  // Effect-driven commit, not a per-field `onBlur`/inline-`onChange`-then-
  // `commit()` pattern: that older approach read the closed-over field values
  // from the *current* render right after a `setState` in the same handler
  // (worst offender: the State `<select>`), so picking State *last* read a
  // stale empty `state` and silently never resolved. Watching all four fields
  // here means every run sees each field's fully-current, post-update value,
  // whichever was filled last.
  useEffect(() => {
    if (!line1.trim() || !suburb.trim() || !state || !/^\d{4}$/.test(postcode)) return;
    onSelect({
      line1: line1.trim(),
      line2: line2.trim() || null,
      suburb: suburb.trim(),
      state,
      postcode,
      lat: 0,
      lng: 0,
      formatted: `${line1}, ${suburb} ${state} ${postcode}`,
    });
    // `onSelect` intentionally excluded: callers pass a plain inline/closure
    // function that's a new reference every render; depending on it would
    // re-fire this on every unrelated parent re-render instead of only when one
    // of these four fields actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line1, suburb, state, postcode]);

  const errors = showErrors
    ? {
        line1: line1.trim() ? undefined : "Enter the street number and name, like 12 Example St.",
        suburb: suburb.trim() ? undefined : "Enter your suburb.",
        state: state ? undefined : "Choose your state.",
        postcode: /^\d{4}$/.test(postcode) ? undefined : "Enter a 4-digit postcode, like 3000.",
      }
    : { line1: undefined, suburb: undefined, state: undefined, postcode: undefined };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{notice}</p>
      <Input
        id="manual-line1"
        label="Street address"
        aria-required="true"
        autoComplete="address-line1"
        value={line1}
        disabled={disabled}
        error={errors.line1}
        onChange={(e) => setLine1(e.target.value)}
      />
      {!hideLine2 && (
        <Input
          id="manual-line2"
          label="Unit / apartment (optional)"
          autoComplete="address-line2"
          value={line2}
          disabled={disabled}
          onChange={(e) => setLine2(e.target.value)}
        />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SuburbTypeahead
          value={suburb}
          disabled={disabled}
          error={errors.suburb}
          onChange={setSuburb}
          onPick={(s) => {
            // One pick fills the suburb, state and postcode together.
            setSuburb(s.name);
            setState(s.state);
            setPostcode(s.postcode);
          }}
        />
        <Select
          id="manual-state"
          label="State"
          aria-required="true"
          autoComplete="address-level1"
          value={state}
          disabled={disabled}
          error={errors.state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="">Select</option>
          {AU_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Input
          id="manual-postcode"
          label="Postcode"
          aria-required="true"
          autoComplete="postal-code"
          value={postcode}
          disabled={disabled}
          maxLength={4}
          inputMode="numeric"
          error={errors.postcode}
          onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ""))}
        />
      </div>
    </div>
  );
}
