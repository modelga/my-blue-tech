import { expect, test } from "@playwright/test";
import { LOGIN_TEST_USER } from "../global-setup.js";

test.describe("Login flow", () => {
  test("sign-in page renders with username/password form", async ({ page }) => {
    await page.goto("/signin");

    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /register/i })).toBeVisible();
  });

  test("valid credentials redirect to dashboard with active session", async ({ page }) => {
    await page.goto("/signin");

    await page.fill('input[name="username"]', LOGIN_TEST_USER.username);
    await page.fill('input[name="password"]', LOGIN_TEST_USER.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByText(new RegExp(`welcome.*${LOGIN_TEST_USER.username}`, "i"))).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  test("invalid credentials show an error message", async ({ page }) => {
    await page.goto("/signin");

    await page.fill('input[name="username"]', LOGIN_TEST_USER.username);
    await page.fill('input[name="password"]', "wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/signin/);
    await expect(page.getByText(/invalid username or password/i)).toBeVisible();
  });

  test("sign-out clears the session", async ({ page }) => {
    // Login first
    await page.goto("/signin");
    await page.fill('input[name="username"]', LOGIN_TEST_USER.username);
    await page.fill('input[name="password"]', LOGIN_TEST_USER.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL("http://localhost:3000/");

    // Sign out
    await page.getByRole("button", { name: /sign out/i }).click();

    await expect(page).toHaveURL(/\/signin/);
    await expect(page.getByRole("button", { name: /sign out/i })).not.toBeVisible();
  });
});
