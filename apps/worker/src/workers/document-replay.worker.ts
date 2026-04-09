import { DocumentProcessor } from "@blue-labs/document-processor";
import { Blue } from "@blue-labs/language";
import { repository } from "@blue-repository/types";
import { diff } from "json-diff-ts";
import type { Pool } from "pg";
import type { PgBoss } from "pg-boss";
import { notifyDocumentUpdated } from "../notify";
import { DocumentRepository } from "../repositories/document.repository";
import { TimelineRepository } from "../repositories/timeline.repository";

interface ReplayDocumentTimelinesJob {
  documentId: string;
}

export async function startDocumentReplayWorker(boss: PgBoss, pool: Pool) {
  const blue = new Blue({ repositories: [repository] });
  const processor = new DocumentProcessor({ blue });
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
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const doc = await documentRepo.findByIdForUpdate(documentId, client);
        if (!doc?.initialized) {
          await client.query("ROLLBACK");
          console.error(`[replay-document-timelines] doc=${documentId} not initialized, aborting replay`);
          return;
        }

        const currentStateJson = doc.state ?? doc.definition;
        const currentStateNode = blue.jsonValueToNode(currentStateJson);
        const eventNode = blue.jsonValueToNode(entry.payload);

        const result = await processor.processDocument(currentStateNode, eventNode);
        if (result.capabilityFailure) {
          await client.query("ROLLBACK");
          console.error(`[replay-document-timelines] doc=${documentId} entry=${entry.id} capability failure: ${result.failureReason}`);
          continue;
        }

        const updatedStateJson = blue.nodeToJson(result.document) as Record<string, unknown>;
        const changeset = diff(currentStateJson, updatedStateJson);

        const historyEntry = await documentRepo.appendHistory(
          documentId,
          entry.payload,
          changeset as unknown as Record<string, unknown>[],
          client,
        );
        await documentRepo.updateState(documentId, updatedStateJson, true, client);

        await client.query("COMMIT");
        await notifyDocumentUpdated(pool, documentId, historyEntry.seq, "entry_processed");
        console.log(`[replay-document-timelines] doc=${documentId} entry=${entry.id} seq=${historyEntry.seq} done`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    console.log(`[replay-document-timelines] doc=${documentId} replay complete`);
  });
}
