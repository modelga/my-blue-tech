import type { Pool } from "pg";
import type { PgBoss } from "pg-boss";
import { DocumentEntryProcessor } from "../lib/process-document-entry";
import { DocumentRepository } from "../repositories/document.repository";
import { TimelineRepository } from "../repositories/timeline.repository";

interface ReplayDocumentTimelinesJob {
  documentId: string;
}

export async function startDocumentReplayWorker(boss: PgBoss, pool: Pool) {
  const entryProcessor = new DocumentEntryProcessor(pool, "[replay-document-timelines]");
  const documentRepo = new DocumentRepository(pool);
  const timelineRepo = new TimelineRepository(pool);

  await boss.createQueue("replay-document-timelines");
  boss.work<ReplayDocumentTimelinesJob>("replay-document-timelines", async ([job]) => {
    const { documentId } = job.data;
    console.log(`[replay-document-timelines] starting doc=${documentId} jobId=${job.id}`);

    const timelineIds = await documentRepo.findTimelineIdsByDocumentId(documentId);
    if (timelineIds.length === 0) {
      console.log(`[replay-document-timelines] doc=${documentId} has no timeline channels, nothing to replay`);
      return;
    }

    const entries = await timelineRepo.findEntriesByTimelineIds(timelineIds);
    console.log(`[replay-document-timelines] doc=${documentId} replaying ${entries.length} entries in-process`);

    for (const entry of entries) {
      const applied = await entryProcessor.process(
        documentId,
        entry.id,
        entry.payload,
      );
      if (!applied) {
        console.error(`[replay-document-timelines] doc=${documentId} aborting replay at entry=${entry.id}`);
        return;
      }
    }

    console.log(`[replay-document-timelines] doc=${documentId} replay complete`);
  });
}
