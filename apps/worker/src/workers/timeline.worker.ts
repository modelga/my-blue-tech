import type { Pool } from "pg";
import type { PgBoss } from "pg-boss";
import { DocumentRepository } from "../repositories/document.repository";

interface ProcessEntryJob {
  timelineId: string;
  entryId: string;
  payload: Record<string, unknown>;
}

export async function startTimelineWorker(boss: PgBoss, pool: Pool) {
  const documentRepo = new DocumentRepository(pool);

  await boss.createQueue("process-entry");
  boss.work<ProcessEntryJob>("process-entry", async ([job]) => {
    const { timelineId, entryId, payload } = job.data;

    const documents = await documentRepo.findByTimelineId(timelineId);
    console.log(`[process-entry] timelineId=${timelineId} entryId=${entryId} affected=${documents.length}`);

    for (const doc of documents) {
      await boss.send(
        "process-entry-document",
        { documentId: doc.id, entryId, timelineId, payload },
        // singletonKey ensures at most one queued job per document at a time,
        // preventing concurrent mutations of the same document state.
        { singletonKey: doc.id },
      );
      console.log(`[process-entry] queued process-entry-document for doc=${doc.id}`);
    }
  });
}
