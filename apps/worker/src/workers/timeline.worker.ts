import type { Pool } from "pg";
import type { PgBoss } from "pg-boss";
import { notifyDocumentUpdated } from "../notify";

interface ProcessEntryJob {
  timelineId: string;
  entryId: string;
  payload: Record<string, unknown>;
}

export async function startTimelineWorker(boss: PgBoss, pool: Pool) {
  await boss.createQueue("process-entry");
  boss.work<ProcessEntryJob>("process-entry", async (job) => {
    const { timelineId, entryId, payload } = job.data;
    console.log(`[process-entry] timelineId=${timelineId} entryId=${entryId}`);

    // TODO: find documents whose contracts reference this timelineId,
    //   load their current state, run DocumentProcessor.processDocument(),
    //   persist the new state + diff, and notify each affected documentId.
    console.log(`[process-entry] payload type=${(payload as Record<string, unknown>).type}`);
  });
}
