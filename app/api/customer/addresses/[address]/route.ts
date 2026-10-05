import { NextResponse } from "next/server";
import { customerAddressesBackend } from "@/lib/customer-addresses/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { proxyResponse } from "@/lib/http/proxy-response";
import type { CustomerAddressUpdateInput } from "@/lib/customer-addresses/types";

/**
 * PATCH/DELETE /api/customer/addresses/{address} — proxies
 * `PATCH`/`DELETE /api/v1/customer/addresses/{address}`. `DELETE` can come
 * back `409` (address still referenced by an `Order`/`Booking`) — passed
 * through unmodified, same "let the server's own validation say so"
 * posture as every other domain in this app; `<SavedAddressesList>` is what
 * turns that into the "unset as default instead" UI.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to update a saved address." }, { status: 401 });
  }

  const body = (await request.json()) as CustomerAddressUpdateInput;
  const result = await customerAddressesBackend.update(token, address, body);
  return proxyResponse(result);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ message: "You need to be signed in to remove a saved address." }, { status: 401 });
  }

  const result = await customerAddressesBackend.remove(token, address);
  return proxyResponse(result);
}
