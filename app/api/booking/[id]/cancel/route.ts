import { NextResponse } from "next/server";
import { proxyResponse } from "@/lib/http/proxy-response";
import { bookingBackend } from "@/lib/booking/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { clearBookingManageToken, getBookingManageToken } from "@/lib/booking/manage-token-cookie";

/**
 * POST /api/booking/{id}/cancel — proxies
 * `POST /api/v1/bookings/{booking}/cancel`. Same auth precedence as the
 * reschedule route above. On a successful cancel, also clears the stored
 * guest manage token for this booking id — nothing left to manage with it,
 * no reason to keep it around in the cookie.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = await getAuthToken();
  const manageToken = token ? null : await getBookingManageToken(id);

  if (!token && !manageToken) {
    return NextResponse.json({ message: "You don't have permission to manage this booking." }, { status: 403 });
  }

  const result = await bookingBackend.cancel(id, { token, manageToken });

  if (result.status === 200) {
    await clearBookingManageToken(id);
  }

  return proxyResponse(result);
}
