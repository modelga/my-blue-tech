import type { Pool } from "pg";
import type { PgBoss, WorkOptions } from "pg-boss";
import { DocumentEntryProcessor } from "../lib/process-document-entry";

interface ProcessEntryDocumentJob {
  documentId: string;
  entryId: string;
  timelineId: string;
  payload: Record<string, unknown>;
}

export async function startDocumentSessionWorker(boss: PgBoss, pool: Pool) {
  const entryProcessor = new DocumentEntryProcessor(pool, "[process-entry-document]");

  await boss.createQueue("process-entry-document", { retryDelay: 5, retryLimit: 10 });
  boss.work<ProcessEntryDocumentJob>(
    "process-entry-document",
    // localConcurrency: many documents can be processed in parallel;
    // per-document serialization is enforced by singletonKey at the sender side.
    { localConcurrency: 10 } as WorkOptions,
    async ([job]) => {
      const { documentId, entryId, timelineId, payload } = job.data;
      console.log(`[process-entry-document] doc=${documentId} entry=${entryId} timeline=${timelineId}`);

      await entryProcessor.process(documentId, entryId, payload);
    },
  );
}
