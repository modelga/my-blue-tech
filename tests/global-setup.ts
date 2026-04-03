import type { FullConfig } from "@playwright/test";

const FRONTEND_URL = "http://localhost:3000";

// Credentials for the pre-seeded login test user.
export const LOGIN_TEST_USER = {
  username: "e2e-login-user",
  password: "E2eLoginPass123!",
};

export default async function globalSetup(_config: FullConfig) {
  console.log("\n[setup] Ensuring login test user exists…");
  await ensureUser(LOGIN_TEST_USER);
  console.log("[setup] Done.\n");
}

async function ensureUser(user: {
  username: string;
  password: string;
}): Promise<void> {
  const res = await fetch(`${FRONTEND_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user.username, password: user.password }),
  });

  if (res.status === 409) {
    console.log(`[setup] User "${user.username}" already exists, skipping.`);
    return;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[setup] Failed to create user (${res.status}): ${body}`);
  }

  console.log(`[setup] Created user "${user.username}".`);
}
