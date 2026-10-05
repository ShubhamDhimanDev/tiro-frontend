import { NextResponse } from "next/server";
import { proxyResponse } from "@/lib/http/proxy-response";
import { bookingBackend } from "@/lib/booking/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { getBookingManageToken } from "@/lib/booking/manage-token-cookie";

/**
 * GET /api/booking/{id} — proxies `GET /api/v1/bookings/{booking}` (added
 * 2026-09-21). Read-only, no side effects. Same auth precedence as the
 * reschedule/cancel routes: the Sanctum bearer token if signed in,
 * otherwise the guest manage token stored server-side by `POST /api/booking`
 * — never both, and never exposed to client JS (this is exactly why this
 * has to be a server-side proxy rather than a direct client-side fetch to
 * Laravel: only this Route Handler can read the httpOnly manage-token
 * cookie to attach `X-Booking-Manage-Token`).
 *
 * Short-circuits to `403` without a round trip when neither credential is
 * available, same as reschedule/cancel — note this means an unauthenticated
 * request for a genuinely nonexistent booking id gets `403` here rather
 * than the `404` Laravel's own implicit route-model binding would return
 * (it 404s before its own auth check runs); harmless in practice, since
 * without either credential this app can't render anything useful either
 * way, but flagged as a minor behavioral difference from the upstream API.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = await getAuthToken();
  const manageToken = token ? null : await getBookingManageToken(id);

  if (!token && !manageToken) {
    return NextResponse.json({ message: "You don't have permission to manage this booking." }, { status: 403 });
  }

  const result = await bookingBackend.show(id, { token, manageToken });
  return proxyResponse(result);
}
