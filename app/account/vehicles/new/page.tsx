import type { Metadata } from "next";
import { SavedVehicleForm } from "@/components/account/saved-vehicle-form";

export default function NewAccountVehiclePage() {
  return <SavedVehicleForm />;
}

export const metadata: Metadata = { title: "Add a vehicle | Tiro Mobile Tyres" };
