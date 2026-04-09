import { expect, type Page, test } from "@playwright/test";
import { loginAsTestUser } from "../helpers/login.js";

const uid = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createCounterDoc(page: Page, docName: string, timelineId: string): Promise<void> {
  await page.goto("/documents/new");
  await page.fill('input[placeholder*="My First Document"]', docName);
  const textarea = page.locator("textarea");
  const raw = await textarea.inputValue();
  await textarea.fill(raw.replace("{{ timelineId }}", timelineId));
  await page.getByRole("button", { name: /create document/i }).click();
  await expect(page).toHaveURL("http://localhost:3000/documents");
}

async function pushIncrementEntry(page: Page, timelineId: string, request: number): Promise<void> {
  await page.goto(`/timelines/${timelineId}`);
  await page.locator("textarea").fill(JSON.stringify({ type: "Conversation/Operation Request", operation: "increment", request }, null, 2));
  await page.getByRole("button", { name: /push entry/i }).click();
}

async function waitForChangesCount(page: Page, docName: string, count: number): Promise<void> {
  await expect(async () => {
    await page.goto("/documents");
    const row = page.locator("p", { hasText: docName }).locator("xpath=..");
    await expect(row.getByText(`${count} changes`)).toBeVisible();
  }).toPass({ timeout: 60000, intervals: [1500] });
}

async function checkCounterValue(page: Page, docName: string, expected: number): Promise<void> {
  await page.goto("/documents");
  const row = page.locator("p", { hasText: docName }).locator("xpath=..");
  await row.getByRole("link", { name: "Show" }).click();
  // Detail page shows the latest state as YAML in the first <pre> block.
  // js-yaml serialises the integer as "counter: N".
  await expect(page.locator("pre").first()).toContainText(`counter:\n    value: ${expected}`);
}

// ── Test ──────────────────────────────────────────────────────────────────────

test.describe("Multi-document timeline synchronisation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });
  test("two docs sync via timeline entries; a third doc created later catches up via replay", async ({ page }) => {
    test.setTimeout(120000); // This test can take a while due to multiple async waits
    const timelineName = `E2E Multi-Sync ${uid}`;
    const doc1Name = `Counter Alpha ${uid}`;
    const doc2Name = `Counter Beta ${uid}`;
    const doc3Name = `Counter Gamma ${uid}`;

    // ── Step 1: Create a shared timeline ─────────────────────────────────
    await page.goto("/timelines/new");
    await page.fill('input[name="name"]', timelineName);
    await page.getByRole("button", { name: /create timeline/i }).click();
    await expect(page).toHaveURL("http://localhost:3000/timelines");

    const timelineCard = page.locator("p", { hasText: timelineName }).locator("xpath=..");
    const timelineId = await timelineCard.locator("span[title]").first().getAttribute("title");
    expect(timelineId).toMatch(/^[0-9a-f-]{36}$/);

    // ── Step 2: Create two counter documents subscribed to the timeline ──
    await createCounterDoc(page, doc1Name, timelineId!);
    await createCounterDoc(page, doc2Name, timelineId!);

    // ── Step 3: Wait for both to initialise (changes_count = 1) ──────────
    await waitForChangesCount(page, doc1Name, 1);
    await waitForChangesCount(page, doc2Name, 1);

    // ── Step 4: Push first increment entry ────────────────────────────────
    await pushIncrementEntry(page, timelineId!, 1);
    await expect(page.locator("span", { hasText: "#1" })).toBeVisible();

    // ── Step 5: Wait for both docs to process the entry ──────────────────
    // changes_count = 2: initialise + first entry
    await waitForChangesCount(page, doc1Name, 2);
    await waitForChangesCount(page, doc2Name, 2);

    // Verify counter reached 1 in both documents
    await checkCounterValue(page, doc1Name, 1);
    await checkCounterValue(page, doc2Name, 1);

    // ── Step 6: Push second increment entry ───────────────────────────────
    await pushIncrementEntry(page, timelineId!, 1);
    await expect(page.locator("span", { hasText: "#2" })).toBeVisible();

    // ── Step 7: Wait for both docs to process the second entry ────────────
    // changes_count = 3: initialise + two entries
    await waitForChangesCount(page, doc1Name, 3);
    await waitForChangesCount(page, doc2Name, 3);

    // Verify counter reached 2 in both documents
    await checkCounterValue(page, doc1Name, 2);
    await checkCounterValue(page, doc2Name, 2);

    // ── Step 8: Create a third document subscribed to the same timeline ───
    await createCounterDoc(page, doc3Name, timelineId!);

    // ── Step 9: Wait for doc3 to initialise AND replay both past entries ──
    // The replay-document-timelines worker schedules both existing entries
    // through process-entry-document, so the final changes_count is also 3.
    await waitForChangesCount(page, doc3Name, 3);

    // Verify doc3 counter matches the other two — it caught up via replay
    await checkCounterValue(page, doc3Name, 2);
  });
});
