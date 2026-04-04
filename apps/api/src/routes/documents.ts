import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type PgBoss from "pg-boss";
import type { DocumentRepository } from "../repositories/document.repository";
import type { TimelineRepository } from "../repositories/timeline.repository";
import type { Variables } from "../lib/types";

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
    const documentId = crypto.randomUUID();

    const document = await documentRepo.create(documentId, owner, body.name, body.definition);

    // Auto-create timelines for MyOS/MyOS Timeline Channel contracts
    const contracts = body.definition?.contracts as Record<string, Record<string, unknown>> | undefined;
    if (contracts) {
      for (const [, contract] of Object.entries(contracts)) {
        if (contract?.type === "MyOS/MyOS Timeline Channel" && typeof contract.timelineId === "string") {
          const existingTimeline = await timelineRepo.findById(contract.timelineId);
          if (!existingTimeline) {
            await timelineRepo.create(
              contract.timelineId,
              owner,
              `${body.name} — Timeline`,
              `Auto-created timeline channel for document "${body.name}"`,
            );
          }
        }
      }
    }

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
