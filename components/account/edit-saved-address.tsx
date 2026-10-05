"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loginHref } from "@/lib/auth/next-path";
import { useAuth } from "@/components/auth/auth-provider";
import { customerAddressesApi } from "@/lib/customer-addresses/client-api";
import { SavedAddressForm } from "@/components/account/saved-address-form";
import { FormNotice, primaryButtonClassName } from "@/components/ui/form-field";
import type { CustomerAddressRecord } from "@/lib/customer-addresses/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not_found" }
  | { status: "ready"; address: CustomerAddressRecord };

/** Same "no single-item `GET`, resolve from the list client-side" reasoning as `<EditSavedVehicle>`. */
export function EditSavedAddress({ addressId }: { addressId: number }) {
  const pathname = usePathname();
  const { customer, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (authLoading || !customer) return;
    let cancelled = false;

    customerAddressesApi.list().then((result) => {
      if (cancelled) return;
      if (result.kind !== "success") {
        setState({ status: "error", message: result.message });
        return;
      }
      const address = result.data.data.find((a) => a.id === addressId);
      setState(address ? { status: "ready", address } : { status: "not_found" });
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, customer, addressId]);

  if (authLoading) {
    return <div className="h-48 animate-pulse rounded-md bg-chip" aria-hidden />;
  }

  if (!customer) {
    return (
      <div className="flex flex-col gap-3">
        <FormNotice message="Sign in to edit your saved addresses." />
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
          We couldn&apos;t find that saved address.
        </p>
        <Link href="/account/addresses" className="w-fit text-sm underline underline-offset-2">
          Back to saved addresses
        </Link>
      </div>
    );
  }

  return <SavedAddressForm address={state.address} />;
}
