"use client";

import { useState } from "react";
import { vehiclesApi } from "@/lib/vehicles/client-api";
import { disambiguationLabel, groupByYearRange, yearRangeLabel } from "@/lib/vehicles/year-groups";
import { FormField, selectClassName } from "@/components/ui/form-field";
import { hasNoFitmentData } from "@/lib/vehicles/types";
import type { ResolvedVehicle, VehicleFitments, VehicleYearOption } from "@/lib/vehicles/types";

type LoadState<T> = { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

export interface SavedVehicleFitmentResolution {
  vehicleId: number;
  vehicle: ResolvedVehicle;
  fitments: VehicleFitments;
}

/**
 * A third variant of the make/model/year cascade, alongside
 * `components/vehicles/vehicle-picker.tsx` (cascade + fitment fetch +
 * display-only) and `components/checkout/checkout-vehicle-picker.tsx`
 * (cascade + `vehicle_id` only, no fitment fetch). This one needs both: a
 * resolved `vehicle_id` *and* the fetched `fitments` object, handed back to
 * the caller unmodified so `<SavedVehicleForm>` can submit it as
 * `POST /api/v1/customer/vehicles`'s `saved_fitment` verbatim (the
 * contract's "pass through unmodified" requirement) — neither existing
 * picker exposes the fitment data it fetches to its parent, and bolting a
 * third mode onto either would blur what each one is for, same tradeoff
 * `<CheckoutVehiclePicker>`'s own doc comment already accepted for itself.
 * Reuses the same `vehiclesApi`/`year-groups.ts` helpers as both, not a
 * second implementation of the cascade logic itself.
 *
 * Calls `onResolve(null)` on every step back to an unresolved state (make/
 * model/year change, disambiguation cleared), and `onResolve(result)` once
 * a single vehicle id's fitment has loaded successfully. The zero-fitment
 * case (`fitments: {}`) resolves too — `<SavedVehicleForm>` decides whether
 * that's savable (it isn't; a customer can't save "no size"), this
 * component just reports what the endpoint actually returned.
 */
export function SavedVehicleFitmentPicker({
  onResolve,
}: {
  onResolve: (result: SavedVehicleFitmentResolution | null) => void;
}) {
  const [makes, setMakes] = useState<LoadState<string[]>>({ status: "idle" });
  const [make, setMake] = useState("");
  const [models, setModels] = useState<LoadState<string[]>>({ status: "idle" });
  const [model, setModel] = useState("");
  const [years, setYears] = useState<LoadState<VehicleYearOption[]>>({ status: "idle" });
  const [yearGroupKey, setYearGroupKey] = useState("");
  const [disambiguationValue, setDisambiguationValue] = useState("");
  const [fitmentState, setFitmentState] = useState<LoadState<SavedVehicleFitmentResolution>>({ status: "idle" });
  const [opened, setOpened] = useState(false);

  function ensureLoaded() {
    if (opened) return;
    setOpened(true);
    setMakes({ status: "loading" });
    vehiclesApi.makes().then((result) => {
      setMakes(result.kind === "success" ? { status: "ready", data: result.data.data } : { status: "error", message: result.message });
    });
  }

  function resolveVehicle(id: number) {
    setFitmentState({ status: "loading" });
    onResolve(null);
    vehiclesApi.fitment(id).then((result) => {
      if (result.kind === "success") {
        const resolution: SavedVehicleFitmentResolution = {
          vehicleId: id,
          vehicle: result.data.data.vehicle,
          fitments: result.data.data.fitments,
        };
        setFitmentState({ status: "ready", data: resolution });
        onResolve(resolution);
      } else if (result.kind === "not_found") {
        setFitmentState({ status: "error", message: "This vehicle isn't available anymore — please start over." });
      } else {
        setFitmentState({ status: "error", message: result.message });
      }
    });
  }

  function handleMakeChange(nextMake: string) {
    setMake(nextMake);
    setModel("");
    setYears({ status: "idle" });
    setYearGroupKey("");
    setDisambiguationValue("");
    setFitmentState({ status: "idle" });
    onResolve(null);
    setModels(nextMake ? { status: "loading" } : { status: "idle" });
    if (!nextMake) return;
    vehiclesApi.models(nextMake).then((result) => {
      setModels(result.kind === "success" ? { status: "ready", data: result.data.data } : { status: "error", message: result.message });
    });
  }

  function handleModelChange(nextModel: string) {
    setModel(nextModel);
    setYearGroupKey("");
    setDisambiguationValue("");
    setFitmentState({ status: "idle" });
    onResolve(null);
    setYears(nextModel ? { status: "loading" } : { status: "idle" });
    if (!nextModel) return;
    vehiclesApi.years(make, nextModel).then((result) => {
      setYears(result.kind === "success" ? { status: "ready", data: result.data.data } : { status: "error", message: result.message });
    });
  }

  const yearGroups = years.status === "ready" ? groupByYearRange(years.data) : new Map<string, VehicleYearOption[]>();

  function handleYearGroupChange(key: string) {
    setYearGroupKey(key);
    setDisambiguationValue("");
    setFitmentState({ status: "idle" });
    if (!key) {
      onResolve(null);
      return;
    }
    const group = yearGroups.get(key) ?? [];
    if (group.length === 1) resolveVehicle(group[0].id);
  }

  const selectedGroup = yearGroupKey ? (yearGroups.get(yearGroupKey) ?? []) : [];
  const needsDisambiguation = selectedGroup.length > 1;

  return (
    <div className="flex flex-col gap-3">
      {!opened ? (
        <button type="button" onClick={ensureLoaded} className="w-fit text-xs text-muted underline underline-offset-2">
          Look up my vehicle by make/model/year
        </button>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Make" htmlFor="saved-vehicle-make" error={makes.status === "error" ? makes.message : undefined}>
            <select id="saved-vehicle-make" value={make} disabled={makes.status !== "ready"} onChange={(e) => handleMakeChange(e.target.value)} className={selectClassName}>
              <option value="">Select make</option>
              {makes.status === "ready" && makes.data.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </FormField>
          <FormField label="Model" htmlFor="saved-vehicle-model" error={models.status === "error" ? models.message : undefined}>
            <select id="saved-vehicle-model" value={model} disabled={models.status !== "ready"} onChange={(e) => handleModelChange(e.target.value)} className={selectClassName}>
              <option value="">Select model</option>
              {models.status === "ready" && models.data.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </FormField>
          <FormField label="Year" htmlFor="saved-vehicle-year" error={years.status === "error" ? years.message : undefined}>
            <select id="saved-vehicle-year" value={yearGroupKey} disabled={years.status !== "ready"} onChange={(e) => handleYearGroupChange(e.target.value)} className={selectClassName}>
              <option value="">Select year</option>
              {Array.from(yearGroups.entries()).map(([key, rows]) =>
                rows.length > 0 ? (
                  <option key={key} value={key}>
                    {yearRangeLabel(rows[0])}
                  </option>
                ) : null
              )}
            </select>
          </FormField>
          {needsDisambiguation && (
            <FormField label="Series / body type" htmlFor="saved-vehicle-disambiguation">
              <select
                id="saved-vehicle-disambiguation"
                value={disambiguationValue}
                onChange={(e) => {
                  setDisambiguationValue(e.target.value);
                  if (e.target.value) resolveVehicle(Number(e.target.value));
                }}
                className={selectClassName}
              >
                <option value="">Select your exact vehicle</option>
                {selectedGroup.map((v) => (
                  <option key={v.id} value={v.id}>
                    {disambiguationLabel(v)}
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </div>
      )}

      {fitmentState.status === "loading" && (
        <div className="h-16 animate-pulse rounded-md bg-chip" aria-hidden />
      )}
      {fitmentState.status === "error" && (
        <p role="alert" className="text-xs msg-error">
          {fitmentState.message}
        </p>
      )}
      {fitmentState.status === "ready" && hasNoFitmentData(fitmentState.data.fitments) && (
        <p role="alert" className="msg-warning text-xs">
          We don&apos;t have confirmed fitment data for this vehicle yet — enter the tyre size manually below instead.
        </p>
      )}
      {fitmentState.status === "ready" && !hasNoFitmentData(fitmentState.data.fitments) && (
        <p className="text-xs text-success">
          Fitment found for {fitmentState.data.vehicle.make} {fitmentState.data.vehicle.model} — will be saved with this
          vehicle.
        </p>
      )}
    </div>
  );
}
