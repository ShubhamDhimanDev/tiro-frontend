"use client";

import { useEffect, useState } from "react";
import { AddressAutocomplete } from "@/components/checkout/address-autocomplete";
import { Input, Select } from "@/components/ui/field";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site/config";
import { resolveSuburbId, UNRESOLVED_SUBURB_ID, type PlacesAddress, type SuburbResolution } from "@/lib/checkout/address";
import { customerAddressDisplayLabel } from "@/lib/customer-addresses/display";
import type { CustomerAddressRecord } from "@/lib/customer-addresses/types";
import type { OrderAddressInput } from "@/lib/orders/types";

/**
 * Checkout's address-capture step — Google Places Autocomplete (or its
 * manual-entry fallback, see `<AddressAutocomplete>`) plus the two fields
 * Places can't supply: unit/line2 override and fitting access instructions.
 *
 * Resolves the picked address's `suburb_id` via `resolveSuburbId()`
 * (`lib/checkout/address.ts`, backed by `GET /api/v1/suburbs`) as soon as an
 * address is picked — keyed off `picked` alone, so editing line2/access
 * instructions afterwards re-emits using the already-resolved id rather
 * than re-triggering a lookup (neither field affects suburb resolution).
 * Emits `UNRESOLVED_SUBURB_ID` (a sentinel that deliberately 422s
 * server-side) while a lookup is in flight or when it can't resolve — see
 * `SuburbResolution`'s doc comment for the three distinct non-resolved
 * cases surfaced separately below, rather than as one generic error.
 *
 * **Phase 7 addition: `savedAddresses` (optional, defaults to `[]`) —
 * frontend-only checkout prefill, per
 * docs/architecture/01-data-model.md's explicit "not built this phase"
 * note on the endpoint side: `POST /api/v1/orders`'s `address` object is
 * unchanged, there is no `saved_address_id` input mode.** When a signed-in
 * customer has saved addresses, a select above the Places picker lets them
 * pick one — doing so skips the Places/`resolveSuburbId()` round trip
 * entirely (a saved address already carries a resolved `suburb_id`/`lat`/
 * `lng` from whenever it was first saved) and prefills every field this
 * step already emits; `line2`/`access_instructions` stay locally editable
 * either way. Picking "Enter a new address" (the default, and the only
 * option when `savedAddresses` is empty) falls back to the exact
 * pre-Phase-7 Places flow unchanged.
 */
