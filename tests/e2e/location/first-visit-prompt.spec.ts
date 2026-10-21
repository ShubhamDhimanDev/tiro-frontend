import { expect, test } from "@playwright/test";

// The config pre-marks the popup as shown for every other spec; start this one as a genuine first-time visitor.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("first-visit location popup", () => {
  test("asks for a suburb or postcode on the home page, once", async ({ page }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "Select fitting location" });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByLabel("Suburb or postcode")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Shown once per browser per week: a reload does not bring it back.
    await page.reload();
    await page.waitForTimeout(2_500);
    await expect(page.getByRole("dialog", { name: "Select fitting location" })).toBeHidden();
  });

  test("does not appear on other pages", async ({ page }) => {
    await page.goto("/tyres");
    await page.waitForTimeout(2_500);
    await expect(page.getByRole("dialog", { name: "Select fitting location" })).toBeHidden();
  });
});
