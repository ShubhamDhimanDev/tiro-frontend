import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/booking/route";
import { bookingBackend } from "@/lib/booking/backend";
import { getAuthToken } from "@/lib/auth/cookies";
import { setBookingManageToken } from "@/lib/booking/manage-token-cookie";
import type { BookingCreateInput, BookingCreateResponse } from "@/lib/booking/types";

/**
 * `POST /api/booking`'s whole job, per its own docblock, is proxying to
 * Laravel while making sure `manage_token` — a bearer-equivalent secret for
 * guest bookings — never reaches the JSON the browser actually receives.
 * These tests assert the response body genuinely lacks the key (not just
 * that it's falsy/undefined) and that the token is only ever handed to
 * `setBookingManageToken` when the backend actually issued one on this
 * response.
 */

vi.mock("@/lib/booking/backend", () => ({
  bookingBackend: { create: vi.fn() },
}));
vi.mock("@/lib/auth/cookies", () => ({
  getAuthToken: vi.fn(),
}));
vi.mock("@/lib/booking/manage-token-cookie", () => ({
  setBookingManageToken: vi.fn(),
}));

const inputBody: BookingCreateInput = {
  service_zone_id: "3",
  scheduled_date: "2026-09-25",
  slot_start: "09:00",
  items: [{ tyre_variant_id: 7, quantity: 4, position: "all" }],
  addons: [],
};

function makeRequest(idempotencyKey: string): Request {
  return new Request("http://localhost/api/booking", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey, "Content-Type": "application/json" },
    body: JSON.stringify(inputBody),
  });
}

describe("POST /api/booking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthToken).mockResolvedValue(null);
  });

  it("strips manage_token from the response and stores it via setBookingManageToken when the backend issues one", async () => {
    vi.mocked(getAuthToken).mockResolvedValue("auth-tok-1");
    const backendBody: BookingCreateResponse = {
      data: {
        id: 42,
        status: "pending_hold",
        scheduled_date: "2026-09-25",
        slot_start: "09:00",
        slot_end: "09:30",
        duration_minutes: 30,
        hold_expires_at: "2026-09-21T09:00:00+10:00",
        manage_token: "secret-manage-token",
        manage_token_issued: true,
      },
    };
    vi.mocked(bookingBackend.create).mockResolvedValue({ status: 201, body: backendBody });

    const response = await POST(makeRequest("key-1"));
    const json = await response.json();

    expect(response.status).toBe(201);
    // Genuinely absent, not merely undefined/falsy — matches the rigor
    // backend's security-agent required for the same property server-side.
    expect(Object.hasOwn(json.data, "manage_token")).toBe(false);
    expect(json.data.manage_token_issued).toBe(true);
    expect(json.data.id).toBe(42);

    expect(setBookingManageToken).toHaveBeenCalledTimes(1);
    expect(setBookingManageToken).toHaveBeenCalledWith(42, "secret-manage-token");

    // Proxy wiring: the Idempotency-Key header and the signed-in bearer
    // token both actually reach the backend call.
    expect(bookingBackend.create).toHaveBeenCalledWith(inputBody, {
      idempotencyKey: "key-1",
      token: "auth-tok-1",
    });
  });

  it("forwards manage_token_issued=true untouched and does not call setBookingManageToken when manage_token itself is absent (replay outside the cache window)", async () => {
    const backendBody = {
      data: {
        id: 43,
        status: "pending_hold",
        scheduled_date: "2026-09-25",
        slot_start: "10:00",
        slot_end: "10:30",
        duration_minutes: 30,
        hold_expires_at: null,
        manage_token_issued: true,
        // manage_token intentionally absent — the documented edge case
        // (idempotency replay outside the 15-minute cache window).
      },
    } as BookingCreateResponse;
    vi.mocked(bookingBackend.create).mockResolvedValue({ status: 201, body: backendBody });

    const response = await POST(makeRequest("key-2"));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.manage_token_issued).toBe(true);
    expect(Object.hasOwn(json.data, "manage_token")).toBe(false);
    expect(setBookingManageToken).not.toHaveBeenCalled();
  });

  it("passes a non-201 response (e.g. a 409 conflict) through unchanged without touching the manage-token cookie", async () => {
    const errorBody = {
      message: "This slot is no longer available.",
      errors: { slot_start: ["The selected slot was just taken."] },
    };
    vi.mocked(bookingBackend.create).mockResolvedValue({ status: 409, body: errorBody });

    const response = await POST(makeRequest("key-3"));
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json).toEqual(errorBody);
    expect(setBookingManageToken).not.toHaveBeenCalled();
  });
});