export function AddressStep({
  onChange,
  fieldErrors,
  savedAddresses = [],
  showErrors = false,
  matchError,
  onLabelChange,
  onResolvingChange,
}: {
  onChange: (address: OrderAddressInput | null) => void;
  /** Server-side 422 messages for `address.suburb_id`. */
  fieldErrors?: string[];
  savedAddresses?: CustomerAddressRecord[];
  /** Turn on per-field messages in the address fields (set once "Place order" failed with no usable address). */
  showErrors?: boolean;
  /** Client-side "address isn't matched to a suburb yet" message. */
  matchError?: string;
  /** Display label of the chosen address ("12 Example St, Richmond VIC 3121"), or null. Used for the order recap. */
  onLabelChange?: (label: string | null) => void;
  /** Called with true while the suburb lookup is in flight, so the wizard can show Next as pending. */
  onResolvingChange?: (resolving: boolean) => void;
}) {
  const [picked, setPicked] = useState<PlacesAddress | null>(null);
  const [line2, setLine2] = useState("");
  const [accessInstructions, setAccessInstructions] = useState("");
  const [resolution, setResolution] = useState<SuburbResolution | null>(null);
  const [savedChoice, setSavedChoice] = useState<"new" | number>("new");
  const selectedSaved = savedChoice !== "new" ? (savedAddresses.find((a) => a.id === savedChoice) ?? null) : null;
  // Derived, not its own state: a lookup is in flight exactly when an
  // address is picked but its resolution hasn't landed yet. Avoids calling
  // setState synchronously inside the effect below just to flip a loading
  // flag (`react-hooks/set-state-in-effect`) — only the actual async result
  // (`setResolution`, inside the `.then()` callback, not the effect body
  // itself) needs to.
  const resolving = !selectedSaved && picked !== null && resolution === null;

  function handleSelect(address: PlacesAddress) {
    setPicked(address);
    // Reset immediately (rather than leaving the previous address's
    // resolution in place) so the emit effect below falls back to
    // `UNRESOLVED_SUBURB_ID` — not the *previous* address's resolved id —
    // for the brief window before the new lookup resolves.
    setResolution(null);
  }

  function handleSavedChoiceChange(value: string) {
    if (value === "new") {
      setSavedChoice("new");
      setLine2("");
      setAccessInstructions("");
      setPicked(null);
      setResolution(null);
      return;
    }
    const id = Number(value);
    const saved = savedAddresses.find((a) => a.id === id) ?? null;
    setSavedChoice(id);
    setPicked(null);
    setResolution(null);
    setLine2(saved?.line2 ?? "");
    setAccessInstructions(saved?.access_instructions ?? "");
  }

  useEffect(() => {
    if (selectedSaved || !picked) return;
    let cancelled = false;
    resolveSuburbId(picked).then((result) => {
      if (!cancelled) setResolution(result);
    });
    return () => {
      cancelled = true;
    };
  }, [picked, selectedSaved]);

  useEffect(() => {
    if (selectedSaved) {
      onChange({
        suburb_id: selectedSaved.suburb.id,
        line1: selectedSaved.line1,
        line2: line2.trim() || selectedSaved.line2,
        lat: selectedSaved.lat,
        lng: selectedSaved.lng,
        access_instructions: accessInstructions.trim() || null,
      });
      return;
    }
    if (!picked) {
      onChange(null);
      return;
    }
    const suburbId = resolution?.status === "resolved" ? resolution.suburbId : UNRESOLVED_SUBURB_ID;
    onChange({
      suburb_id: suburbId,
      line1: picked.line1,
      line2: line2.trim() || picked.line2,
      lat: picked.lat,
      lng: picked.lng,
      access_instructions: accessInstructions.trim() || null,
    });
  }, [selectedSaved, picked, resolution, line2, accessInstructions, onChange]);

  useEffect(() => {
    onResolvingChange?.(resolving);
    return () => onResolvingChange?.(false);
  }, [resolving, onResolvingChange]);

  useEffect(() => {
    if (!onLabelChange) return;
    if (selectedSaved) {
      onLabelChange(`${selectedSaved.line1}, ${selectedSaved.suburb.name} ${selectedSaved.suburb.state} ${selectedSaved.postcode}`);
    } else if (picked) {
      onLabelChange(`${picked.line1}, ${picked.suburb} ${picked.state} ${picked.postcode}`);
    } else {
      onLabelChange(null);
    }
  }, [selectedSaved, picked, onLabelChange]);

  const showResolutionMessage = resolution !== null && resolution.status !== "resolved";
  const blockError =
    fieldErrors && fieldErrors.length > 0 ? fieldErrors.join(" ") : !showResolutionMessage && !resolving ? matchError : undefined;

  return (
    <div className="flex flex-col gap-4">
      {savedAddresses.length > 0 && (
        <Select
          id="checkout-saved-address"
          label="Use a saved address"
          value={String(savedChoice)}
          onChange={(e) => handleSavedChoiceChange(e.target.value)}
        >
          <option value="new">Enter a new address</option>
          {savedAddresses.map((a) => (
            <option key={a.id} value={a.id}>
              {customerAddressDisplayLabel(a)}
            </option>
          ))}
        </Select>
      )}

      {!selectedSaved && <AddressAutocomplete onSelect={handleSelect} showErrors={showErrors} hideLine2 />}

      {selectedSaved && (
        <p className="rounded-control bg-chip px-3 py-2 text-sm font-medium text-ink">
          {selectedSaved.line1}, {selectedSaved.suburb.name} {selectedSaved.suburb.state} {selectedSaved.postcode}
        </p>
      )}

      {picked && !selectedSaved && (
        <p className="rounded-control bg-chip px-3 py-2 text-sm font-medium text-ink">
          {picked.line1}, {picked.suburb} {picked.state} {picked.postcode}
        </p>
      )}

      <Input
        id="checkout-address-line2"
        label="Unit / apartment (optional)"
        autoComplete="address-line2"
        value={line2}
        onChange={(e) => setLine2(e.target.value)}
      />
      <Input
        id="checkout-access-instructions"
        label="Access instructions (optional)"
        autoComplete="off"
        value={accessInstructions}
        hint="e.g. park in the driveway, gate code, apartment access."
        onChange={(e) => setAccessInstructions(e.target.value)}
      />

      {resolving && (
        <p role="status" className="text-sm font-medium text-black">
          Matching this address to a suburb we serve&hellip; Next is available once this finishes.
        </p>
      )}

      {resolution?.status === "no_match" && (
        <p role="alert" data-error-focus="true" tabIndex={-1} className="rounded-control border-[3px] border-black bg-gold-soft p-3 text-sm font-bold text-black">
          We couldn&apos;t match this address to a suburb we serve. Check the suburb and postcode above, or call us on{" "}
          <a href={PHONE_HREF} className="underline underline-offset-2">
            {PHONE_DISPLAY}
          </a>{" "}
          and we&apos;ll book you in.
        </p>
      )}

      {resolution?.status === "ambiguous" && (
        <p role="alert" data-error-focus="true" tabIndex={-1} className="rounded-control border-[3px] border-black bg-gold-soft p-3 text-sm font-bold text-black">
          That suburb matches more than one place in our system, so we can&apos;t tell them apart. Call us on{" "}
          <a href={PHONE_HREF} className="underline underline-offset-2">
            {PHONE_DISPLAY}
          </a>{" "}
          and we&apos;ll finish your booking.
        </p>
      )}

      {resolution?.status === "lookup_failed" && (
        <p role="alert" data-error-focus="true" tabIndex={-1} className="rounded-control border-[3px] border-black bg-gold-soft p-3 text-sm font-bold text-black">
          We couldn&apos;t look up this address just now. Try again in a moment, or call us on{" "}
          <a href={PHONE_HREF} className="underline underline-offset-2">
            {PHONE_DISPLAY}
          </a>
          .
        </p>
      )}

      {blockError && (
        <p role="alert" data-error-focus="true" tabIndex={-1} className="rounded-control border-[3px] border-black bg-gold-soft p-3 text-sm font-bold text-black">
          {blockError}
        </p>
      )}
    </div>
  );
}
