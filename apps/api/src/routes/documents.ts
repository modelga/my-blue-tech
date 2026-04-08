import type { BlueNode } from "@blue-labs/language";
import repository from "@blue-repository/types";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type PgBoss from "pg-boss";
import * as _ from "radash";
import { blue } from "../lib/blue";
import type { Variables } from "../lib/types";
import type { DocumentRepository } from "../repositories/document.repository";
import type { TimelineRepository } from "../repositories/timeline.repository";
export function documentsRouter(
  boss: PgBoss,
  sseClients: Map<string, Set<(data: string) => void>>,
  documentRepo: DocumentRepository,
  timelineRepo: TimelineRepository,
) {
  const app = new Hono<{ Variables: Variables }>();

  // ── Blue Documents ──────────────────────────────────────────────────────────

  app.post("/", async (c) => {
    const owner = c.get("userName");
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

    const errors = _.sift(validationResults.flat());

    if (errors.length > 0) {
      return c.json({ error: "Blue document contract validation error", details: errors }, 400);
    }
    const documentId = crypto.randomUUID();

    const document = await documentRepo.create(documentId, owner, body.name, body.definition);

    await boss.send("initialize-document", { documentId, ...body });
    return c.json({ documentId: document.id }, 202);
  });

  app.get("/", async (c) => {
    const owner = c.get("userName");
    const documents = await documentRepo.findByOwner(owner);
    return c.json({ documents });
  });

  app.get("/:id", async (c) => {
    const document = await documentRepo.findById(c.req.param("id"));
    if (!document) return c.json({ error: "Not found" }, 404);
    return c.json(document);
  });

  app.delete("/:id", async (c) => {
    const deleted = await documentRepo.delete(c.req.param("id"));
    if (!deleted) return c.json({ error: "Not found" }, 404);
    return c.json({ deleted: c.req.param("id") });
  });

  app.get("/:id/history", async (c) => {
    const history = await documentRepo.getHistory(c.req.param("id"));
    return c.json({ documentId: c.req.param("id"), history });
  });

  // ── SSE: real-time document state updates ───────────────────────────────────
  app.get("/:id/stream", (c) => {
    const documentId = c.req.param("id");

    return streamSSE(c, async (stream) => {
      // send a heartbeat immediately so the client knows it's connected
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

      // keep open until the client disconnects
      await new Promise<void>((resolve) => {
        c.req.raw.signal.addEventListener("abort", () => {
          sseClients.get(documentId)?.delete(write);
          resolve();
        });
      });
    });
  });

  return app;
}
