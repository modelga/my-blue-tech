import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "../helpers/login.js";

const uid = Date.now();

test.describe("Document linked to a timeline", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("creates a document with a real timeline ID substituted for {{ timelineId }}", async ({ page }) => {
    const timelineName = `E2E Timeline For Doc ${uid}`;
    const docName = `E2E Linked Doc ${uid}`;

    // ── Step 1: create a timeline ───────────────────────────────────────────
    await page.goto("/timelines/new");
    await page.fill('input[name="name"]', timelineName);
    await page.getByRole("button", { name: /create timeline/i }).click();
    await expect(page).toHaveURL("http://localhost:3000/timelines");

    // ── Step 2: read the UUID from the card's ID span ───────────────────────
    const card = page.locator("p", { hasText: timelineName }).locator("xpath=..");
    const idSpan = card.locator("span[title]").first();
    const timelineId = await idSpan.getAttribute("title");
    expect(timelineId).toMatch(/^[0-9a-f-]{36}$/);

    // ── Step 3: open the new document form ──────────────────────────────────
    await page.goto("/documents/new");
    await page.fill('input[placeholder*="My First Document"]', docName);

    // ── Step 4: substitute {{ timelineId }} in the pre-filled payload ────────
    const textarea = page.locator("textarea");
    const raw = await textarea.inputValue();
    // biome-ignore lint/style/noNonNullAssertion: test assertion — timelineId is verified non-null by the expect above
    const substituted = raw.replace("{{ timelineId }}", timelineId!);
    await textarea.fill(substituted);

    // ── Step 5: submit and verify navigation ────────────────────────────────
    await page.getByRole("button", { name: /create document/i }).click();
    await expect(page).toHaveURL("http://localhost:3000/documents");

    // ── Step 6: verify the document appears in the list ─────────────────────
    await expect(page.getByText(docName)).toBeVisible();
  });
});
