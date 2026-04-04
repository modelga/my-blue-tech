import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type PgBoss from "pg-boss";
import type { Variables } from "../lib/types";

export function sessionsRouter(
  boss: PgBoss,
  sseClients: Map<string, Set<(data: string) => void>>,
) {
  const app = new Hono<{ Variables: Variables }>();

  // ── Document Sessions ──────────────────────────────────────────────────────
  app.post("/", async (c) => {
    // TODO: start a Document Session from a Blue Document
    const body = await c.req.json();
    const sessionId = crypto.randomUUID();
    await boss.send("initialize-session", { sessionId, ...body });
    return c.json({ sessionId }, 202);
  });

  app.get("/:id", (c) => {
    // TODO: get current Document Session state
    return c.json({ sessionId: c.req.param("id"), state: null });
  });

  app.get("/:id/history", (c) => {
    // TODO: get Document Session processing history
    return c.json({ sessionId: c.req.param("id"), history: [] });
  });

  // ── SSE: real-time session state updates ───────────────────────────────────
  app.get("/:id/stream", (c) => {
    const sessionId = c.req.param("id");

    return streamSSE(c, async (stream) => {
      // send a heartbeat immediately so the client knows it's connected
      await stream.writeSSE({ data: "", event: "connected" });

      const write = (data: string) => {
        stream.writeSSE({ data }).catch(() => {
          sseClients.get(sessionId)?.delete(write);
        });
      };

      let sessionClients = sseClients.get(sessionId);
      if (!sessionClients) {
        sessionClients = new Set();
        sseClients.set(sessionId, sessionClients);
      }
      sessionClients.add(write);

      // keep open until the client disconnects
      await new Promise<void>((resolve) => {
        c.req.raw.signal.addEventListener("abort", () => {
          sseClients.get(sessionId)?.delete(write);
          resolve();
        });
      });
    });
  });

  return app;
}
