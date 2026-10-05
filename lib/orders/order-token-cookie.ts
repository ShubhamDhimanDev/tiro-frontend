import { cookies } from "next/headers";

/**
 * Server-side storage for guest `Order.order_token`s.
 *
 * Per the task brief: "`order_token`/`order_token_issued` follow the
 * identical semantics as `manage_token`/`manage_token_issued` ... handle the
 * token exactly the way you already handle `manage_token`: httpOnly,
 * server-side proxy, never reaches client JS. Don't build a second,
 * different mechanism for this — it's a deliberate reuse of the same
 * pattern, not a new one." This file is therefore a near-verbatim copy of
 * `lib/booking/manage-token-cookie.ts`, retargeted at `Order`/`order_token` —
 * see that file for the fuller rationale (bearer-equivalent secret, same
 * handling as the Sanctum token in `lib/auth/cookies.ts`).
 *
 * A small JSON map (`{ [orderId]: orderToken }`) rather than a single scalar
 * value, same reasoning as the booking manage-token cookie: nothing stops a
 * guest from completing more than one checkout in a session (a second
 * "book another fitting" pass), and each order's token is independent.
 */

const ORDER_TOKEN_COOKIE = "mts_order_tokens";

/**
 * The token's own secret-replay window is 15 minutes server-side (see
 * docs/architecture/01-data-model.md's `Order.guest_token_hash` note), but
 * this cookie's job is different: it's the guest's *only* way to view their
 * own order-confirmation page at all (via `GET /api/v1/orders/{order}`'s
 * `X-Order-Token` check) for as long as that page might reasonably be
 * revisited — not just within the narrow replay-secret window. 1 day is a
 * generous buffer, same judgment call `manage-token-cookie.ts` documents for
 * itself, not a meaningful "how long should this last" decision — cheap to
 * shorten later.
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

type OrderTokenMap = Record<string, string>;

async function readMap(): Promise<OrderTokenMap> {
  const store = await cookies();
  const raw = store.get(ORDER_TOKEN_COOKIE)?.value;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as OrderTokenMap;
    }
    return {};
  } catch {
    return {};
  }
}

/** Call this once, right after a guest `POST /api/v1/orders` response includes an `order_token` — see `app/api/orders/route.ts`. */
export async function setOrderToken(orderId: number, token: string): Promise<void> {
  const store = await cookies();
  const map = await readMap();
  map[String(orderId)] = token;
  store.set(ORDER_TOKEN_COOKIE, JSON.stringify(map), baseCookieOptions());
}

/** Server-only: the stored order token for this order id, or `null` if none is stored (never signed in as this order's guest, wrong browser/device, or the 1-day cookie has expired). */
export async function getOrderToken(orderId: number | string): Promise<string | null> {
  const map = await readMap();
  return map[String(orderId)] ?? null;
}
