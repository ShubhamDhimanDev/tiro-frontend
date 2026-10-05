import { BOOKING_ADDONS, type BookingAddonKey, type BookingItemInput, type BookingPosition } from "@/lib/booking/types";

/**
 * Client-side, localStorage-backed cart — "what am I booking a fitting for."
 *
 * **Supersedes `lib/booking/selection.ts` (Phase 3's stopgap), deleted this
 * round** — that file's own doc comment flagged this explicitly: "Superseding
 * this with Phase 4's real cart should mean deleting this file, not
 * extending it." Phase 4's actual contract
 * (docs/architecture/02-api-contract.md's "Cart-to-checkout sequencing"
 * section) confirms **there is still no server-side `Cart` entity and none
 * is being added** — "cart contents (`tyre_variant_id` × quantity) live
 * entirely in frontend state" is the *permanent* design, not a temporary gap
 * this phase was meant to close. So this is the same kind of storage as
 * before (localStorage, not an httpOnly cookie — see the note below for
 * why), just promoted from "Phase 3's workaround" to "the actual, intended
 * Phase 4 cart," now paired with a real pricing preview
 * (`POST /api/v1/cart/calculate` mode 1, see `lib/cart/backend-client.ts`)
 * instead of being priceless.
 *
 * Not an httpOnly cookie like the service-zone/manage-token state: a cart
 * has no server round trip of its own (it's never sent anywhere until
 * `booking-slots`/`bookings` turns it into a real `Booking`), and doesn't
 * need to be readable during SSR — it's exactly the same reasoning
 * `lib/booking/selection.ts` documented for the same storage choice.
 *
 * Kept as pure, React-free logic — this codebase's established convention
 * for anything that isn't itself UI (see `lib/catalog/group-by-model.ts`,
 * `lib/vehicles/year-groups.ts`). `components/cart/cart-provider.tsx` is the
 * thin React context wrapping this.
 */

export interface CartItem {
  tyre_variant_id: number;
  quantity: number;
  position: BookingPosition;
  /** Display-only — e.g. "Bridgestone Turanza T005 205/55 R16". Never sent to `cart/calculate`/the booking endpoints, which only take `tyre_variant_id`/`quantity`(/`position`). */
  label: string;
  /** Display-only — links back to the PDP from the cart. */
  slug: string;
  /** Display-only — tyre photo URL shown in the cart. Optional: older stored carts and callers without one fall back to the placeholder. */
  image?: string;
  /**
   * Display-only hint set by catalogue cards ("from" price at add time). The cart never
   * shows it as a price: every price on cart surfaces comes from `cart/calculate`.
   */
  unit_cents?: number;
}

export interface CartState {
  items: CartItem[];
  addons: BookingAddonKey[];
  /**
   * Phase 6b: the promo code the customer typed (normalised, upper-case), sent
   * with `cart/calculate` and `POST /bookings`. It is a code, not personal
   * data, and stays in localStorage with the rest of the cart. Whether it
   * applied is decided by the server on every calculation.
   */
  promoCode?: string;
  /**
   * The customer wants the flexible-booking discount (be available any time on
   * the service day). Sent as `flexible` with `cart/calculate`; the booking
   * hold is what actually secures it.
   */
  flexible?: boolean;
}

export const EMPTY_CART: CartState = { items: [], addons: [] };

const STORAGE_KEY = "mts_cart";

type CartItemKey = Pick<CartItem, "tyre_variant_id" | "position">;

function itemKey(item: CartItemKey): string {
  return `${item.tyre_variant_id}::${item.position}`;
}

function isValidItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.tyre_variant_id === "number" &&
    typeof item.quantity === "number" &&
    item.quantity > 0 &&
    typeof item.position === "string" &&
    typeof item.label === "string" &&
    typeof item.slug === "string"
  );
}

function isValidAddon(value: unknown): value is BookingAddonKey {
  return typeof value === "string" && (BOOKING_ADDONS as readonly string[]).includes(value);
}

