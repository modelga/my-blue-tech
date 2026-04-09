import { Pool } from "pg";
import { PgBoss } from "pg-boss";
import { startDocumentWorker } from "./workers/document.worker";
import { startDocumentReplayWorker } from "./workers/document-replay.worker";
import { startDocumentSessionWorker } from "./workers/document-session.worker";
import { startTimelineWorker } from "./workers/timeline.worker";

// biome-ignore lint/style/noNonNullAssertion: required env var — container startup fails fast if absent
const DATABASE_URL = process.env.DATABASE_URL!;

const pool = new Pool({ connectionString: DATABASE_URL, min: 2, max: 4 });

const boss = new PgBoss({ connectionString: DATABASE_URL, max: 4 });
boss.on("error", (err) => console.error("[pg-boss]", err));
await boss.start();

await startDocumentWorker(boss, pool);
await startDocumentReplayWorker(boss, pool);
await startTimelineWorker(boss, pool);
await startDocumentSessionWorker(boss, pool);

console.log("[worker] started — listening for jobs via pg-boss");
