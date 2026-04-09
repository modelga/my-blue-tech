import type { BlueNode } from "@blue-labs/language";
import repository from "@blue-repository/types";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { streamSSE } from "hono/streaming";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { PgBoss } from "pg-boss";
import * as _ from "radash";
import { z } from "zod";
import { blue } from "../lib/blue";
import { CreateDocumentBodySchema, DocumentHistoryEntrySchema, DocumentSchema, ErrorSchema, IDParamSchema, UUIDSchema } from "../lib/schemas";
import type { Variables } from "../lib/types";
import type { DocumentRepository } from "../repositories/document.repository";
import type { TimelineRepository } from "../repositories/timeline.repository";

type Env = { Variables: Variables & { blueDoc: BlueNode } };

// biome-ignore lint/suspicious/noExplicitAny: generic hook used across multiple validator targets
const validationHook = (result: any, c: any) => {
  if (!result.success) {
    return c.json({ error: (result.error as readonly { message: string }[]).map((i) => i.message).join("; ") }, 400 as const);
  }
};

function validateBlueDocumentContracts(timelineRepo: TimelineRepository) {
  return createMiddleware<Env>(async (c, next) => {
    const body = await c.req.json<{ name: string; definition: Record<string, unknown> }>();

    let doc: BlueNode;
    try {
      doc = blue.jsonValueToNode(body.definition);
      if (!doc) {
        return c.json({ error: "Invalid Blue document: empty definition" }, 400);
      }
    } catch (err) {
      return c.json({ error: `Invalid Blue document: ${(err as Error).message}` }, 400);
    }

    const contracts = _.listify(doc.getContracts() ?? {}, (key, value) => ({ contract: value, key }));

    const validationResults = await _.map(
      contracts,
      _.tryit(async ({ contract, key }): Promise<false> => {
        const isTimelineChannel = contract.getType()?.getBlueId() === repository.packages.myos.aliases["MyOS/MyOS Timeline Channel"];

        if (isTimelineChannel) {
          const timelineId = contract.getProperties()?.timelineId?.getValue();
          const exists = await timelineRepo.findById(String(timelineId));

          if (!exists) {
            throw new Error(`Timeline with id="${timelineId}" not found for timeline channel contract="${key}"`);
          }
        }

        return false;
      }),
    );

    const errors = _.sift(validationResults.flat()).map((e) => e.message);
    if (errors.length > 0) {
      return c.json({ error: "Blue document contract validation error", details: errors }, 400);
    }

    c.set("blueDoc", doc);
    await next();
  });
}

export function documentsRouter(
  boss: PgBoss,
  sseClients: Map<string, Set<(data: string) => void>>,
  documentRepo: DocumentRepository,
  timelineRepo: TimelineRepository,
) {
  const app = new Hono<Env>();

  // ── Blue Documents ──────────────────────────────────────────────────────────

  app.post(
    "/",
    describeRoute({
      tags: ["Documents"],
      summary: "Create a document",
      description:
        "Accepts a Blue Language document definition. Validates all `MyOS/MyOS Timeline Channel` contracts reference existing timelines, then enqueues `initialize-document` for async processing.",
      requestBody: {
        required: true,
        content: {
          // biome-ignore lint/suspicious/noExplicitAny: resolver() accepted at runtime but not in requestBody type
          "application/json": { schema: resolver(CreateDocumentBodySchema) as any },
        },
      },
      responses: {
        202: {
          description: "Accepted — document created and initialization queued",
          content: {
            "application/json": {
              schema: resolver(z.object({ documentId: UUIDSchema })),
            },
          },
        },
        400: {
          description: "Invalid Blue document or contract validation error",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  error: z.string(),
                  details: z.array(z.string()).optional(),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("json", CreateDocumentBodySchema, validationHook),
    validateBlueDocumentContracts(timelineRepo),
    async (c) => {
      const owner = c.get("userName");
      const body = c.req.valid("json");
      const documentId = crypto.randomUUID();

      const document = await documentRepo.create(documentId, owner, body.name, body.definition);

      await boss.send("initialize-document", { documentId, ...body });
      return c.json({ documentId: document.id }, 202);
    },
  );

  app.get(
    "/",
    describeRoute({
      tags: ["Documents"],
      summary: "List documents",
      description: "Returns all documents owned by the authenticated user, including their history entry count.",
      responses: {
        200: {
          description: "List of documents",
          content: {
            "application/json": {
              schema: resolver(z.object({ documents: z.array(DocumentSchema) })),
            },
          },
        },
      },
    }),
    async (c) => {
      const owner = c.get("userName");
      const documents = await documentRepo.findByOwner(owner);
      return c.json({ documents });
    },
  );

  app.get(
    "/:id",
    describeRoute({
      tags: ["Documents"],
      summary: "Get a document",
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Document with current state", content: { "application/json": { schema: resolver(DocumentSchema) } } },
        404: { description: "Not found", content: { "application/json": { schema: resolver(ErrorSchema) } } },
      },
    }),
    validator("param", IDParamSchema, validationHook),
    async (c) => {
      const { id } = c.req.valid("param");
      const document = await documentRepo.findById(id);
      if (!document) return c.json({ error: "Not found" }, 404);
      return c.json(document);
    },
  );

  app.delete(
    "/:id",
    describeRoute({
      tags: ["Documents"],
      summary: "Delete a document",
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
      const deleted = await documentRepo.delete(id);
      if (!deleted) return c.json({ error: "Not found" }, 404);
      return c.json({ deleted: id });
    },
  );

  app.get(
    "/:id/history",
    describeRoute({
      tags: ["Documents"],
      summary: "Get document history",
      description: "Returns the full ordered change log for a document. Each entry contains the triggering event and a JSON diff.",
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Document history",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  documentId: UUIDSchema,
                  history: z.array(DocumentHistoryEntrySchema),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("param", IDParamSchema, validationHook),
    async (c) => {
      const { id } = c.req.valid("param");
      const history = await documentRepo.getHistory(id);
      return c.json({ documentId: id, history });
    },
  );

  // ── SSE: real-time document state updates ───────────────────────────────────

  app.get(
    "/:id/stream",
    describeRoute({
      tags: ["Documents"],
      summary: "Stream document updates (SSE)",
      description:
        "Opens a Server-Sent Events connection. Emits a `connected` event on open, then a data event for each state change triggered by a timeline entry. The payload is `{ documentId, seq, event }`.",
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "SSE stream",
          content: { "text/event-stream": { schema: { type: "string" } } },
        },
      },
    }),
    validator("param", IDParamSchema, validationHook),
    (c) => {
      const { id: documentId } = c.req.valid("param");

      return streamSSE(c, async (stream) => {
        await stream.writeSSE({ data: "", event: "connected" });

        const write = (data: string) => {
          stream.writeSSE({ data }).catch(() => {
            sseClients.get(documentId)?.delete(write);
          });
        };

        let documentClients = sseClients.get(documentId);
        if (!documentClients) {
          documentClients = new Set();
          sseClients.set(documentId, documentClients);
        }
        documentClients.add(write);

        await new Promise<void>((resolve) => {
          c.req.raw.signal.addEventListener("abort", () => {
            sseClients.get(documentId)?.delete(write);
            resolve();
          });
        });
      });
    },
  );

  return app;
}
