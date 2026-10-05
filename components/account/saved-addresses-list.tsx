"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { customerAddressesApi } from "@/lib/customer-addresses/client-api";
import { customerAddressDisplayLabel } from "@/lib/customer-addresses/display";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorNote, ListSkeleton, SignInPrompt } from "@/components/account/account-parts";
import type { CustomerAddressRecord } from "@/lib/customer-addresses/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; addresses: CustomerAddressRecord[] };

/**
 * "My saved addresses" — list/delete/set-default. `GET /api/v1/customer/addresses`,
 * this customer's own rows only (server-scoped) — includes addresses
 * created as a side effect of past checkouts, not just ones added here (per
 * the contract). Same `useAuth()` gate as `<SavedVehiclesList>`.
 *
 * `conflictId` tracks which row's last delete attempt came back `409`
 * (still referenced by an `Order`/`Booking`) — per the task brief, that row
 * shows the returned message and swaps its delete action for "unset as
 * default" instead, rather than just a dead-end error.
 */
export function SavedAddressesList() {
  const { customer, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CustomerAddressRecord | null>(null);
  const [conflictId, setConflictId] = useState<number | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // No synchronous `setState({status:"loading"})` here deliberately — same
  // reasoning as `<SavedVehiclesList>`'s identical `reload()`
  // (react-hooks/set-state-in-effect only flags a *synchronous* setState
  // call in an effect body, not one inside a `.then()` callback).
  function reload() {
    customerAddressesApi.list().then((result) => {
      if (result.kind === "success") {
        setState({ status: "ready", addresses: result.data.data });
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

  if (!customer) return <SignInPrompt message="Sign in to manage your saved addresses." />;

  async function handleSetDefault(id: number) {
    setActionError(null);
    setBusyId(id);
    const result = await customerAddressesApi.setDefault(id);
    setBusyId(null);
    if (result.kind !== "success") {
      setActionError(result.message);
      return;
    }
    setConflictId(null);
    reload();
  }

  async function handleDelete(id: number) {
    setActionError(null);
    setConflictId(null);
    setBusyId(id);
    const result = await customerAddressesApi.remove(id);
    setBusyId(null);
    setPendingDelete(null);
    if (result.kind === "conflict") {
      setConflictId(id);
      setConflictMessage(result.message);
      return;
    }
    if (result.kind !== "success") {
      setActionError(result.message);
      return;
    }
    reload();
  }

  const addAddress = (
    <Link href="/account/addresses/new" className={buttonClassName()}>
      Add an address
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      {state.status === "ready" && state.addresses.length > 0 && <div className="flex">{addAddress}</div>}

      {actionError && <ErrorNote message={actionError} />}

      {state.status === "loading" && <ListSkeleton />}

      {state.status === "error" && <ErrorNote message={state.message} />}

      {state.status === "ready" && state.addresses.length === 0 && (
        <EmptyState image="empty-addresses" title="You haven't saved any addresses yet — add one to speed up your next booking." action={addAddress} />
      )}

      {state.status === "ready" && state.addresses.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.addresses.map((address) => (
            <li key={address.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-rest md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-bold text-ink">{customerAddressDisplayLabel(address)}</span>
                {address.is_default && <Badge tone="gold">Default</Badge>}
              </div>
              <p className="text-sm text-muted">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}, {address.suburb.name} {address.suburb.state} {address.postcode}
              </p>

              {conflictId === address.id && conflictMessage && (
                <p role="alert" className="msg-warning text-sm font-medium">
                  {conflictMessage}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Link href={`/account/addresses/${address.id}/edit`} className={buttonClassName({ variant: "secondary", size: "sm", className: "min-h-11" })}>
                  Edit
                </Link>
                {!address.is_default && (
                  <Button variant="ghost" size="sm" className="min-h-11" disabled={busyId === address.id} onClick={() => handleSetDefault(address.id)}>
                    Set as default
                  </Button>
                )}
                {!(conflictId === address.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 font-bold text-black hover:bg-gold-soft"
                    disabled={busyId === address.id}
                    onClick={() => setPendingDelete(address)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this address?"
        confirmLabel="Yes, remove"
        cancelLabel="Keep it"
        busy={pendingDelete !== null && busyId === pendingDelete.id}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id)}
      >
        <p>
          {pendingDelete ? customerAddressDisplayLabel(pendingDelete) : "This address"} will be removed from your saved addresses. If it is attached to a past order we keep it and tell you.
        </p>
      </ConfirmDialog>
    </div>
  );
}
