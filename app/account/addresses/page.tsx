import type { Metadata } from "next";
import { SavedAddressesList } from "@/components/account/saved-addresses-list";

export default function AccountAddressesPage() {
  return <SavedAddressesList />;
}

export const metadata: Metadata = { title: "Saved addresses | Tiro Mobile Tyres" };
