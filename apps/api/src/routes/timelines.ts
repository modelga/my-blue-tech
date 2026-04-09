import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { PgBoss } from "pg-boss";
import { z } from "zod";
import { blue } from "../lib/blue";
import {
  AnyObjectSchema,
  CreateTimelineBodySchema,
  ErrorSchema,
  IDParamSchema,
  TimelineEntrySchema,
  TimelineSchema,
  UpdateTimelineBodySchema,
  UUIDSchema,
} from "../lib/schemas";
import type { Variables } from "../lib/types";
import type { TimelineRepository } from "../repositories/timeline.repository";

// biome-ignore lint/suspicious/noExplicitAny: generic hook used across multiple validator targets
const validationHook = (result: any, c: any) => {
  if (!result.success) {
    return c.json({ error: (result.error as readonly { message: string }[]).map((i) => i.message).join("; ") }, 400 as const);
  }
};

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
              schema: resolver(z.object({ timelines: z.array(TimelineSchema) })),
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
          // biome-ignore lint/suspicious/noExplicitAny: resolver() accepted at runtime but not in requestBody type
          "application/json": { schema: resolver(CreateTimelineBodySchema) as any },
        },
      },
      responses: {
        201: { description: "Created timeline", content: { "application/json": { schema: resolver(TimelineSchema) } } },
      },
    }),
    validator("json", CreateTimelineBodySchema, validationHook),
    async (c) => {
      const owner = c.get("userName");
      const body = c.req.valid("json");
      const timeline = await timelineRepo.create(crypto.randomUUID(), owner, body.name, body.description ?? "");
      return c.json(timeline, 201);
    },
  );

  app.get(
    "/:id",
    describeRoute({
      tags: ["Timelines"],
      summary: "Get a timeline",
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Timeline", content: { "application/json": { schema: resolver(TimelineSchema) } } },
        404: { description: "Not found", content: { "application/json": { schema: resolver(ErrorSchema) } } },
      },
    }),
    validator("param", IDParamSchema, validationHook),
    async (c) => {
      const { id } = c.req.valid("param");
      const timeline = await timelineRepo.findById(id);
      if (!timeline) return c.json({ error: "Not found" }, 404);
      return c.json(timeline);
    },
  );

  app.patch(
    "/:id",
    describeRoute({
      tags: ["Timelines"],
      summary: "Update a timeline",
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          // biome-ignore lint/suspicious/noExplicitAny: resolver() accepted at runtime but not in requestBody type
          "application/json": { schema: resolver(UpdateTimelineBodySchema) as any },
        },
      },
      responses: {
        200: { description: "Updated timeline", content: { "application/json": { schema: resolver(TimelineSchema) } } },
        404: { description: "Not found", content: { "application/json": { schema: resolver(ErrorSchema) } } },
      },
    }),
    validator("param", IDParamSchema, validationHook),
    validator("json", UpdateTimelineBodySchema, validationHook),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const timeline = await timelineRepo.update(id, body.name, body.description ?? "");
      if (!timeline) return c.json({ error: "Not found" }, 404);
      return c.json(timeline);
    },
  );

  app.delete(
    "/:id",
    describeRoute({
      tags: ["Timelines"],
      summary: "Delete a timeline",
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Deleted",
          content: {
            "application/json": {
              schema: resolver(z.object({ deleted: UUIDSchema })),
            },
          },
        },
        404: { description: "Not found", content: { "application/json": { schema: resolver(ErrorSchema) } } },
      },
    }),
    validator("param", IDParamSchema, validationHook),
    async (c) => {
      const { id } = c.req.valid("param");
      const deleted = await timelineRepo.delete(id);
      if (!deleted) return c.json({ error: "Not found" }, 404);
      return c.json({ deleted: id });
    },
  );

  // ── Timeline Entries ───────────────────────────────────────────────────────

  app.get(
    "/:id/entries",
    describeRoute({
      tags: ["Timeline Entries"],
      summary: "List entries for a timeline",
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Entries",
          content: {
            "application/json": {
              schema: resolver(z.object({ timelineId: UUIDSchema, entries: z.array(TimelineEntrySchema) })),
            },
          },
        },
      },
    }),
    validator("param", IDParamSchema, validationHook),
    async (c) => {
      const { id } = c.req.valid("param");
      const entries = await timelineRepo.listEntries(id);
      return c.json({ timelineId: id, entries });
    },
  );

  app.post(
    "/:id/entries",
    describeRoute({
      tags: ["Timeline Entries"],
      summary: "Push an entry to a timeline",
      description:
        "Appends a Blue Language message to the timeline. The API wraps it in a `MyOS/MyOS Timeline Entry` envelope and dispatches a `process-entry` job to the worker.",
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        description: "A valid Blue Language message object (the inner message, not the full envelope).",
        // biome-ignore lint/suspicious/noExplicitAny: resolver() accepted at runtime but not in requestBody type
        content: { "application/json": { schema: resolver(AnyObjectSchema) as any } },
      },
      responses: {
        201: { description: "Created entry", content: { "application/json": { schema: resolver(TimelineEntrySchema) } } },
        400: { description: "Invalid Blue payload", content: { "application/json": { schema: resolver(ErrorSchema) } } },
      },
    }),
    validator("param", IDParamSchema, validationHook),
    validator("json", AnyObjectSchema, validationHook),
    async (c) => {
      const { id: timelineId } = c.req.valid("param");
      const message = c.req.valid("json");

      try {
        blue.jsonValueToNode(message);
      } catch (err) {
        return c.json({ error: `Invalid Blue payload: ${(err as Error).message}` }, 400);
      }

      const entryId = crypto.randomUUID();

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
