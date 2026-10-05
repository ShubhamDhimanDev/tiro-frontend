import { NextResponse } from "next/server";
import { customerVehiclesBackend } from "@/lib/customer-vehicles/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { proxyResponse } from "@/lib/http/proxy-response";

/** POST /api/customer/vehicles/{vehicle}/set-default — proxies `POST /api/v1/customer/vehicles/{vehicle}/set-default`. No body. */
export async function POST(_request: Request, { params }: { params: Promise<{ vehicle: string }> }) {
  const { vehicle } = await params;
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to update a saved vehicle." }, { status: 401 });
  }

  const result = await customerVehiclesBackend.setDefault(token, vehicle);
  return proxyResponse(result);
}
