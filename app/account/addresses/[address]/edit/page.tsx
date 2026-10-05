import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditSavedAddress } from "@/components/account/edit-saved-address";

export default async function EditAccountAddressPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const addressId = Number(address);
  if (!Number.isInteger(addressId) || addressId <= 0) notFound();

  return <EditSavedAddress addressId={addressId} />;
}

export const metadata: Metadata = { title: "Edit address | Tiro Mobile Tyres" };
