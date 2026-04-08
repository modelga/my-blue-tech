import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "../helpers/login.js";

const uid = Date.now();

// Minimal Blue document without any timeline channel contracts — always passes.
const SIMPLE_DEFINITION = JSON.stringify({ name: "Test Counter", counter: 0 });

test.describe("Documents", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("documents page renders with New Document button", async ({ page }) => {
    await page.goto("/documents");

    await expect(page.getByRole("heading", { name: /blue documents/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /new document/i })).toBeVisible();
  });

  test("new document form renders with name field, payload editor and submit button", async ({ page }) => {
    await page.goto("/documents/new");

    await expect(page.getByRole("heading", { name: /new blue document/i })).toBeVisible();
    await expect(page.locator('input[placeholder*="My First Document"]')).toBeVisible();
    await expect(page.locator("textarea")).toBeVisible();
    await expect(page.getByRole("button", { name: /create document/i })).toBeVisible();
  });

  test("submitting without a name shows browser validation", async ({ page }) => {
    await page.goto("/documents/new");

    await page.getByRole("button", { name: /create document/i }).click();

    await expect(page).toHaveURL(/\/documents\/new/);
    await expect(page.locator('input[placeholder*="My First Document"]')).toBeVisible();
  });

  test("invalid JSON in payload disables the submit button", async ({ page }) => {
    await page.goto("/documents/new");

    await page.locator("textarea").fill("{ not valid json }");

    await expect(page.getByRole("button", { name: /create document/i })).toBeDisabled();
  });

  test("submitting default payload with non-existent timeline ID shows contract validation error with details", async ({ page }) => {
    await page.goto("/documents/new");

    await page.fill('input[placeholder*="My First Document"]', `E2E Doc ${uid}`);
    // Default payload contains timelineId: '{{ timelineId }}' which won't exist.
    await page.getByRole("button", { name: /create document/i }).click();

    await expect(page.getByText(/blue document contract validation error/i)).toBeVisible();
    await expect(page.locator("ul li").first()).toBeVisible();
  });

  test("creating a document with a valid payload navigates to the documents list", async ({ page }) => {
    const docName = `E2E Doc Simple ${uid}`;
    await page.goto("/documents/new");

    await page.fill('input[placeholder*="My First Document"]', docName);
    await page.locator("textarea").fill(SIMPLE_DEFINITION);
    await page.getByRole("button", { name: /create document/i }).click();

    await expect(page).toHaveURL("http://localhost:3000/documents");
  });

  test("created document appears on the documents list", async ({ page }) => {
    const docName = `E2E Doc List ${uid}`;
    await page.goto("/documents/new");

    await page.fill('input[placeholder*="My First Document"]', docName);
    await page.locator("textarea").fill(SIMPLE_DEFINITION);
    await page.getByRole("button", { name: /create document/i }).click();

    await expect(page).toHaveURL("http://localhost:3000/documents");
    await expect(page.getByText(docName)).toBeVisible();
  });

  test("created document persists after page reload", async ({ page }) => {
    const docName = `E2E Doc Persist ${uid}`;
    await page.goto("/documents/new");

    await page.fill('input[placeholder*="My First Document"]', docName);
    await page.locator("textarea").fill(SIMPLE_DEFINITION);
    await page.getByRole("button", { name: /create document/i }).click();

    await expect(page).toHaveURL("http://localhost:3000/documents");
    await page.reload();

    await expect(page.getByText(docName)).toBeVisible();
  });
});
