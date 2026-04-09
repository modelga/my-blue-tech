import type { Pool } from "pg";
import type { PgBoss } from "pg-boss";
import { DocumentRepository } from "../repositories/document.repository";
import { TimelineRepository } from "../repositories/timeline.repository";

interface ReplayDocumentTimelinesJob {
  documentId: string;
}

export async function startDocumentReplayWorker(boss: PgBoss, pool: Pool) {
  const documentRepo = new DocumentRepository(pool);
  const timelineRepo = new TimelineRepository(pool);

  await boss.createQueue("replay-document-timelines");
  boss.work<ReplayDocumentTimelinesJob>("replay-document-timelines", async ([job]) => {
    const { documentId } = job.data;
    console.log(`[replay-document-timelines] starting doc=${documentId} jobId=${job.id}`);

    const doc = await documentRepo.findById(documentId);
    if (!doc?.initialized) {
      console.error(`[replay-document-timelines] doc=${documentId} not found or not initialized, skipping`);
      return;
    }

    const timelineIds = await documentRepo.findTimelineIdsByDocumentId(documentId);
    if (timelineIds.length === 0) {
      console.log(`[replay-document-timelines] doc=${documentId} has no timeline channels, nothing to replay`);
      return;
    }

    console.log(`[replay-document-timelines] doc=${documentId} timelines=[${timelineIds.join(", ")}]`);

    const entries = await timelineRepo.findEntriesByTimelineIds(timelineIds);
    console.log(`[replay-document-timelines] doc=${documentId} scheduling ${entries.length} entries`);

    for (const entry of entries) {
      await boss.send(
        "process-entry-document",
        { documentId, entryId: entry.id, timelineId: entry.timeline_id, payload: entry.payload },
        { singletonKey: documentId, singletonNextSlot: true },
      );
      console.log(`[replay-document-timelines] doc=${documentId} queued entry=${entry.id}`);
    }

    console.log(`[replay-document-timelines] doc=${documentId} replay scheduling complete`);
  });
}
