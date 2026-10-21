import { expect, test } from "@playwright/test";

// The config switches the popup off for every other spec; start this one as a genuine first-time visitor.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("first-visit location popup", () => {
  test("asks for a suburb or postcode on every home page load until a location is saved", async ({ page }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "Select fitting location" });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByLabel("Suburb or postcode")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Closing it does not silence it: the next page load asks again.
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Select fitting location" })).toBeVisible({ timeout: 10_000 });
  });

  test("does not appear on other pages", async ({ page }) => {
    await page.goto("/tyres");
    await page.waitForTimeout(2_500);
    await expect(page.getByRole("dialog", { name: "Select fitting location" })).toBeHidden();
  });
});
