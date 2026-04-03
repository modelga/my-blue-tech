import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { Client } from "pg";
import PgBoss from "pg-boss";

const DATABASE_URL = process.env.DATABASE_URL!;
const PORT = Number(process.env.PORT ?? 3001);

const boss = new PgBoss(DATABASE_URL);
await boss.start();

// SSE: one shared pg client listens for session notifications and fans out
// to all active SSE response streams in-process.
// Each entry is a write callback registered by an open SSE connection.
const sseClients = new Map<string, Set<(data: string) => void>>();

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
  const writers = sseClients.get(sessionId);
  if (!writers) return;
  const data = JSON.stringify({ sessionId, seq, event });
  for (const write of writers) {
    write(data);
  }
});

const app = new Hono();

// ── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok" }));

// ── Timelines ────────────────────────────────────────────────────────────────
app.get("/api/timelines", (c) => {
  // TODO: list timelines for authenticated user
  return c.json({ timelines: [] });
});

app.post("/api/timelines", async (c) => {
  // TODO: create timeline
  const body = await c.req.json();
  return c.json({ id: crypto.randomUUID(), ...body }, 201);
});

app.get("/api/timelines/:id", (c) => {
  // TODO: get timeline by id
  return c.json({ id: c.req.param("id") });
});

app.patch("/api/timelines/:id", async (c) => {
  // TODO: update timeline
  const body = await c.req.json();
  return c.json({ id: c.req.param("id"), ...body });
});

app.delete("/api/timelines/:id", (c) => {
  // TODO: delete timeline
  return c.json({ deleted: c.req.param("id") });
});

// ── Timeline Entries ─────────────────────────────────────────────────────────
app.get("/api/timelines/:id/entries", (c) => {
  // TODO: paginated entries for timeline
  return c.json({ timelineId: c.req.param("id"), entries: [] });
});

app.post("/api/timelines/:id/entries", async (c) => {
  // TODO: append entry + enqueue processing job atomically
  const body = await c.req.json();
  const entryId = crypto.randomUUID();
  await boss.send("process-entry", {
    timelineId: c.req.param("id"),
    entryId,
    ...body,
  });
  return c.json({ id: entryId }, 201);
});

// ── Document Sessions ─────────────────────────────────────────────────────────
app.post("/api/sessions", async (c) => {
  // TODO: start a Document Session from a Blue Document
  const body = await c.req.json();
  const sessionId = crypto.randomUUID();
  await boss.send("initialize-session", { sessionId, ...body });
  return c.json({ sessionId }, 202);
});

app.get("/api/sessions/:id", (c) => {
  // TODO: get current Document Session state
  return c.json({ sessionId: c.req.param("id"), state: null });
});

app.get("/api/sessions/:id/history", (c) => {
  // TODO: get Document Session processing history
  return c.json({ sessionId: c.req.param("id"), history: [] });
});

// ── SSE: real-time session state updates ──────────────────────────────────────
app.get("/api/sessions/:id/stream", (c) => {
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

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`API listening on :${PORT}`);
