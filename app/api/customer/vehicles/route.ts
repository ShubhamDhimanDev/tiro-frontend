import { NextResponse } from "next/server";
import { customerVehiclesBackend } from "@/lib/customer-vehicles/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { proxyResponse } from "@/lib/http/proxy-response";
import type { CustomerVehicleCreateInput } from "@/lib/customer-vehicles/types";

/**
 * GET/POST /api/customer/vehicles — proxies `GET`/`POST /api/v1/customer/vehicles`.
 *
 * Both upstream endpoints are `auth:customer`-only with no guest fallback
 * at all (docs/architecture/02-api-contract.md's "Customer account
 * endpoints" section) — same posture as `app/api/price-guarantee-claims/route.ts`.
 * Short-circuits to `401` without a round trip to Laravel when there's no
 * session cookie.
 */
export async function GET() {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to view your saved vehicles." }, { status: 401 });
  }

  const result = await customerVehiclesBackend.list(token);
  return proxyResponse(result);
}

export async function POST(request: Request) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to save a vehicle." }, { status: 401 });
  }

  const body = (await request.json()) as CustomerVehicleCreateInput;
  const result = await customerVehiclesBackend.create(token, body);
  return proxyResponse(result);
}
