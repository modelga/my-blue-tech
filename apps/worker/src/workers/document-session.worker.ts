import { DocumentProcessor } from "@blue-labs/document-processor";
import { Blue } from "@blue-labs/language";
import { repository } from "@blue-repository/types";
import { diff } from "json-diff-ts";
import type { Pool } from "pg";
import type { PgBoss, WorkOptions } from "pg-boss";
import { notifyDocumentUpdated } from "../notify";
import { DocumentRepository } from "../repositories/document.repository";

interface ProcessEntryDocumentJob {
  documentId: string;
  entryId: string;
  timelineId: string;
  payload: Record<string, unknown>;
}

export async function startDocumentSessionWorker(boss: PgBoss, pool: Pool) {
  const blue = new Blue({ repositories: [repository] });
  const processor = new DocumentProcessor({ blue });
  const documentRepo = new DocumentRepository(pool);

  await boss.createQueue("process-entry-document");
  boss.work<ProcessEntryDocumentJob>(
    "process-entry-document",
    // localConcurrency: many documents can be processed in parallel;
    // per-document serialization is enforced by singletonKey at the sender side.
    { localConcurrency: 10 } as WorkOptions,
    async ([job]) => {
      const { documentId, entryId, timelineId, payload } = job.data;
      console.log(`[process-entry-document] doc=${documentId} entry=${entryId} timeline=${timelineId}`);

      const doc = await documentRepo.findById(documentId);
      if (!doc) {
        console.error(`[process-entry-document] doc=${documentId} not found, skipping`);
        return;
      }
      if (!doc.initialized) {
        console.error(`[process-entry-document] doc=${documentId} not yet initialized, skipping`);
        return;
      }

      const currentStateJson = doc.state ?? doc.definition;
      const currentStateNode = blue.jsonValueToNode(currentStateJson);
      const eventNode = blue.jsonValueToNode(payload);

      const result = await processor.processDocument(currentStateNode, eventNode);

      if (result.capabilityFailure) {
        console.error(`[process-entry-document] doc=${documentId} capability failure: ${result.failureReason}`);
        return;
      }

      const updatedStateJson = blue.nodeToJson(result.document) as Record<string, unknown>;
      const changeset = diff(currentStateJson, updatedStateJson);

      const entry = await documentRepo.appendHistory(
        documentId,
        payload,
        changeset as unknown as Record<string, unknown>[],
      );
      await documentRepo.updateState(documentId, updatedStateJson, true);
      await notifyDocumentUpdated(pool, documentId, entry.seq, "entry_processed");

      console.log(`[process-entry-document] doc=${documentId} seq=${entry.seq} done`);
    },
  );
}
