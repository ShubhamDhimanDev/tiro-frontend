"use client";

import { useState } from "react";
import { vehiclesApi } from "@/lib/vehicles/client-api";
import { disambiguationLabel, groupByYearRange, yearRangeLabel } from "@/lib/vehicles/year-groups";
import { FormField, selectClassName } from "@/components/ui/form-field";
import type { VehicleYearOption } from "@/lib/vehicles/types";

type LoadState<T> = { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

/**
 * A lighter-weight make/model/year cascade than `components/vehicles/vehicle-picker.tsx`
 * — resolves to a `vehicle_id` only, no fitment fetch (checkout doesn't need
 * fitment, only `POST /api/v1/orders`'s optional `vehicle.vehicle_id`). Kept
 * as a separate component rather than adding an `onResolve`/"skip fitment"
 * prop to the existing picker, since that component's whole reason for
 * being is showing the fitment result inline — bolting an unrelated mode
 * onto it would make both harder to reason about. Reuses the same
 * `vehiclesApi`/`year-groups.ts` helpers, not a second implementation of the
 * cascade logic.
 */
export function CheckoutVehiclePicker({ onResolve }: { onResolve: (vehicleId: number | null) => void }) {
  const [makes, setMakes] = useState<LoadState<string[]>>({ status: "idle" });
  const [make, setMake] = useState("");
  const [models, setModels] = useState<LoadState<string[]>>({ status: "idle" });
  const [model, setModel] = useState("");
  const [years, setYears] = useState<LoadState<VehicleYearOption[]>>({ status: "idle" });
  const [yearGroupKey, setYearGroupKey] = useState("");
  const [disambiguationValue, setDisambiguationValue] = useState("");
  const [opened, setOpened] = useState(false);

  function ensureLoaded() {
    if (opened) return;
    setOpened(true);
    setMakes({ status: "loading" });
    vehiclesApi.makes().then((result) => {
      setMakes(result.kind === "success" ? { status: "ready", data: result.data.data } : { status: "error", message: result.message });
    });
  }

  function handleMakeChange(nextMake: string) {
    setMake(nextMake);
    setModel("");
    setYears({ status: "idle" });
    setYearGroupKey("");
    setDisambiguationValue("");
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
    if (!key) {
      onResolve(null);
      return;
    }
    const group = yearGroups.get(key) ?? [];
    if (group.length === 1) onResolve(group[0].id);
  }

  const selectedGroup = yearGroupKey ? (yearGroups.get(yearGroupKey) ?? []) : [];
  const needsDisambiguation = selectedGroup.length > 1;

  return (
    <div className="flex flex-col gap-3">
      {!opened ? (
        <button type="button" onClick={ensureLoaded} className="tap-target w-fit text-sm font-semibold text-black underline underline-offset-2">
          Add your vehicle make/model/year (optional)
        </button>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Make" htmlFor="checkout-vehicle-make" error={makes.status === "error" ? makes.message : undefined}>
            <select id="checkout-vehicle-make" value={make} disabled={makes.status !== "ready"} onChange={(e) => handleMakeChange(e.target.value)} className={selectClassName}>
              <option value="">Select make</option>
              {makes.status === "ready" && makes.data.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </FormField>
          <FormField label="Model" htmlFor="checkout-vehicle-model" error={models.status === "error" ? models.message : undefined}>
            <select id="checkout-vehicle-model" value={model} disabled={models.status !== "ready"} onChange={(e) => handleModelChange(e.target.value)} className={selectClassName}>
              <option value="">Select model</option>
              {models.status === "ready" && models.data.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </FormField>
          <FormField label="Year" htmlFor="checkout-vehicle-year" error={years.status === "error" ? years.message : undefined}>
            <select id="checkout-vehicle-year" value={yearGroupKey} disabled={years.status !== "ready"} onChange={(e) => handleYearGroupChange(e.target.value)} className={selectClassName}>
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
            <FormField label="Series / body type" htmlFor="checkout-vehicle-disambiguation">
              <select
                id="checkout-vehicle-disambiguation"
                value={disambiguationValue}
                onChange={(e) => {
                  setDisambiguationValue(e.target.value);
                  onResolve(e.target.value ? Number(e.target.value) : null);
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
    </div>
  );
}
