import { Hono } from "hono";
import type { PgBoss } from "pg-boss";
import { blue } from "../lib/blue";
import type { Variables } from "../lib/types";
import type { TimelineRepository } from "../repositories/timeline.repository";

export function timelinesRouter(boss: PgBoss, timelineRepo: TimelineRepository) {
  const app = new Hono<{ Variables: Variables }>();

  // ── Timelines ──────────────────────────────────────────────────────────────

  app.get("/", async (c) => {
    const owner = c.get("userName");
    const timelines = await timelineRepo.findByOwner(owner);
    return c.json({ timelines });
  });

  app.post("/", async (c) => {
    const owner = c.get("userName");
    const body = await c.req.json<{ name: string; description?: string }>();
    const timeline = await timelineRepo.create(crypto.randomUUID(), owner, body.name, body.description ?? "");
    return c.json(timeline, 201);
  });

  app.get("/:id", async (c) => {
    const timeline = await timelineRepo.findById(c.req.param("id"));
    if (!timeline) return c.json({ error: "Not found" }, 404);
    return c.json(timeline);
  });

  app.patch("/:id", async (c) => {
    const body = await c.req.json<{ name: string; description?: string }>();
    const timeline = await timelineRepo.update(c.req.param("id"), body.name, body.description ?? "");
    if (!timeline) return c.json({ error: "Not found" }, 404);
    return c.json(timeline);
  });

  app.delete("/:id", async (c) => {
    const deleted = await timelineRepo.delete(c.req.param("id"));
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ deleted: c.req.param("id") });
  });

  // ── Timeline Entries ───────────────────────────────────────────────────────

  app.get("/:id/entries", async (c) => {
    const entries = await timelineRepo.listEntries(c.req.param("id"));
    return c.json({ timelineId: c.req.param("id"), entries });
  });

  app.post("/:id/entries", async (c) => {
    const message = await c.req.json<Record<string, unknown>>();

    try {
      blue.jsonValueToNode(message);
    } catch (err) {
      return c.json({ error: `Invalid Blue payload: ${(err as Error).message}` }, 400);
    }

    const entryId = crypto.randomUUID();
    const timelineId = c.req.param("id");

    const payload = {
      type: "MyOS/MyOS Timeline Entry",
      message,
      actor: {
        type: "MyOS/Principal Actor",
        accountId: c.get("userName"),
      },
      timeline: { timelineId },
      timestamp: Date.now(),
    };

    const entry = await timelineRepo.appendEntry(entryId, timelineId, payload);
    await boss.send("process-entry", { timelineId, entryId, payload });
    return c.json(entry, 201);
  });

  return app;
}
