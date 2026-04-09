import { DocumentProcessor } from "@blue-labs/document-processor";
import { Blue } from "@blue-labs/language";
import { repository } from "@blue-repository/types";
import { diff } from "json-diff-ts";
import type { Pool } from "pg";
import { notifyDocumentUpdated } from "../notify";
import { DocumentRepository } from "../repositories/document.repository";

export class DocumentEntryProcessor {
  private readonly blue: Blue;
  private readonly processor: DocumentProcessor;
  private readonly documentRepo: DocumentRepository;

  constructor(
    private readonly pool: Pool,
    private readonly logPrefix: string,
  ) {
    this.blue = new Blue({ repositories: [repository] });
    this.processor = new DocumentProcessor({ blue: this.blue });
    this.documentRepo = new DocumentRepository(pool);
  }

  /**
   * Processes a single timeline entry against a document inside a transaction.
   * Acquires a row-level lock (SELECT ... FOR UPDATE) to prevent stale reads
   * across concurrent workers.
   *
   * Returns true if the entry was applied, false if the document was not found
   * or not yet initialized (caller may choose to skip or abort).
   */
  async process(documentId: string, entryId: string, payload: Record<string, unknown>): Promise<boolean> {
    const client = await this.pool.connect();
    let seq: number;
    try {
      await client.query("BEGIN");

      const doc = await this.documentRepo.findByIdForUpdate(documentId, client);
      if (!doc?.initialized) {
        await client.query("ROLLBACK");
        console.error(`${this.logPrefix} doc=${documentId} not found or not initialized, skipping entry=${entryId}`);
        return false;
      }

      const currentStateJson = doc.state ?? doc.definition;
      const currentStateNode = this.blue.jsonValueToNode(currentStateJson);
      const eventNode = this.blue.jsonValueToNode(payload);

      const result = await this.processor.processDocument(currentStateNode, eventNode);
      if (result.capabilityFailure) {
        await client.query("ROLLBACK");
        console.error(`${this.logPrefix} doc=${documentId} entry=${entryId} capability failure: ${result.failureReason}`);
        return false;
      }

      const updatedStateJson = this.blue.nodeToJson(result.document) as Record<string, unknown>;
      const changeset = diff(currentStateJson, updatedStateJson);

      const historyEntry = await this.documentRepo.appendHistory(documentId, payload, changeset, client);
      await this.documentRepo.updateState(documentId, updatedStateJson, true, client);

      await client.query("COMMIT");
      seq = historyEntry.seq;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    await notifyDocumentUpdated(this.pool, documentId, seq, "entry_processed");
    console.log(`${this.logPrefix} doc=${documentId} entry=${entryId} seq=${seq} done`);
    return true;
  }
}
