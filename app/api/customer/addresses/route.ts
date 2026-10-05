import { NextResponse } from "next/server";
import { customerAddressesBackend } from "@/lib/customer-addresses/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { proxyResponse } from "@/lib/http/proxy-response";
import type { CustomerAddressCreateInput } from "@/lib/customer-addresses/types";

/**
 * GET/POST /api/customer/addresses — proxies `GET`/`POST /api/v1/customer/addresses`.
 * Same `auth:customer`-only, `401`-short-circuit posture as
 * `app/api/customer/vehicles/route.ts`.
 */
export async function GET() {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to view your saved addresses." }, { status: 401 });
  }

  const result = await customerAddressesBackend.list(token);
  return proxyResponse(result);
}

export async function POST(request: Request) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to save an address." }, { status: 401 });
  }

  const body = (await request.json()) as CustomerAddressCreateInput;
  const result = await customerAddressesBackend.create(token, body);
  return proxyResponse(result);
}
