import { Hono } from "hono";
import { Client, Pool } from "pg";
import PgBoss from "pg-boss";
import { authMiddleware } from "./lib/auth";
import type { Variables } from "./lib/types";
import { DocumentRepository } from "./repositories/document.repository";
import { TimelineRepository } from "./repositories/timeline.repository";
import { documentsRouter } from "./routes/documents";
import { timelinesRouter } from "./routes/timelines";

const DATABASE_URL = process.env.DATABASE_URL!;
const PORT = Number(process.env.PORT ?? 3001);

const boss = new PgBoss(DATABASE_URL);
await boss.start();

const pool = new Pool({ connectionString: DATABASE_URL });

const migration = await Bun.file(new URL("./migrate.sql", import.meta.url)).text();
await pool.query(migration);
console.log("Migrations applied.");

const documentRepo = new DocumentRepository(pool);
const timelineRepo = new TimelineRepository(pool);

// SSE: one shared pg client listens for document notifications and fans out
// to all active SSE response streams in-process.
// Each entry is a write callback registered by an open SSE connection.
const sseClients = new Map<string, Set<(data: string) => void>>();

const pgListener = new Client({ connectionString: DATABASE_URL });
await pgListener.connect();
await pgListener.query("LISTEN document_updated");

pgListener.on("notification", (msg) => {
  if (!msg.payload) return;
  const { documentId, seq, event } = JSON.parse(msg.payload) as {
    documentId: string;
    seq: number;
    event: string;
  };
  const writers = sseClients.get(documentId);
  if (!writers) return;
  const data = JSON.stringify({ documentId, seq, event });
  for (const write of writers) {
    write(data);
  }
});

const app = new Hono<{ Variables: Variables }>();

app.get("/health", (c) => c.json({ status: "ok" }));

app.use("/api/*", authMiddleware);
app.route("/api/timelines", timelinesRouter(boss, timelineRepo));
app.route(
  "/api/documents",
  documentsRouter(boss, sseClients, documentRepo, timelineRepo),
);

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`API listening on :${PORT}`);
