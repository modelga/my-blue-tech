import PgBoss from "pg-boss";

const DATABASE_URL = process.env.DATABASE_URL!;
const PORT = Number(process.env.PORT ?? 3001);

const boss = new PgBoss(DATABASE_URL);
await boss.start();

// SSE: one shared pg client listens for session notifications and fans out
// to all active SSE response streams in-process.
const sseClients = new Map<string, Set<ReadableStreamDefaultController>>();

const { Client } = await import("pg");
const pgListener = new Client({ connectionString: DATABASE_URL });
await pgListener.connect();
await pgListener.query("LISTEN session_updated");
pgListener.on("notification", (msg) => {
  if (!msg.payload) return;
  const { sessionId, seq, event } = JSON.parse(msg.payload) as {
    sessionId: string;
    seq: number;
    event: string;
  };
  const controllers = sseClients.get(sessionId);
  if (!controllers) return;
  const data = `data: ${JSON.stringify({ sessionId, seq, event })}\n\n`;
  for (const ctrl of controllers) {
    try {
      ctrl.enqueue(new TextEncoder().encode(data));
    } catch {
      controllers.delete(ctrl);
    }
  }
});

Bun.serve({
  port: PORT,
  routes: {
    // ── Health ──────────────────────────────────────────────────────────────
    "/health": {
      GET: () => Response.json({ status: "ok" }),
    },

    // ── Timelines ───────────────────────────────────────────────────────────
    "/api/timelines": {
      GET: (_req) => {
        // TODO: list timelines for authenticated user
        return Response.json({ timelines: [] });
      },
      POST: async (req) => {
        // TODO: create timeline
        const body = await req.json();
        return Response.json(
          { id: crypto.randomUUID(), ...body },
          { status: 201 },
        );
      },
    },
    "/api/timelines/:id": {
      GET: (req) => {
        // TODO: get timeline by id
        return Response.json({ id: req.params.id });
      },
      PATCH: async (req) => {
        // TODO: update timeline
        const body = await req.json();
        return Response.json({ id: req.params.id, ...body });
      },
      DELETE: (req) => {
        // TODO: delete timeline
        return Response.json({ deleted: req.params.id });
      },
    },

    // ── Timeline Entries ─────────────────────────────────────────────────────
    "/api/timelines/:id/entries": {
      GET: (req) => {
        // TODO: paginated entries for timeline
        return Response.json({ timelineId: req.params.id, entries: [] });
      },
      POST: async (req) => {
        // TODO: append entry + enqueue processing job atomically
        const body = await req.json();
        const entryId = crypto.randomUUID();
        await boss.send("process-entry", {
          timelineId: req.params.id,
          entryId,
          ...body,
        });
        return Response.json({ id: entryId }, { status: 201 });
      },
    },

    // ── Document Sessions ────────────────────────────────────────────────────
    "/api/sessions": {
      POST: async (req) => {
        // TODO: start a Document Session from a Blue Document
        const body = await req.json();
        const sessionId = crypto.randomUUID();
        await boss.send("initialize-session", { sessionId, ...body });
        return Response.json({ sessionId }, { status: 202 });
      },
    },
    "/api/sessions/:id": {
      GET: (req) => {
        // TODO: get current Document Session state
        return Response.json({ sessionId: req.params.id, state: null });
      },
    },
    "/api/sessions/:id/history": {
      GET: (req) => {
        // TODO: get Document Session processing history
        return Response.json({ sessionId: req.params.id, history: [] });
      },
    },

    // ── SSE: real-time session state updates ─────────────────────────────────
    "/api/sessions/:id/stream": {
      GET: (req) => {
        const sessionId = req.params.id;
        const stream = new ReadableStream({
          start(ctrl) {
            if (!sseClients.has(sessionId))
              sseClients.set(sessionId, new Set());
            sseClients.get(sessionId)!.add(ctrl);
            // send a heartbeat immediately so the client knows it's connected
            ctrl.enqueue(new TextEncoder().encode(": connected\n\n"));
          },
          cancel(ctrl) {
            sseClients
              .get(sessionId)
              ?.delete(ctrl as ReadableStreamDefaultController);
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});

console.log(`API listening on :${PORT}`);
