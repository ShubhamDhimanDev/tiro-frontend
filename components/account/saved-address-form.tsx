"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loginHref } from "@/lib/auth/next-path";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { AddressAutocomplete } from "@/components/checkout/address-autocomplete";
import { customerAddressesApi } from "@/lib/customer-addresses/client-api";
import { resolveSuburbId, type PlacesAddress, type SuburbResolution } from "@/lib/checkout/address";
import { FormError, FormField, FormNotice, inputClassName, primaryButtonClassName, secondaryButtonClassName } from "@/components/ui/form-field";
import type { CustomerAddressRecord } from "@/lib/customer-addresses/types";

/**
 * Add/edit form for a saved address — `POST`/`PATCH /api/v1/customer/addresses`.
 * `address` present = edit mode; absent = add mode. Reuses
 * `<AddressAutocomplete>`/`resolveSuburbId()` (`lib/checkout/address.ts`)
 * unmodified — the exact same Google Places pick -> `Suburb.id` resolution
 * checkout's own `<AddressStep>` already does, not a second implementation.
 *
 * Editing doesn't re-run the Places picker by default (the address is
 * already resolved) — line1/line2/access instructions are directly
 * editable text fields pre-filled from the record; only `suburb_id`/`lat`/
 * `lng` stay fixed to the original resolution unless the customer clicks
 * "Change address" to re-pick via Places. This avoids forcing a Places
 * re-search just to fix a typo in the unit number.
 */
export function SavedAddressForm({ address }: { address?: CustomerAddressRecord }) {
  const pathname = usePathname();
  const router = useRouter();
  const { customer, loading: authLoading } = useAuth();
  const isEdit = Boolean(address);

  const [label, setLabel] = useState(address?.label ?? "");
  const [line1, setLine1] = useState(address?.line1 ?? "");
  const [line2, setLine2] = useState(address?.line2 ?? "");
  const [accessInstructions, setAccessInstructions] = useState(address?.access_instructions ?? "");

  const [changingAddress, setChangingAddress] = useState(!address);
  const [picked, setPicked] = useState<PlacesAddress | null>(null);
  const [resolution, setResolution] = useState<SuburbResolution | null>(null);
  const resolving = picked !== null && resolution === null;

  // Fixed coordinates carried over from the existing record unless a new
  // Places pick supersedes them (see the effect below).
  const [suburbId, setSuburbId] = useState<number | null>(address?.suburb.id ?? null);
  const [lat, setLat] = useState<number | null>(address?.lat ?? null);
  const [lng, setLng] = useState<number | null>(address?.lng ?? null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!picked) return;
    let cancelled = false;
    resolveSuburbId(picked).then((result) => {
      if (cancelled) return;
      setResolution(result);
      if (result.status === "resolved") {
        setSuburbId(result.suburbId);
        setLat(picked.lat);
        setLng(picked.lng);
        setLine1(picked.line1);
        setLine2(picked.line2 ?? "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [picked]);

  if (authLoading) {
    return <div className="h-48 animate-pulse rounded-md bg-chip" aria-hidden />;
  }

  if (!customer) {
    return (
      <div className="flex flex-col gap-3">
        <FormNotice message={isEdit ? "Sign in to edit your saved addresses." : "Sign in to add a saved address."} />
        <Link href={loginHref(pathname)} className={`${primaryButtonClassName} block !w-fit text-center`}>
          Log in
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!suburbId || lat == null || lng == null || !line1.trim()) {
      setError(changingAddress ? "Pick an address above first." : "Please fill in the street address.");
      return;
    }

    setSubmitting(true);
    const payload = {
      label: label.trim() || null,
      suburb_id: suburbId,
      line1: line1.trim(),
      line2: line2.trim() || null,
      lat,
      lng,
      access_instructions: accessInstructions.trim() || null,
    };
    const result = isEdit ? await customerAddressesApi.update(address!.id, payload) : await customerAddressesApi.create(payload);
    setSubmitting(false);

    if (result.kind === "success") {
      router.push("/account/addresses");
      router.refresh();
      return;
    }
    if (result.kind === "validation_error") {
      setFieldErrors(result.errors);
      setError(result.message);
      return;
    }
    setError(result.message);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-rest md:p-6">
      {error && <FormError message={error} />}

      <FormField label="Nickname (optional)" htmlFor="saved-address-label" hint='e.g. "Home" or "Work"' error={fieldErrors.label?.[0]}>
        <input id="saved-address-label" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClassName} />
      </FormField>

      {changingAddress ? (
        <>
          <AddressAutocomplete onSelect={setPicked} />
          {resolving && <p className="text-xs text-muted">Matching this address to a serviceable suburb…</p>}
          {resolution?.status === "no_match" && (
            <p role="alert" className="msg-warning text-xs">
              We couldn&apos;t match this address to a suburb in our system.
            </p>
          )}
          {resolution?.status === "ambiguous" && (
            <p role="alert" className="msg-warning text-xs">
              This suburb matches more than one record in our system — contact us to complete this instead.
            </p>
          )}
          {resolution?.status === "lookup_failed" && (
            <p role="alert" className="text-xs msg-error">
              We couldn&apos;t look up this address just now. Please try again.
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-md bg-tarmac px-3 py-2 text-sm">
          <span>
            {address!.line1}, {address!.suburb.name} {address!.suburb.state} {address!.postcode}
          </span>
          <button type="button" onClick={() => setChangingAddress(true)} className="text-xs underline underline-offset-2">
            Change address
          </button>
        </div>
      )}

      {fieldErrors.suburb_id && (
        <p role="alert" className="text-xs msg-error">
          {fieldErrors.suburb_id.join(" ")}
        </p>
      )}

      <FormField label="Street address" htmlFor="saved-address-line1" error={fieldErrors.line1?.[0]}>
        <input id="saved-address-line1" value={line1} onChange={(e) => setLine1(e.target.value)} className={inputClassName} />
      </FormField>
      <FormField label="Unit / apartment (optional)" htmlFor="saved-address-line2" error={fieldErrors.line2?.[0]}>
        <input id="saved-address-line2" value={line2} onChange={(e) => setLine2(e.target.value)} className={inputClassName} />
      </FormField>
      <FormField
        label="Access instructions (optional)"
        htmlFor="saved-address-access"
        hint="e.g. park in driveway, gate code, apartment access."
        error={fieldErrors.access_instructions?.[0]}
      >
        <input id="saved-address-access" value={accessInstructions} onChange={(e) => setAccessInstructions(e.target.value)} className={inputClassName} />
      </FormField>

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className={primaryButtonClassName}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Save address"}
        </button>
        <button type="button" onClick={() => router.push("/account/addresses")} className={secondaryButtonClassName}>
          Cancel
        </button>
      </div>
    </form>
  );
}
