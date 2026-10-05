import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditSavedVehicle } from "@/components/account/edit-saved-vehicle";

export default async function EditAccountVehiclePage({ params }: { params: Promise<{ vehicle: string }> }) {
  const { vehicle } = await params;
  const vehicleId = Number(vehicle);
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) notFound();

  return <EditSavedVehicle vehicleId={vehicleId} />;
}

export const metadata: Metadata = { title: "Edit vehicle | Tiro Mobile Tyres" };
