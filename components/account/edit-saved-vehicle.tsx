"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loginHref } from "@/lib/auth/next-path";
import { useAuth } from "@/components/auth/auth-provider";
import { customerVehiclesApi } from "@/lib/customer-vehicles/client-api";
import { SavedVehicleForm } from "@/components/account/saved-vehicle-form";
import { FormNotice, primaryButtonClassName } from "@/components/ui/form-field";
import type { CustomerVehicleRecord } from "@/lib/customer-vehicles/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not_found" }
  | { status: "ready"; vehicle: CustomerVehicleRecord };

/**
 * Resolves `vehicleId` to a `CustomerVehicleRecord` before rendering
 * `<SavedVehicleForm>` in edit mode. There's no
 * `GET /api/v1/customer/vehicles/{vehicle}` single-item endpoint in the
 * contract — only `list`/`create`/`update`/`delete`/`set-default` — so this
 * fetches the (small, per-customer-bounded, unpaginated) full list and
 * finds the matching row client-side, same "no dedicated single-item
 * fetch, the list is already small enough" reasoning
 * `docs/architecture/02-api-contract.md` applies to `/vehicles/makes`-sized
 * endpoints elsewhere in this app.
 */
export function EditSavedVehicle({ vehicleId }: { vehicleId: number }) {
  const pathname = usePathname();
  const { customer, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (authLoading || !customer) return;
    let cancelled = false;

    customerVehiclesApi.list().then((result) => {
      if (cancelled) return;
      if (result.kind !== "success") {
        setState({ status: "error", message: result.message });
        return;
      }
      const vehicle = result.data.data.find((v) => v.id === vehicleId);
      setState(vehicle ? { status: "ready", vehicle } : { status: "not_found" });
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, customer, vehicleId]);

  if (authLoading) {
    return <div className="h-48 animate-pulse rounded-md bg-chip" aria-hidden />;
  }

  if (!customer) {
    return (
      <div className="flex flex-col gap-3">
        <FormNotice message="Sign in to edit your saved vehicles." />
        <Link href={loginHref(pathname)} className={`${primaryButtonClassName} block !w-fit text-center`}>
          Log in
        </Link>
      </div>
    );
  }

  if (state.status === "loading") {
    return <div className="h-48 animate-pulse rounded-md bg-chip" aria-hidden />;
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm msg-error">
        {state.message}
      </p>
    );
  }

  if (state.status === "not_found") {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-sm msg-error">
          We couldn&apos;t find that saved vehicle.
        </p>
        <Link href="/account/vehicles" className="w-fit text-sm underline underline-offset-2">
          Back to saved vehicles
        </Link>
      </div>
    );
  }

  return <SavedVehicleForm vehicle={state.vehicle} />;
}
