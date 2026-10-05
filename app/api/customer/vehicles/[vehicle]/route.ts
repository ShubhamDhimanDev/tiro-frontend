import { NextResponse } from "next/server";
import { customerVehiclesBackend } from "@/lib/customer-vehicles/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { proxyResponse } from "@/lib/http/proxy-response";
import type { CustomerVehicleUpdateInput } from "@/lib/customer-vehicles/types";

/**
 * PATCH/DELETE /api/customer/vehicles/{vehicle} — proxies
 * `PATCH`/`DELETE /api/v1/customer/vehicles/{vehicle}`. Same `401`
 * short-circuit as `app/api/customer/vehicles/route.ts`. A mismatched/
 * nonexistent id is a plain `404` from Laravel (ownership scoped
 * server-side to the authenticated customer, no separate `403` branch on
 * this domain — per the contract) — passed straight through, not
 * special-cased here.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ vehicle: string }> }) {
  const { vehicle } = await params;
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to update a saved vehicle." }, { status: 401 });
  }

  const body = (await request.json()) as CustomerVehicleUpdateInput;
  const result = await customerVehiclesBackend.update(token, vehicle, body);
  return proxyResponse(result);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ vehicle: string }> }) {
  const { vehicle } = await params;
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to remove a saved vehicle." }, { status: 401 });
  }

  const result = await customerVehiclesBackend.remove(token, vehicle);
  return proxyResponse(result);
}
