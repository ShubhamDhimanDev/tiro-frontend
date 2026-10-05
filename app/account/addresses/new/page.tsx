import type { Metadata } from "next";
import { SavedAddressForm } from "@/components/account/saved-address-form";

export default function NewAccountAddressPage() {
  return <SavedAddressForm />;
}

export const metadata: Metadata = { title: "Add an address | Tiro Mobile Tyres" };
