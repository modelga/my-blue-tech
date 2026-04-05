import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "../helpers/login.js";

// Unique suffix per run so repeated runs don't collide.
const uid = Date.now();
const timelineName = `E2E Timeline ${uid}`;
const timelineDescription = "Created by automated test";

test.describe("Timelines", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("timelines page renders with New Timeline button", async ({ page }) => {
    await page.goto("/timelines");

    await expect(page.getByRole("heading", { name: /timelines/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /new timeline/i })).toBeVisible();
  });

  test("new timeline form renders with name and description fields", async ({ page }) => {
    await page.goto("/timelines/new");

    await expect(page.getByRole("heading", { name: /new timeline/i })).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /create timeline/i })).toBeVisible();
  });

  test("creating a timeline redirects to the list and shows the new entry", async ({ page }) => {
    await page.goto("/timelines/new");

    await page.fill('input[name="name"]', timelineName);
    await page.fill('textarea[name="description"]', timelineDescription);
    await page.getByRole("button", { name: /create timeline/i }).click();

    await expect(page).toHaveURL("http://localhost:3000/timelines");
    await expect(page.locator("p", { hasText: timelineName })).toBeVisible();
    await expect(page.locator("p", { hasText: timelineDescription })).toBeVisible();
  });

  test("created timeline persists after page reload", async ({ page }) => {
    await page.goto("/timelines");

    await expect(page.locator("p", { hasText: timelineName })).toBeVisible();
  });

  test.describe("Delete timeline", () => {
    const deleteName = `E2E Delete ${uid}`;

    test("delete button is visible on each timeline card", async ({ page }) => {
      // Create the timeline we'll use across this describe block.
      await page.goto("/timelines/new");
      await page.fill('input[name="name"]', deleteName);
      await page.getByRole("button", { name: /create timeline/i }).click();
      await expect(page).toHaveURL("http://localhost:3000/timelines");

      // Locate the card via the title <p> then step up to its parent div.
      const card = page.locator("p", { hasText: deleteName }).locator("xpath=..");
      await expect(card.getByRole("button", { name: /delete/i })).toBeVisible();
    });

    test("clicking delete removes the timeline from the list immediately", async ({ page }) => {
      await page.goto("/timelines");
      await expect(page.locator("p", { hasText: deleteName })).toBeVisible();

      const card = page.locator("p", { hasText: deleteName }).locator("xpath=..");
      await card.getByRole("button", { name: /delete/i }).click();

      await expect(page.locator("p", { hasText: deleteName })).not.toBeVisible();
    });

    test("deleted timeline does not reappear after page reload", async ({ page }) => {
      await page.goto("/timelines");

      await expect(page.getByText(deleteName)).not.toBeVisible();
    });
  });

  test("submitting without a name shows browser validation", async ({ page }) => {
    await page.goto("/timelines/new");

    await page.getByRole("button", { name: /create timeline/i }).click();

    // The name input is required — form should not navigate away.
    await expect(page).toHaveURL(/\/timelines\/new/);
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });
});
