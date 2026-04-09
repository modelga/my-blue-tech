import { DocumentProcessor } from "@blue-labs/document-processor";
import { Blue } from "@blue-labs/language";
import { repository } from "@blue-repository/types";
import { diff } from "json-diff-ts";
import type { Pool } from "pg";
import type { PgBoss } from "pg-boss";
import { notifyDocumentUpdated } from "../notify";
import { DocumentRepository } from "../repositories/document.repository";

interface ProcessEntryJob {
  timelineId: string;
  entryId: string;
  payload: Record<string, unknown>;
}

export async function startTimelineWorker(boss: PgBoss, pool: Pool) {
  const blue = new Blue({ repositories: [repository] });
  const processor = new DocumentProcessor({ blue });
  const documentRepo = new DocumentRepository(pool);

  await boss.createQueue("process-entry");
  boss.work<ProcessEntryJob>("process-entry", async ([job]) => {
    const { timelineId, entryId, payload } = job.data;

    const documents = await documentRepo.findByTimelineId(timelineId);
    console.log(`[process-entry] timelineId=${timelineId} entryId=${entryId} affected=${documents.length}`);

    for (const doc of documents) {
      try {
        const currentStateJson = doc.state ?? doc.definition;
        const currentStateNode = blue.jsonValueToNode(currentStateJson);
        const eventNode = blue.jsonValueToNode(payload);

        const result = await processor.processDocument(currentStateNode, eventNode);

        if (result.capabilityFailure) {
          console.error(`[process-entry] doc=${doc.id} failed: ${result.failureReason}`);
          continue;
        }

        const updatedStateJson = blue.nodeToJson(result.document) as Record<string, unknown>;
        const changeset = diff(currentStateJson, updatedStateJson);

        const entry = await documentRepo.appendHistory(doc.id, payload, changeset as Record<string, unknown>[]);
        await documentRepo.updateState(doc.id, updatedStateJson, true);
        await notifyDocumentUpdated(pool, doc.id, entry.seq, "entry_processed");

        console.log(`[process-entry] doc=${doc.id} seq=${entry.seq} done`);
      } catch (err) {
        console.error(`[process-entry] doc=${doc.id} error:`, err);
      }
    }
  });
}
