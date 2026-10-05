import type { Page } from "@playwright/test";

/**
 * Seeds the frontend-only cart (`lib/cart/cart.ts` — localStorage-backed, no
 * server-side `Cart` entity at all, see that file's own doc comment) for
 * `page`'s current origin, so a spec can land straight on `/cart` with
 * contents already present instead of driving PDP "Add to cart" clicks —
 * same "fixture vs. thing under test" split `helpers/location.ts`/
 * `helpers/fixtures.ts` both already use for their own setup steps. The
 * add-to-cart UI flow itself is not this round's scope (the task brief's
 * three E2E flows are cart-page promo rendering, claim submission, and
 * claims-list rendering — none of them are "does Add to cart work").
 *
 * Must be called after `page` has already navigated to some page on the
 * target origin at least once (localStorage is origin-scoped) — call this
 * after an initial `page.goto("/")` (or any same-origin page), before
 * navigating to `/cart` itself.
 */
export async function seedCartLocalStorage(
  page: Page,
  items: Array<{ tyre_variant_id: number; quantity: number; position?: "all" | "front" | "rear"; label: string; slug: string }>
): Promise<void> {
  const state = {
    items: items.map((item) => ({ position: "all" as const, ...item })),
    addons: [] as string[],
  };

  await page.evaluate((cartState) => {
    window.localStorage.setItem("mts_cart", JSON.stringify(cartState));
  }, state);
}
