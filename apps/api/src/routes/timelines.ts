import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import type { PgBoss } from "pg-boss";
import { blue } from "../lib/blue";
import { AnyObjectSchema, ErrorSchema, TimelineEntrySchema, TimelineSchema, UUIDSchema } from "../lib/schemas";
import type { Variables } from "../lib/types";
import type { TimelineRepository } from "../repositories/timeline.repository";

export function timelinesRouter(boss: PgBoss, timelineRepo: TimelineRepository) {
  const app = new Hono<{ Variables: Variables }>();

  // ── Timelines ──────────────────────────────────────────────────────────────

  app.get(
    "/",
    describeRoute({
      tags: ["Timelines"],
      summary: "List timelines",
      description: "Returns all timelines owned by the authenticated user.",
      responses: {
        200: {
          description: "List of timelines",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { timelines: { type: "array", items: TimelineSchema } },
              },
            },
          },
        },
      },
    }),
    async (c) => {
      const owner = c.get("userName");
      const timelines = await timelineRepo.findByOwner(owner);
      return c.json({ timelines });
    },
  );

  app.post(
    "/",
    describeRoute({
      tags: ["Timelines"],
      summary: "Create a timeline",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string" },
                description: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Created timeline", content: { "application/json": { schema: TimelineSchema } } },
      },
    }),
    async (c) => {
      const owner = c.get("userName");
      const body = await c.req.json<{ name: string; description?: string }>();
      const timeline = await timelineRepo.create(crypto.randomUUID(), owner, body.name, body.description ?? "");
      return c.json(timeline, 201);
    },
  );

  app.get(
    "/:id",
    describeRoute({
      tags: ["Timelines"],
      summary: "Get a timeline",
      parameters: [{ in: "path", name: "id", required: true, schema: UUIDSchema }],
      responses: {
        200: { description: "Timeline", content: { "application/json": { schema: TimelineSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const timeline = await timelineRepo.findById(c.req.param("id"));
      if (!timeline) return c.json({ error: "Not found" }, 404);
      return c.json(timeline);
    },
  );

  app.patch(
    "/:id",
    describeRoute({
      tags: ["Timelines"],
      summary: "Update a timeline",
      parameters: [{ in: "path", name: "id", required: true, schema: UUIDSchema }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string" },
                description: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Updated timeline", content: { "application/json": { schema: TimelineSchema } } },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const body = await c.req.json<{ name: string; description?: string }>();
      const timeline = await timelineRepo.update(c.req.param("id"), body.name, body.description ?? "");
      if (!timeline) return c.json({ error: "Not found" }, 404);
      return c.json(timeline);
    },
  );

  app.delete(
    "/:id",
    describeRoute({
      tags: ["Timelines"],
      summary: "Delete a timeline",
      parameters: [{ in: "path", name: "id", required: true, schema: UUIDSchema }],
      responses: {
        200: {
          description: "Deleted",
          content: {
            "application/json": {
              schema: { type: "object", properties: { deleted: UUIDSchema } },
            },
          },
        },
        404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
      const deleted = await timelineRepo.delete(c.req.param("id"));
      if (!deleted) return c.json({ error: "Not found" }, 404);
      return c.json({ deleted: c.req.param("id") });
    },
  );

  // ── Timeline Entries ───────────────────────────────────────────────────────

  app.get(
    "/:id/entries",
    describeRoute({
      tags: ["Timeline Entries"],
      summary: "List entries for a timeline",
      parameters: [{ in: "path", name: "id", required: true, schema: UUIDSchema }],
      responses: {
        200: {
          description: "Entries",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  timelineId: UUIDSchema,
                  entries: { type: "array", items: TimelineEntrySchema },
                },
              },
            },
          },
        },
      },
    }),
    async (c) => {
      const entries = await timelineRepo.listEntries(c.req.param("id"));
      return c.json({ timelineId: c.req.param("id"), entries });
    },
  );

  app.post(
    "/:id/entries",
    describeRoute({
      tags: ["Timeline Entries"],
      summary: "Push an entry to a timeline",
      description:
        "Appends a Blue Language message to the timeline. The API wraps it in a `MyOS/MyOS Timeline Entry` envelope and dispatches a `process-entry` job to the worker.",
      parameters: [{ in: "path", name: "id", required: true, schema: UUIDSchema }],
      requestBody: {
        required: true,
        description: "A valid Blue Language message object (the inner message, not the full envelope).",
        content: { "application/json": { schema: AnyObjectSchema } },
      },
      responses: {
        201: { description: "Created entry", content: { "application/json": { schema: TimelineEntrySchema } } },
        400: { description: "Invalid Blue payload", content: { "application/json": { schema: ErrorSchema } } },
      },
    }),
    async (c) => {
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
    },
  );

  return app;
}