/** `null`-safe: returns `EMPTY_CART` server-side (no `window`) or on any malformed/missing storage. */
export function readCart(): CartState {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CART;
    const parsed = JSON.parse(raw) as Partial<CartState>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items.filter(isValidItem) : [],
      addons: Array.isArray(parsed.addons) ? parsed.addons.filter(isValidAddon) : [],
      ...(typeof parsed.promoCode === "string" && parsed.promoCode ? { promoCode: normalisePromoCode(parsed.promoCode) } : {}),
      ...(parsed.flexible === true ? { flexible: true } : {}),
    };
  } catch {
    return EMPTY_CART;
  }
}

export function writeCart(state: CartState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearCartStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Adds an item, merging quantity into an existing row with the same variant+position rather than duplicating it. */
export function addItem(state: CartState, incoming: CartItem): CartState {
  const key = itemKey(incoming);
  const existingIndex = state.items.findIndex((item) => itemKey(item) === key);
  if (existingIndex === -1) {
    return { ...state, items: [...state.items, incoming] };
  }
  const items = state.items.slice();
  items[existingIndex] = {
    ...items[existingIndex],
    quantity: items[existingIndex].quantity + incoming.quantity,
    ...(incoming.unit_cents !== undefined ? { unit_cents: incoming.unit_cents } : {}),
  };
  return { ...state, items };
}

/** A `quantity` of 0 or less removes the row entirely, same as `removeItem`. */
export function updateQuantity(state: CartState, key: CartItemKey, quantity: number): CartState {
  if (quantity <= 0) return removeItem(state, key);
  const targetKey = itemKey(key);
  return { ...state, items: state.items.map((item) => (itemKey(item) === targetKey ? { ...item, quantity } : item)) };
}

export function removeItem(state: CartState, key: CartItemKey): CartState {
  const targetKey = itemKey(key);
  return { ...state, items: state.items.filter((item) => itemKey(item) !== targetKey) };
}

/** Trim + upper-case, capped at the API's 40 characters. Empty in, empty out. */
export function normalisePromoCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 40);
}

/** Sets the promo code, or clears it when blank. */
export function setPromoCode(state: CartState, code: string | null): CartState {
  const normalised = code ? normalisePromoCode(code) : "";
  const { promoCode: _previous, ...rest } = state;
  void _previous;
  return normalised ? { ...rest, promoCode: normalised } : rest;
}

/** Turns the flexible-booking preference on or off. */
export function setFlexible(state: CartState, flexible: boolean): CartState {
  const { flexible: _previous, ...rest } = state;
  void _previous;
  return flexible ? { ...rest, flexible: true } : rest;
}

export function toggleAddon(state: CartState, addon: BookingAddonKey): CartState {
  const has = state.addons.includes(addon);
  return { ...state, addons: has ? state.addons.filter((a) => a !== addon) : [...state.addons, addon] };
}

/** Strips the display-only fields down to the exact `items[]` shape `booking-slots`/`bookings` expect. */
export function toBookingItems(state: CartState): BookingItemInput[] {
  return state.items.map(({ tyre_variant_id, quantity, position }) => ({ tyre_variant_id, quantity, position }));
}

/**
 * Strips down to `cart/calculate` mode 1's `items[]` shape —
 * `tyre_variant_id`/`quantity` only, no `position` (pricing doesn't split by
 * axle, only duration/fitment does). Rows for the same variant across
 * different positions (front/rear on a staggered set) are summed into one
 * line, matching how the backend's `PricingService` has no concept of
 * position either — sending two separate rows for the same variant id would
 * just double up on the same catalogue lookup for no reason.
 */
export function toCalculateItems(state: CartState): { tyre_variant_id: number; quantity: number }[] {
  const byVariant = new Map<number, number>();
  for (const item of state.items) {
    byVariant.set(item.tyre_variant_id, (byVariant.get(item.tyre_variant_id) ?? 0) + item.quantity);
  }
  return Array.from(byVariant.entries()).map(([tyre_variant_id, quantity]) => ({ tyre_variant_id, quantity }));
}
