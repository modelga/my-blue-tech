import { expect, test } from "@playwright/test";

// Use a timestamp so each run gets a fresh user.
const uid = Date.now();
const testUser = {
  username: `e2e-register-${uid}`,
  password: "E2eRegisterPass123!",
};

test.describe("Registration flow", () => {
  test("register page renders with username/password form", async ({
    page,
  }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { name: /create an account/i }),
    ).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirm"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: /sign in/i }),
    ).toBeVisible();
  });

  test("successful registration redirects to sign-in", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirm"]', testUser.password);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/signin/);
  });

  test("password mismatch shows an error", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirm"]', "different-password");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test("duplicate username shows an error", async ({ page }) => {
    // Register the user first via the API
    await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: testUser.username,
        password: testUser.password,
      }),
    });

    await page.goto("/register");
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirm"]', testUser.password);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText(/username already taken/i)).toBeVisible();
  });
});
