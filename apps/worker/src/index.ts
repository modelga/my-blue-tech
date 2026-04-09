import { Pool } from "pg";
import { PgBoss } from "pg-boss";
import { startDocumentWorker } from "./workers/document.worker";
import { startDocumentSessionWorker } from "./workers/document-session.worker";
import { startTimelineWorker } from "./workers/timeline.worker";

const DATABASE_URL = process.env.DATABASE_URL!;

const pool = new Pool({ connectionString: DATABASE_URL });

const boss = new PgBoss(DATABASE_URL);
boss.on("error", (err) => console.error("[pg-boss]", err));
await boss.start();

await startDocumentWorker(boss, pool);
await startTimelineWorker(boss, pool);
await startDocumentSessionWorker(boss, pool);

console.log("[worker] started — listening for jobs via pg-boss");
