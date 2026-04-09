/**
 * Polls `fn` repeatedly until it resolves without throwing.
 * Throws the last error if the timeout is exceeded.
 */
export async function waitFor<T>(
  fn: () => Promise<T>,
  { timeout = 30_000, interval = 1_000 }: { timeout?: number; interval?: number } = {},
): Promise<T> {
  const deadline = Date.now() + timeout;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await Bun.sleep(interval);
    }
  }
  throw lastError ?? new Error("waitFor timed out");
}
