import type { Page } from "@playwright/test";
import { LOGIN_TEST_USER } from "../global-setup.js";

/** Signs in as the shared e2e test user and waits for the dashboard. */
export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto("/signin");
  await page.fill('input[name="username"]', LOGIN_TEST_USER.username);
  await page.fill('input[name="password"]', LOGIN_TEST_USER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("http://localhost:3000/");
}
