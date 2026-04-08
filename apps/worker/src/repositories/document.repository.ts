import type { Pool } from "pg";

export interface DocumentHistoryEntry {
  id: number;
  document_id: string;
  seq: number;
  event: Record<string, unknown>;
  diff: Record<string, unknown> | null;
  created_at: Date;
}

export class DocumentRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<{ definition: Record<string, unknown>; state: Record<string, unknown> | null; initialized: boolean } | null> {
    const { rows } = await this.pool.query(
      "SELECT definition, state, initialized FROM documents WHERE id = $1",
      [id],
    );
    return rows[0] ?? null;
  }

  async updateState(id: string, state: Record<string, unknown>, initialized: boolean): Promise<void> {
    await this.pool.query(
      "UPDATE documents SET state = $1, initialized = $2, updated_at = NOW() WHERE id = $3",
      [state, initialized, id],
    );
  }

  async appendHistory(
    documentId: string,
    event: Record<string, unknown>,
    diff: Record<string, unknown> | null,
  ): Promise<DocumentHistoryEntry> {
    const { rows } = await this.pool.query<DocumentHistoryEntry>(
      `INSERT INTO document_history (document_id, seq, event, diff)
       VALUES ($1, (SELECT COALESCE(MAX(seq), 0) + 1 FROM document_history WHERE document_id = $1), $2, $3)
       RETURNING id, document_id, seq, event, diff, created_at`,
      [documentId, event, diff],
    );
    return rows[0];
  }
}
