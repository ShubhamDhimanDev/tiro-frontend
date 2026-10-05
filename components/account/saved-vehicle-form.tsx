"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loginHref } from "@/lib/auth/next-path";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { customerVehiclesApi } from "@/lib/customer-vehicles/client-api";
import { savedFitmentSummary } from "@/lib/customer-vehicles/display";
import { SavedVehicleFitmentPicker, type SavedVehicleFitmentResolution } from "@/components/account/saved-vehicle-fitment-picker";
import { FormError, FormField, FormNotice, inputClassName, primaryButtonClassName, secondaryButtonClassName, selectClassName } from "@/components/ui/form-field";
import { AU_STATES } from "@/lib/checkout/au-states";
import { hasNoFitmentData } from "@/lib/vehicles/types";
import type { CustomerVehicleRecord, SavedFitmentInput, TypedFitmentSize } from "@/lib/customer-vehicles/types";

type ManualSizeState = { width: string; profile: string; rim_diameter: string; load_index: string; speed_rating: string };

const EMPTY_SIZE: ManualSizeState = { width: "", profile: "", rim_diameter: "", load_index: "", speed_rating: "" };

function initialManualSize(record: CustomerVehicleRecord | undefined, key: "all" | "front" | "rear"): ManualSizeState {
  if (!record || record.vehicle_id) return EMPTY_SIZE;
  const fitment = record.saved_fitment;
  if (key === "all" && "all" in fitment) {
    const s = fitment.all;
    return { width: String(s.width), profile: String(s.profile), rim_diameter: String(s.rim_diameter), load_index: s.load_index ?? "", speed_rating: s.speed_rating ?? "" };
  }
  if ((key === "front" || key === "rear") && "front" in fitment && "rear" in fitment) {
    const s = fitment[key];
    return { width: String(s.width), profile: String(s.profile), rim_diameter: String(s.rim_diameter), load_index: s.load_index ?? "", speed_rating: s.speed_rating ?? "" };
  }
  return EMPTY_SIZE;
}

function toTypedSize(size: ManualSizeState): TypedFitmentSize | null {
  const width = Number(size.width);
  const profile = Number(size.profile);
  const rimDiameter = Number(size.rim_diameter);
  if (!Number.isInteger(width) || width <= 0) return null;
  if (!Number.isInteger(profile) || profile <= 0) return null;
  if (!Number.isInteger(rimDiameter) || rimDiameter <= 0) return null;
  return {
    width,
    profile,
    rim_diameter: rimDiameter,
    ...(size.load_index.trim() ? { load_index: size.load_index.trim() } : {}),
    ...(size.speed_rating.trim() ? { speed_rating: size.speed_rating.trim() } : {}),
  };
}

function SizeFields({ label, value, onChange }: { label: string; value: ManualSizeState; onChange: (next: ManualSizeState) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-md border border-line p-3 sm:grid-cols-5">
      <span className="col-span-2 text-xs font-medium text-muted sm:col-span-5">{label}</span>
      <FormField label="Width" htmlFor={`${label}-width`}>
        <input id={`${label}-width`} inputMode="numeric" value={value.width} onChange={(e) => onChange({ ...value, width: e.target.value.replace(/\D/g, "") })} className={inputClassName} />
      </FormField>
      <FormField label="Profile" htmlFor={`${label}-profile`}>
        <input id={`${label}-profile`} inputMode="numeric" value={value.profile} onChange={(e) => onChange({ ...value, profile: e.target.value.replace(/\D/g, "") })} className={inputClassName} />
      </FormField>
      <FormField label="Rim (in)" htmlFor={`${label}-rim`}>
        <input id={`${label}-rim`} inputMode="numeric" value={value.rim_diameter} onChange={(e) => onChange({ ...value, rim_diameter: e.target.value.replace(/\D/g, "") })} className={inputClassName} />
      </FormField>
      <FormField label="Load index (optional)" htmlFor={`${label}-load`}>
        <input id={`${label}-load`} value={value.load_index} onChange={(e) => onChange({ ...value, load_index: e.target.value })} className={inputClassName} />
      </FormField>
      <FormField label="Speed rating (optional)" htmlFor={`${label}-speed`}>
        <input id={`${label}-speed`} value={value.speed_rating} onChange={(e) => onChange({ ...value, speed_rating: e.target.value })} className={inputClassName} />
      </FormField>
    </div>
  );
}

