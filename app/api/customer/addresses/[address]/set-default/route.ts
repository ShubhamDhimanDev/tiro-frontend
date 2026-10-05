import { NextResponse } from "next/server";
import { customerAddressesBackend } from "@/lib/customer-addresses/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { proxyResponse } from "@/lib/http/proxy-response";

/** POST /api/customer/addresses/{address}/set-default — proxies `POST /api/v1/customer/addresses/{address}/set-default`. No body. */
export async function POST(_request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to update a saved address." }, { status: 401 });
  }

  const result = await customerAddressesBackend.setDefault(token, address);
  return proxyResponse(result);
}
