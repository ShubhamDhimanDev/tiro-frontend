import type { Metadata } from "next";
import { SavedVehiclesList } from "@/components/account/saved-vehicles-list";

export default function AccountVehiclesPage() {
  return <SavedVehiclesList />;
}

export const metadata: Metadata = { title: "Saved vehicles | Tiro Mobile Tyres" };
