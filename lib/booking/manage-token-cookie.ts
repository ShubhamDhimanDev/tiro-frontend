import { cookies } from "next/headers";

/**
 * Server-side storage for guest `Booking.manage_token`s.
 *
 * Security requirement (task brief + docs/architecture/02-api-contract.md):
 * `manage_token` "is a bearer-equivalent secret: store it the exact same way
 * the existing Sanctum token is handled (httpOnly cookie, server-side only,
 * never reaches client JS)" — mirroring `lib/auth/cookies.ts`'s
 * `AUTH_TOKEN_COOKIE` handling exactly, not a second token-handling path.
 *
 * Unlike the single auth token cookie, a guest can in principle accumulate
 * more than one active guest booking across a session (Phase 3 has no
 * concept of "the current checkout" spanning multiple bookings, but nothing
 * stops a guest from starting a second booking flow) — so this stores a
 * small JSON map of `{ [bookingId]: manageToken }` in one cookie rather than
 * a single scalar value.
 */

const MANAGE_TOKEN_COOKIE = "mts_booking_manage_tokens";

/**
 * A `pending_hold` booking's `manage_token` only matters for the
 * ~15-minute hold window (reschedule doesn't extend `hold_expires_at` — see
 * `BookingController::reschedule()` — and nothing in this phase confirms a
 * hold into something longer-lived; that's Phase 4's job). 1 day is a
 * generous buffer over that, not a meaningful "how long should this last"
 * decision — cheap to shorten later, and harmless to keep slightly
 * generous since it's just an httpOnly cookie holding an opaque token.
 */
const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ONE_DAY_IN_SECONDS,
  };
}

type ManageTokenMap = Record<string, string>;

async function readMap(): Promise<ManageTokenMap> {
  const store = await cookies();
  const raw = store.get(MANAGE_TOKEN_COOKIE)?.value;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ManageTokenMap;
    }
    return {};
  } catch {
    return {};
  }
}

/** Call this once, right after a guest `POST /api/v1/bookings` response includes a `manage_token` — see `app/api/booking/route.ts`. */
export async function setBookingManageToken(bookingId: number, token: string): Promise<void> {
  const store = await cookies();
  const map = await readMap();
  map[String(bookingId)] = token;
  store.set(MANAGE_TOKEN_COOKIE, JSON.stringify(map), baseCookieOptions());
}

/** Server-only: the stored manage token for this booking id, or `null` if none is stored (never signed in as this booking's guest, wrong browser/device, or already cleared). */
export async function getBookingManageToken(bookingId: number | string): Promise<string | null> {
  const map = await readMap();
  return map[String(bookingId)] ?? null;
}

/** Call this once a booking reaches a terminal state via this app (cancelled) — nothing left to manage with the token, no reason to keep it around. */
export async function clearBookingManageToken(bookingId: number | string): Promise<void> {
  const store = await cookies();
  const map = await readMap();
  delete map[String(bookingId)];
  store.set(MANAGE_TOKEN_COOKIE, JSON.stringify(map), baseCookieOptions());
}
