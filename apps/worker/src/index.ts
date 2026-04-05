import { DocumentProcessor } from "@blue-labs/document-processor";
import { Blue } from "@blue-labs/language";
import { repository } from "@blue-repository/types";
import { Client } from "pg";
import PgBoss from "pg-boss";

const DATABASE_URL = process.env.DATABASE_URL!;

const blue = new Blue({ repositories: [repository] });
const processor = new DocumentProcessor({ blue });

const boss = new PgBoss(DATABASE_URL);

boss.on("error", (err) => console.error("[pg-boss]", err));

await boss.start();

// ── initialize-session ───────────────────────────────────────────────────────
// Receives a Blue Document (YAML string), initializes it via DocumentProcessor,
// persists the initial state, and notifies via NOTIFY.
await boss.work<{ sessionId: string; yaml: string }>("initialize-session", { teamSize: 1 }, async (job) => {
  const { sessionId, yaml } = job.data;
  console.log(`[initialize-session] sessionId=${sessionId}`);

  const document = blue.yamlToNode(yaml);
  const result = await processor.initializeDocument(document);

  if (result.capabilityFailure) {
    console.error(`[initialize-session] capability failure: ${result.failureReason}`);
    throw new Error(result.failureReason ?? "capability failure");
  }

  // TODO: persist result.document (serialized) to document_sessions table
  //   UPDATE document_sessions SET state = $1, seq = seq + 1 WHERE id = $2
  await notify(DATABASE_URL, sessionId, 0, "initialized");
  console.log(`[initialize-session] done sessionId=${sessionId}`);
});

// ── process-entry ────────────────────────────────────────────────────────────
// Receives a timeline entry event, loads the current session state, runs
// DocumentProcessor.processDocument(), persists, then notifies.
await boss.work<{
  sessionId: string;
  timelineId: string;
  entryId: string;
  payload: unknown;
}>("process-entry", { teamSize: 1 }, async (job) => {
  const { sessionId, entryId, payload } = job.data;
  console.log(`[process-entry] sessionId=${sessionId} entryId=${entryId}`);

  // TODO: load current session document state from DB
  //   SELECT state, seq FROM document_sessions WHERE id = $1 FOR UPDATE
  const currentDocument = blue.jsonValueToNode(payload);

  const event = blue.jsonValueToNode(payload);
  const result = await processor.processDocument(currentDocument, event);

  if (result.capabilityFailure) {
    console.error(`[process-entry] capability failure: ${result.failureReason}`);
    throw new Error(result.failureReason ?? "capability failure");
  }

  // TODO: persist result.document and increment seq in a single transaction
  //   UPDATE document_sessions SET state = $1, seq = seq + 1 WHERE id = $2
  const nextSeq = 1; // TODO: read from DB
  await notify(DATABASE_URL, sessionId, nextSeq, "state_updated");
  console.log(`[process-entry] done sessionId=${sessionId}`);
});

async function notify(connectionString: string, sessionId: string, seq: number, event: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const payload = JSON.stringify({ sessionId, seq, event });
    await client.query(`NOTIFY session_updated, '${payload.replace(/'/g, "''")}'`);
  } finally {
    await client.end();
  }
}

console.log("[worker] started — waiting for jobs");
