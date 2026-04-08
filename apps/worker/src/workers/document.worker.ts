import { DocumentProcessor } from "@blue-labs/document-processor";
import { Blue } from "@blue-labs/language";
import { repository } from "@blue-repository/types";
import { diff } from "json-diff-ts";
import type { Pool } from "pg";
import type { PgBoss, WorkOptions } from "pg-boss";
import { notifyDocumentUpdated } from "../notify";
import { DocumentRepository } from "../repositories/document.repository";

interface InitializeDocumentJob {
  documentId: string;
  name: string;
  definition: Record<string, unknown>;
}

export async function startDocumentWorker(boss: PgBoss, pool: Pool) {
  const blue = new Blue({ repositories: [repository] });
  const processor = new DocumentProcessor({ blue });
  const documentRepo = new DocumentRepository(pool);
  boss.createQueue("initialize-document");
  boss.work<InitializeDocumentJob>("initialize-document", { localConcurrency: 10, localGroupConcurrency: 10, batchSize: 1 } as WorkOptions, async ([job]) => {
    const { documentId, definition } = job.data;

    console.log(`[initialize-document] starting documentId=${documentId}`);

    const definitionNode = blue.jsonValueToNode(definition);
    const result = await processor.initializeDocument(definitionNode);

    if (result.capabilityFailure) {
      throw new Error(`[initialize-document] capability failure for ${documentId}: ${result.failureReason}`);
    }

    const definitionJson = blue.nodeToJson(definitionNode) as Record<string, unknown>;
    const initializedJson = blue.nodeToJson(result.document) as Record<string, unknown>;

    // Compute the changeset: records what initialization added to the document.
    const changeset = diff(definitionJson, initializedJson);
    console.log(changeset);
    const entry = await documentRepo.appendHistory(documentId, { type: "initialize", documentId }, changeset as Record<string, unknown>);

    // await documentRepo.updateState(documentId, initializedJson, true);

    // // Notify the API's SSE fan-out via pg_notify so connected clients update immediately.
    // await notifyDocumentUpdated(pool, documentId, entry.seq, "initialized");

    // console.log(`[initialize-document] done documentId=${documentId} seq=${entry.seq}`);
  });
}
