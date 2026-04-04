import type { MiddlewareHandler } from "hono";
import type { Variables } from "./types";

export const authMiddleware: MiddlewareHandler<{
  Variables: Variables;
}> = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header) {
    return c.json({ error: "Authorization header missing." }, 401);
  }
  const match = header.match(/^Bearer user (.+)$/);
  if (!match) {
    return c.json(
      {
        error: "Invalid Authorization format. Expected: Bearer user <username>",
      },
      401,
    );
  }
  c.set("userName", match[1]);
  await next();
};
