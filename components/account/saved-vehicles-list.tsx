"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { customerVehiclesApi } from "@/lib/customer-vehicles/client-api";
import { customerVehicleDisplayLabel, savedFitmentSummary } from "@/lib/customer-vehicles/display";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorNote, ListSkeleton, SignInPrompt } from "@/components/account/account-parts";
import type { CustomerVehicleRecord } from "@/lib/customer-vehicles/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; vehicles: CustomerVehicleRecord[] };

/** "My saved vehicles" — list/delete/set-default. `GET /api/v1/customer/vehicles`, this customer's own rows only (server-scoped). Same `useAuth()` gate as `<PriceGuaranteeClaimsList>` — UX only, the Route Handler's own `401` is the real boundary. */
export function SavedVehiclesList() {
  const { customer, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CustomerVehicleRecord | null>(null);

  // No synchronous `setState({status:"loading"})` here deliberately —
  // `useState`'s own initial value already covers the mount-effect call
  // below (react-hooks/set-state-in-effect flags a *synchronous* setState
  // call in an effect body; this only ever calls one from inside the
  // `.then()` callback, an async boundary the rule doesn't flag). Called
  // again after a mutation (set-default/delete) from a click handler,
  // where a synchronous reset isn't needed either — the list just quietly
  // refreshes once the new data lands, no loading flash.
  function reload() {
    customerVehiclesApi.list().then((result) => {
      if (result.kind === "success") {
        setState({ status: "ready", vehicles: result.data.data });
        return;
      }
      setState({ status: "error", message: result.message });
    });
  }

  useEffect(() => {
    if (authLoading || !customer) return;
    reload();
  }, [authLoading, customer]);

  if (authLoading) return <ListSkeleton />;

  if (!customer) return <SignInPrompt message="Sign in to manage your saved vehicles." />;

  async function handleSetDefault(id: number) {
    setActionError(null);
    setBusyId(id);
    const result = await customerVehiclesApi.setDefault(id);
    setBusyId(null);
    if (result.kind !== "success") {
      setActionError(result.message);
      return;
    }
    reload();
  }

  async function handleDelete(id: number) {
    setActionError(null);
    setBusyId(id);
    const result = await customerVehiclesApi.remove(id);
    setBusyId(null);
    setPendingDelete(null);
    if (result.kind !== "success") {
      setActionError(result.message);
      return;
    }
    reload();
  }

  const addVehicle = (
    <Link href="/account/vehicles/new" className={buttonClassName()}>
      Add a vehicle
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      {state.status === "ready" && state.vehicles.length > 0 && <div className="flex">{addVehicle}</div>}

      {actionError && <ErrorNote message={actionError} />}

      {state.status === "loading" && <ListSkeleton />}

      {state.status === "error" && <ErrorNote message={state.message} />}

      {state.status === "ready" && state.vehicles.length === 0 && (
        <EmptyState image="empty-vehicles" title="You haven't saved any vehicles yet — add one to speed up your next booking." action={addVehicle} />
      )}

      {state.status === "ready" && state.vehicles.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.vehicles.map((vehicle) => (
            <li key={vehicle.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-rest md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-bold text-ink">{customerVehicleDisplayLabel(vehicle)}</span>
                {vehicle.is_default && <Badge tone="gold">Default</Badge>}
              </div>
              <div className="flex flex-col gap-0.5 text-sm text-muted">
                <p>{savedFitmentSummary(vehicle.saved_fitment)}</p>
                {(vehicle.rego || vehicle.state) && <p>{[vehicle.rego, vehicle.state].filter(Boolean).join(" · ")}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/account/vehicles/${vehicle.id}/edit`} className={buttonClassName({ variant: "secondary", size: "sm", className: "min-h-11" })}>
                  Edit
                </Link>
                {!vehicle.is_default && (
                  <Button variant="ghost" size="sm" className="min-h-11" disabled={busyId === vehicle.id} onClick={() => handleSetDefault(vehicle.id)}>
                    Set as default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11 font-bold text-black hover:bg-gold-soft"
                  disabled={busyId === vehicle.id}
                  onClick={() => setPendingDelete(vehicle)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this vehicle?"
        confirmLabel="Yes, remove"
        cancelLabel="Keep it"
        busy={pendingDelete !== null && busyId === pendingDelete.id}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id)}
      >
        <p>
          {pendingDelete ? customerVehicleDisplayLabel(pendingDelete) : "This vehicle"} will be removed from your saved vehicles. You can add it again any time.
        </p>
      </ConfirmDialog>
    </div>
  );
}
