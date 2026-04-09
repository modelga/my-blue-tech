import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "../helpers/login.js";

const uid = Date.now();

test.describe("Document increment via timeline entry", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("pushing an increment entry processes the document and increases changes_count", async ({ page }) => {
    const timelineName = `E2E Increment Timeline ${uid}`;
    const docName = `E2E Increment Counter ${uid}`;

    // ── Step 1: Create a timeline ───────────────────────────────────────────
    await page.goto("/timelines/new");
    await page.fill('input[name="name"]', timelineName);
    await page.getByRole("button", { name: /create timeline/i }).click();
    await expect(page).toHaveURL("http://localhost:3000/timelines");

    // ── Step 2: Read the timeline UUID from the card's title span ───────────
    const timelineCard = page.locator("p", { hasText: timelineName }).locator("xpath=..");
    const timelineId = await timelineCard.locator("span[title]").first().getAttribute("title");
    expect(timelineId).toMatch(/^[0-9a-f-]{36}$/);

    // ── Step 3: Create a document referencing the timeline ──────────────────
    await page.goto("/documents/new");
    await page.fill('input[placeholder*="My First Document"]', docName);

    // The form is pre-filled with the Counter YAML; substitute the placeholder
    const textarea = page.locator("textarea");
    const raw = await textarea.inputValue();
    // biome-ignore lint/style/noNonNullAssertion: test assertion — timelineId is verified non-null by the expect above
    const substituted = raw.replace("{{ timelineId }}", timelineId!);
    await textarea.fill(substituted);

    await page.getByRole("button", { name: /create document/i }).click();
    await expect(page).toHaveURL("http://localhost:3000/documents");

    // ── Step 4: Wait for initialization (changes_count goes to 1) ───────────
    // The worker processes `initialize-document` asynchronously.
    await expect(async () => {
      await page.goto("/documents");
      const docRow = page.locator("p", { hasText: docName }).locator("xpath=..");
      await expect(docRow.getByText("1 changes")).toBeVisible();
    }).toPass({ timeout: 20000, intervals: [1000] });

    // ── Step 5: Push a full MyOS/MyOS Timeline Entry with increment ──────────
    // The full envelope is required so the worker can match timeline.timelineId
    // to the document's ownerChannel contract.
    await page.goto(`/timelines/${timelineId}`);

    const entryEnvelope = JSON.stringify(
      {
        type: "MyOS/MyOS Timeline Entry",
        message: {
          type: "Conversation/Operation Request",
          operation: "increment",
          request: 1,
        },
        actor: {
          type: "MyOS/Principal Actor",
          accountId: "c90672d5-6fd1-4e1a-8dff-9b220e08abae",
        },
        timeline: {
          timelineId,
        },
        timestamp: Date.now(),
      },
      null,
      2,
    );

    await page.locator("textarea").fill(entryEnvelope);
    await page.getByRole("button", { name: /push entry/i }).click();

    // Confirm the entry was appended (seq #1 visible in the entry list)
    await expect(page.locator("span", { hasText: "#1" })).toBeVisible();

    // ── Step 6: Wait for entry processing (changes_count goes to 2) ──────────
    // The worker processes `process-entry` asynchronously and updates the document.
    await expect(async () => {
      await page.goto("/documents");
      const docRow = page.locator("p", { hasText: docName }).locator("xpath=..");
      await expect(docRow.getByText("2 changes")).toBeVisible();
    }).toPass({ timeout: 30000, intervals: [1000] });
  });
});
