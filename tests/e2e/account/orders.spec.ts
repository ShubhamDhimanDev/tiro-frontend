import { test, expect } from "@playwright/test";
import { seedActivatedCustomer, seedOrdersForCustomer, loginViaUi } from "../helpers/customer-account";

/**
 * Order/booking history (Phase 7) — `/account/orders` against the real
 * `GET /api/v1/customer/orders`. Confirms the list renders real data sorted
 * `placed_at` descending and links correctly into the pre-existing
 * `/orders/{id}` detail page (`<OrderStatusView>`) — no new detail page was
 * built this phase, by design; this only confirms nothing 404s and the
 * right order's detail actually renders.
 */

test.describe("order history", () => {
  test("empty state for a customer with no orders", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("orders-empty");
    await loginViaUi(page, email, password);

    await page.goto("/account/orders");
    await expect(page.getByText("You haven't placed any orders yet.")).toBeVisible();
  });

  test("lists real orders sorted newest-first and links correctly into the existing order-detail page", async ({ page }) => {
    const { email, password } = seedActivatedCustomer("orders-list");
    const [older, newer] = seedOrdersForCustomer(email, 2);
    await loginViaUi(page, email, password);

    await page.goto("/account/orders");

    // Scoped to the order-history list itself (`data-testid="order-history-list"`
    // on `<OrderHistoryList>`'s `<ul>`) — an unscoped `ul > li` also matches
    // `<SiteFooter>`'s nav-column `<ul>`s sitewide (~21 elements), so this
    // must not rely on a bare structural selector.
    const rows = page.getByTestId("order-history-list").getByRole("listitem");
    await expect(rows).toHaveCount(2);
    // Newest (`newer`, the later-created/`placed_at` row) sorts first.
    await expect(rows.nth(0)).toContainText(newer.orderNumber);
    await expect(rows.nth(1)).toContainText(older.orderNumber);
    await expect(rows.nth(0)).toContainText("Confirmed");
    await expect(rows.nth(0)).toContainText("Paid");
    await expect(rows.nth(0)).toContainText(/Appointment: /);

    await rows.nth(0).getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/orders/${newer.orderId}$`));
    // Reuses the existing, already-covered order-detail page for real — not
    // a 404, not a dead link, and the right order's own number is shown.
    await expect(page.getByRole("heading", { name: `Order ${newer.orderNumber}` })).toBeVisible();
  });
});
