import { test, expect } from "@playwright/test";

/**
 * Home page against the live API (Phase 7): the size finder, location
 * selection (header chip, sheet, persisted cookie), the contact enquiry form
 * and the newsletter signup. Location assertions use LocationSeeder data
 * (St Kilda 3182 -> Melbourne Metro, Ballarat is out of area), same as
 * `tests/e2e/location/serviceability.spec.ts`.
 */

test.describe("home size finder", () => {
  test("choosing a size and pressing Find tyres opens the results for that size", async ({ page }) => {
    await page.goto("/");
    const finder = page.getByTestId("hero-finder");
    await finder.getByRole("combobox", { name: /width/i }).selectOption("205");
    await finder.getByRole("combobox", { name: /profile/i }).selectOption("55");
    await finder.getByRole("combobox", { name: /rim/i }).selectOption("16");
    await finder.getByRole("button", { name: "Find tyres" }).click();

    await expect(page).toHaveURL(/\/tyres\?.*width=205/);
    await expect(page).toHaveURL(/profile=55/);
    await expect(page).toHaveURL(/rim_diameter=16/);
  });

  test("the rego tab is not offered while the feature flag is off", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-finder").getByRole("tab", { name: /rego/i })).toHaveCount(0);
  });
});

test.describe("location select", () => {
  test("a served suburb is remembered across a reload and shown in the header chip", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Set your location" }).first().click();
    await page.getByRole("textbox", { name: "Suburb or postcode" }).fill("St Kilda");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(page.getByRole("button", { name: "Fitting in Melbourne Metro" }).first()).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Fitting in Melbourne Metro" }).first()).toBeVisible();
  });

  test("the home coverage checker reports an out-of-area suburb and the notify-me enquiry is accepted", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("section[aria-labelledby='coverage-heading']");
    await section.getByLabel("Your suburb").fill("Ballarat");
    await section.getByRole("button", { name: "Check my area" }).click();
    await expect(section.getByText(/We don.t cover/)).toBeVisible();
    await section.getByRole("button", { name: "Tell me when you reach my area" }).click();
    await section.getByLabel("Your first name").fill("E2E Tester");
    await section.getByLabel("Email").fill(`e2e+${Date.now()}@example.com`);
    await section.getByRole("button", { name: "Notify me" }).click();
    await expect(section.getByText(/ENQ-[A-Z0-9]+/)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("contact enquiry", () => {
  test("shows inline errors for an empty form and does not send", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByText(/Please tell us your name/i).first()).toBeVisible();
  });

  test("a valid message is accepted by the API and shows a reference", async ({ page }) => {
    await page.goto("/contact");
    const stamp = Date.now();
    await page.getByLabel("Your name").fill("E2E Tester");
    await page.getByLabel("Email").fill(`e2e+${stamp}@example.com`);
    await page.getByRole("textbox", { name: "How can we help?" }).fill("Playwright e2e check, please ignore.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText(/ENQ-[A-Z0-9]+/)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("newsletter", () => {
  test("rejects an invalid email without calling the API", async ({ page }) => {
    let called = false;
    await page.route("**/api/newsletter", (route) => {
      called = true;
      return route.fulfill({ status: 201, json: { data: { message: "x" } } });
    });
    await page.goto("/");
    const card = page.locator("section[aria-labelledby='newsletter-heading']");
    await card.getByLabel("Email").fill("not-an-email");
    await card.getByRole("button", { name: "Subscribe" }).click();
    await expect(card.getByText("Enter a valid email address.")).toBeVisible();
    expect(called).toBe(false);
  });

  test("a valid email is subscribed through the live API", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("section[aria-labelledby='newsletter-heading']");
    await card.getByLabel("Email").fill(`e2e+${Date.now()}@example.com`);
    await card.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByTestId("newsletter-success")).toBeVisible({ timeout: 15_000 });
  });

  test("shows an error and keeps the form when the API is unavailable", async ({ page }) => {
    await page.route("**/api/newsletter", (route) => route.fulfill({ status: 503, json: { message: "down" } }));
    await page.goto("/");
    const card = page.locator("section[aria-labelledby='newsletter-heading']");
    await card.getByLabel("Email").fill("a@example.com");
    await card.getByRole("button", { name: "Subscribe" }).click();
    await expect(card.getByRole("alert")).toBeVisible();
    await expect(card.getByRole("button", { name: "Subscribe" })).toBeVisible();
  });
});

test.describe("SEO surface", () => {
  test("robots.txt and sitemap.xml are served and the sitemap omits private routes", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toMatch(/Sitemap: .*\/sitemap\.xml/);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toContain("<urlset");
    expect(xml).not.toMatch(/\/(account|cart|checkout|booking)</);
  });

  test("the home page has a canonical, Open Graph tags, Organization JSON-LD and no aggregateRating", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
    expect(ld.some((d) => d["@type"] === "Organization")).toBe(true);
    expect(JSON.stringify(ld)).not.toContain("aggregateRating");
  });
});
