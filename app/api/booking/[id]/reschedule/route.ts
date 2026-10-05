import { NextResponse } from "next/server";
import { proxyResponse } from "@/lib/http/proxy-response";
import { bookingBackend } from "@/lib/booking/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { getBookingManageToken } from "@/lib/booking/manage-token-cookie";
import type { BookingRescheduleInput } from "@/lib/booking/types";

/**
 * PATCH /api/booking/{id}/reschedule — proxies
 * `PATCH /api/v1/bookings/{booking}/reschedule`. Auth mirrors
 * `BookingController::authorizeGuestOrOwner()`'s precedence exactly: the
 * Sanctum bearer token if signed in, otherwise the guest manage token
 * stored server-side by `POST /api/booking` (see
 * `lib/booking/manage-token-cookie.ts`) — never both. If neither is
 * available, short-circuits to `403` without a round trip to Laravel (the
 * upstream call would reject it the same way regardless).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as BookingRescheduleInput;

  const token = await getAuthToken();
  const manageToken = token ? null : await getBookingManageToken(id);

  if (!token && !manageToken) {
    return NextResponse.json({ message: "You don't have permission to manage this booking." }, { status: 403 });
  }

  const result = await bookingBackend.reschedule(id, body, { token, manageToken });
  return proxyResponse(result);
}