/**
 * Add/edit form for a saved vehicle — `POST`/`PATCH /api/v1/customer/vehicles`.
 * `vehicle` present = edit mode (PATCH, pre-filled); absent = add mode
 * (POST). `saved_fitment` is required by the endpoint either way, sourced
 * from one of two mutually exclusive modes (a plain radio choice, not
 * nested state machines): "Look up my vehicle" (`<SavedVehicleFitmentPicker>`,
 * resolves `vehicle_id` + passes its `fitments` through unmodified) or
 * "Enter tyre size manually" (typed `all` or `front`+`rear` integers,
 * `vehicle_id` omitted) — matching `saved_fitment`'s two documented source
 * shapes exactly (docs/architecture/02-api-contract.md's "Saved vehicles"
 * section).
 *
 * Editing an already-vehicle-linked row doesn't force re-running the
 * cascade: it shows the existing vehicle+fitment summary with a "Change
 * vehicle" button that reveals the picker only if the customer actually
 * wants to re-resolve it. Editing a manually-typed row pre-fills the size
 * inputs from the existing `saved_fitment` (customer-typed originals only —
 * see `initialManualSize()`'s own vehicle_id check).
 */
export function SavedVehicleForm({ vehicle }: { vehicle?: CustomerVehicleRecord }) {
  const pathname = usePathname();
  const router = useRouter();
  const { customer, loading: authLoading } = useAuth();
  const isEdit = Boolean(vehicle);

  const [label, setLabel] = useState(vehicle?.label ?? "");
  const [rego, setRego] = useState(vehicle?.rego ?? "");
  const [regoState, setRegoState] = useState(vehicle?.state ?? "");
  const [vin, setVin] = useState(vehicle?.vin ?? "");

  const [fitmentMode, setFitmentMode] = useState<"vehicle" | "manual">(vehicle?.vehicle_id ? "vehicle" : "manual");
  const [changingVehicle, setChangingVehicle] = useState(!vehicle?.vehicle_id);
  const [resolution, setResolution] = useState<SavedVehicleFitmentResolution | null>(null);

  const [staggered, setStaggered] = useState(() => Boolean(vehicle && !vehicle.vehicle_id && "front" in vehicle.saved_fitment));
  const [allSize, setAllSize] = useState<ManualSizeState>(() => initialManualSize(vehicle, "all"));
  const [frontSize, setFrontSize] = useState<ManualSizeState>(() => initialManualSize(vehicle, "front"));
  const [rearSize, setRearSize] = useState<ManualSizeState>(() => initialManualSize(vehicle, "rear"));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  if (authLoading) {
    return <div className="h-48 animate-pulse rounded-md bg-chip" aria-hidden />;
  }

  if (!customer) {
    return (
      <div className="flex flex-col gap-3">
        <FormNotice message={isEdit ? "Sign in to edit your saved vehicles." : "Sign in to add a saved vehicle."} />
        <Link href={loginHref(pathname)} className={`${primaryButtonClassName} block !w-fit text-center`}>
          Log in
        </Link>
      </div>
    );
  }

  const existingVehicleSummary =
    vehicle?.vehicle_id && vehicle.vehicle
      ? `${vehicle.vehicle.make} ${vehicle.vehicle.model} — ${savedFitmentSummary(vehicle.saved_fitment)}`
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    let vehicleId: number | null = null;
    let savedFitment: SavedFitmentInput | null = null;

    if (fitmentMode === "vehicle") {
      if (resolution) {
        if (hasNoFitmentData(resolution.fitments)) {
          setError("This vehicle has no confirmed fitment data — switch to \"Enter tyre size manually\" instead.");
          return;
        }
        vehicleId = resolution.vehicleId;
        savedFitment = resolution.fitments;
      } else if (vehicle?.vehicle_id && !changingVehicle) {
        vehicleId = vehicle.vehicle_id;
        // Re-submitting the existing, already-resolved `saved_fitment`
        // read-shape verbatim — `as unknown as` because `SavedFitmentRecord`
        // (read shape, nullable/optional `load_index`/`speed_rating`) and
        // `SavedFitmentInput` (write shape) don't structurally overlap
        // enough for a direct assertion, even though every value that can
        // occur here is a valid `SavedFitmentInput` at runtime.
        savedFitment = vehicle.saved_fitment as unknown as SavedFitmentInput;
      } else {
        setError("Look up your vehicle to find its fitment first, or switch to manual entry.");
        return;
      }
    } else {
      if (staggered) {
        const front = toTypedSize(frontSize);
        const rear = toTypedSize(rearSize);
        if (!front || !rear) {
          setError("Enter a valid width, profile, and rim diameter for both front and rear.");
          return;
        }
        savedFitment = { front, rear };
      } else {
        const all = toTypedSize(allSize);
        if (!all) {
          setError("Enter a valid width, profile, and rim diameter.");
          return;
        }
        savedFitment = { all };
      }
    }

    setSubmitting(true);
    const payload = {
      label: label.trim() || null,
      rego: rego.trim() || null,
      state: regoState || null,
      vin: vin.trim() || null,
      vehicle_id: vehicleId,
      saved_fitment: savedFitment,
    };
    const result = isEdit ? await customerVehiclesApi.update(vehicle!.id, payload) : await customerVehiclesApi.create(payload);
    setSubmitting(false);

    if (result.kind === "success") {
      router.push("/account/vehicles");
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

      <FormField label="Nickname (optional)" htmlFor="saved-vehicle-label" hint="e.g. Mum's Corolla" error={fieldErrors.label?.[0]}>
        <input id="saved-vehicle-label" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClassName} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Registration (rego, optional)" htmlFor="saved-vehicle-rego" error={fieldErrors.rego?.[0]}>
          <input id="saved-vehicle-rego" value={rego} maxLength={20} onChange={(e) => setRego(e.target.value)} className={inputClassName} />
        </FormField>
        <FormField label="Rego state (optional)" htmlFor="saved-vehicle-rego-state" error={fieldErrors.state?.[0]}>
          <select id="saved-vehicle-rego-state" value={regoState} onChange={(e) => setRegoState(e.target.value)} className={selectClassName}>
            <option value="">Select</option>
            {AU_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="VIN (optional)" htmlFor="saved-vehicle-vin" error={fieldErrors.vin?.[0]}>
        <input id="saved-vehicle-vin" value={vin} maxLength={17} onChange={(e) => setVin(e.target.value)} className={inputClassName} />
      </FormField>

      <fieldset className="flex flex-col gap-3 rounded-md border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Tyre size</legend>

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="fitment-mode" checked={fitmentMode === "vehicle"} onChange={() => setFitmentMode("vehicle")} />
            Look up my vehicle
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="fitment-mode" checked={fitmentMode === "manual"} onChange={() => setFitmentMode("manual")} />
            Enter tyre size manually
          </label>
        </div>

        {fitmentMode === "vehicle" && (
          <>
            {existingVehicleSummary && !changingVehicle && (
              <div className="flex items-center justify-between gap-3 rounded-md bg-tarmac px-3 py-2 text-sm">
                <span>Current: {existingVehicleSummary}</span>
                <button type="button" onClick={() => setChangingVehicle(true)} className="text-xs underline underline-offset-2">
                  Change vehicle
                </button>
              </div>
            )}
            {(changingVehicle || !existingVehicleSummary) && <SavedVehicleFitmentPicker onResolve={setResolution} />}
          </>
        )}

        {fitmentMode === "manual" && (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={staggered} onChange={(e) => setStaggered(e.target.checked)} />
              Front and rear are different sizes
            </label>
            {staggered ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <SizeFields label="Front" value={frontSize} onChange={setFrontSize} />
                <SizeFields label="Rear" value={rearSize} onChange={setRearSize} />
              </div>
            ) : (
              <SizeFields label="All four tyres" value={allSize} onChange={setAllSize} />
            )}
          </div>
        )}

        {fieldErrors.saved_fitment && (
          <p role="alert" className="text-xs msg-error">
            {fieldErrors.saved_fitment.join(" ")}
          </p>
        )}
      </fieldset>

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className={primaryButtonClassName}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Save vehicle"}
        </button>
        <button type="button" onClick={() => router.push("/account/vehicles")} className={secondaryButtonClassName}>
          Cancel
        </button>
      </div>
    </form>
  );
}
