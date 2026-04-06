import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "../helpers/login.js";

const uid = Date.now();
const timelineName = `E2E Entries ${uid}`;

test.describe("Timeline entries", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  /** Creates a timeline and navigates to its detail page. Returns the page URL. */
  async function createTimelineAndOpen(page: Parameters<typeof loginAsTestUser>[0]) {
    await page.goto("/timelines/new");
    await page.fill('input[name="name"]', timelineName);
    await page.getByRole("button", { name: /create timeline/i }).click();
    await page.waitForURL("http://localhost:3000/timelines");

    const card = page.locator("p", { hasText: timelineName }).locator("xpath=..");
    await card.getByRole("link", { name: /open/i }).click();
    await page.waitForURL(/\/timelines\/.+/);
  }

  test("detail page shows empty state and push form", async ({ page }) => {
    await createTimelineAndOpen(page);

    await expect(page.getByText(/no entries yet/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /push entry/i })).toBeVisible();
    await expect(page.locator("textarea")).toBeVisible();
  });

  test("pushing the default JSON entry adds it to the list", async ({ page }) => {
    await createTimelineAndOpen(page);

    // Default payload is pre-filled — just submit.
    await page.getByRole("button", { name: /push entry/i }).click();

    await expect(page.locator("span", { hasText: "#1" })).toBeVisible();
    // The entry payload should contain the operation field from the default message.
    await expect(page.locator("pre").first()).toContainText("increment");
  });

  test("pushing a second entry increments the sequence number", async ({ page }) => {
    await createTimelineAndOpen(page);

    await page.getByRole("button", { name: /push entry/i }).click();
    await expect(page.locator("span", { hasText: "#1" })).toBeVisible();

    await page.getByRole("button", { name: /push entry/i }).click();
    await expect(page.locator("span", { hasText: "#2" })).toBeVisible();
  });

  test("entries persist after page reload", async ({ page }) => {
    await createTimelineAndOpen(page);

    await page.getByRole("button", { name: /push entry/i }).click();
    await expect(page.locator("span", { hasText: "#1" })).toBeVisible();

    await page.reload();

    await expect(page.locator("span", { hasText: "#1" })).toBeVisible();
    await expect(page.locator("pre").first()).toContainText("increment");
  });

  test("invalid JSON in the payload disables the push button", async ({ page }) => {
    await createTimelineAndOpen(page);

    const textarea = page.locator("textarea");
    await textarea.fill("{ not valid json }");

    await expect(page.getByRole("button", { name: /push entry/i })).toBeDisabled();
  });
});
