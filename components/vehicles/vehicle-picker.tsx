"use client";

import { useEffect, useMemo, useState } from "react";
import { vehiclesApi } from "@/lib/vehicles/client-api";
import { disambiguationLabel, groupByYearRange, yearRangeLabel } from "@/lib/vehicles/year-groups";
import { FormField, selectClassName } from "@/components/ui/form-field";
import { VehicleFitmentResult } from "@/components/vehicles/vehicle-fitment-result";
import type { VehicleFitmentData, VehicleYearOption } from "@/lib/vehicles/types";

type LoadState<T> =
  | { status: "loading" }
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

/**
 * The 4-step cascade picker (requirements §2 step 2, §3.2's vehicle-browse
 * discovery path): make -> model -> year/generation -> (series/body_type
 * disambiguation, only when more than one `Vehicle` row shares a year
 * range) -> fitment. Every step is a live client fetch through this app's
 * `/api/vehicles/*` proxy routes (`lib/vehicles/client-api.ts`) — there's
 * no server-rendered first paint to hydrate into, since each step's options
 * depend on the previous step's live user choice, unlike the SSR `/tyres`
 * search page which reads its filters from the URL up front.
 *
 * There's deliberately no separate "confirm vehicle" step, per the
 * contract ("the id the user lands on is the same id the fitment endpoint
 * takes"): resolving to a single vehicle id — either because a year group
 * has exactly one row, or because the user just picked one in the
 * disambiguation step — immediately triggers the fitment fetch.
 */
export function VehiclePicker() {
  const [makes, setMakes] = useState<LoadState<string[]>>({ status: "loading" });
  const [make, setMake] = useState("");

  const [models, setModels] = useState<LoadState<string[]>>({ status: "idle" });
  const [model, setModel] = useState("");

  const [years, setYears] = useState<LoadState<VehicleYearOption[]>>({ status: "idle" });
  const [yearGroupSelected, setYearGroupSelected] = useState("");
  const [disambiguationValue, setDisambiguationValue] = useState("");

  const [fitment, setFitment] = useState<LoadState<VehicleFitmentData>>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    vehiclesApi.makes().then((result) => {
      if (cancelled) return;
      if (result.kind === "success") {
        setMakes({ status: "ready", data: result.data.data });
      } else {
        setMakes({ status: "error", message: result.message });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleMakeChange(nextMake: string) {
    setMake(nextMake);
    setModel("");
    setModels(nextMake ? { status: "loading" } : { status: "idle" });
    setYears({ status: "idle" });
    setYearGroupSelected("");
    setDisambiguationValue("");
    setFitment({ status: "idle" });

    if (!nextMake) return;
    vehiclesApi.models(nextMake).then((result) => {
      if (result.kind === "success") {
        setModels({ status: "ready", data: result.data.data });
      } else {
        setModels({ status: "error", message: result.message });
      }
    });
  }

  function handleModelChange(nextModel: string) {
    setModel(nextModel);
    setYears(nextModel ? { status: "loading" } : { status: "idle" });
    setYearGroupSelected("");
    setDisambiguationValue("");
    setFitment({ status: "idle" });

    if (!nextModel) return;
    vehiclesApi.years(make, nextModel).then((result) => {
      if (result.kind === "success") {
        setYears({ status: "ready", data: result.data.data });
      } else {
        setYears({ status: "error", message: result.message });
      }
    });
  }

  function resolveVehicle(id: number) {
    setFitment({ status: "loading" });
    vehiclesApi.fitment(id).then((result) => {
      if (result.kind === "success") {
        setFitment({ status: "ready", data: result.data.data });
      } else if (result.kind === "not_found") {
        // Vehicle id disappeared/deactivated between listing and this
        // fetch — treat as a real error (per the contract, distinct from
        // the zero-fitment 200 case), not a silent fallthrough.
        setFitment({ status: "error", message: "This vehicle isn't available anymore — please start over." });
      } else {
        setFitment({ status: "error", message: result.message });
      }
    });
  }

  const yearGroups = useMemo<Map<string, VehicleYearOption[]>>(
    () => (years.status === "ready" ? groupByYearRange(years.data) : new Map()),
    [years]
  );
  const yearGroupKeys = useMemo(() => Array.from(yearGroups.keys()), [yearGroups]);

  function handleYearGroupChange(key: string) {
    setYearGroupSelected(key);
    setDisambiguationValue("");
    setFitment({ status: "idle" });
    if (!key) return;

    const group = yearGroups.get(key) ?? [];
    if (group.length === 1) {
      resolveVehicle(group[0].id);
    }
    // Otherwise wait for the disambiguation select below.
  }

  const selectedGroup = yearGroupSelected ? (yearGroups.get(yearGroupSelected) ?? []) : [];
  const needsDisambiguation = selectedGroup.length > 1;

  function handleDisambiguationChange(idValue: string) {
    setDisambiguationValue(idValue);
    setFitment({ status: "idle" });
    if (!idValue) return;
    resolveVehicle(Number(idValue));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField
          label="Make"
          htmlFor="vehicle-make"
          hint={makes.status === "loading" ? "Loading makes…" : undefined}
          error={makes.status === "error" ? makes.message : undefined}
        >
          <select
            id="vehicle-make"
            value={make}
            onChange={(e) => handleMakeChange(e.target.value)}
            disabled={makes.status !== "ready"}
            className={selectClassName}
          >
            <option value="">Select make</option>
            {makes.status === "ready" &&
              makes.data.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
          </select>
        </FormField>

        <FormField
          label="Model"
          htmlFor="vehicle-model"
          hint={models.status === "loading" ? "Loading models…" : undefined}
          error={
            models.status === "error"
              ? models.message
              : models.status === "ready" && models.data.length === 0
                ? `No models found for ${make}.`
                : undefined
          }
        >
          <select
            id="vehicle-model"
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={models.status !== "ready" || models.data.length === 0}
            className={selectClassName}
          >
            <option value="">Select model</option>
            {models.status === "ready" &&
              models.data.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
          </select>
        </FormField>

        <FormField
          label="Year"
          htmlFor="vehicle-year"
          hint={years.status === "loading" ? "Loading years…" : undefined}
          error={
            years.status === "error"
              ? years.message
              : years.status === "ready" && years.data.length === 0
                ? "No vehicle records found for this make and model yet."
                : undefined
          }
        >
          <select
            id="vehicle-year"
            value={yearGroupSelected}
            onChange={(e) => handleYearGroupChange(e.target.value)}
            disabled={years.status !== "ready" || years.data.length === 0}
            className={selectClassName}
          >
            <option value="">Select year</option>
            {yearGroupKeys.map((key) => {
              const rows = yearGroups.get(key) ?? [];
              return rows.length > 0 ? (
                <option key={key} value={key}>
                  {yearRangeLabel(rows[0])}
                </option>
              ) : null;
            })}
          </select>
        </FormField>

        {needsDisambiguation && (
          <FormField label="Series / body type" htmlFor="vehicle-disambiguation">
            <select
              id="vehicle-disambiguation"
              value={disambiguationValue}
              onChange={(e) => handleDisambiguationChange(e.target.value)}
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

      {fitment.status === "loading" && (
        <div className="h-32 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" aria-hidden />
      )}
      {fitment.status === "error" && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {fitment.message}
        </p>
      )}
      {fitment.status === "ready" && <VehicleFitmentResult result={fitment.data} />}
    </div>
  );
}
