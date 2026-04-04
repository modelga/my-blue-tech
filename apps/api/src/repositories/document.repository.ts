import type { Pool } from "pg";

export interface Document {
  id: string;
  owner: string;
  name: string;
  definition: Record<string, unknown>;
  state: Record<string, unknown> | null;
  initialized: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentHistoryEntry {
  id: number;
  document_id: string;
  seq: number;
  event: Record<string, unknown>;
  state_after: Record<string, unknown> | null;
  created_at: Date;
}

export class DocumentRepository {
  constructor(private readonly pool: Pool) {}

  async findByOwner(owner: string): Promise<Document[]> {
    const { rows } = await this.pool.query<Document>(
      "SELECT id, owner, name, definition, state, initialized, created_at, updated_at FROM documents WHERE owner = $1 ORDER BY created_at DESC",
      [owner],
    );
    return rows;
  }

  async findById(id: string): Promise<Document | null> {
    const { rows } = await this.pool.query<Document>(
      "SELECT id, owner, name, definition, state, initialized, created_at, updated_at FROM documents WHERE id = $1",
      [id],
    );
    return rows[0] ?? null;
  }

  async create(
    id: string,
    owner: string,
    name: string,
    definition: Record<string, unknown>,
  ): Promise<Document> {
    const { rows } = await this.pool.query<Document>(
      "INSERT INTO documents (id, owner, name, definition) VALUES ($1, $2, $3, $4) RETURNING id, owner, name, definition, state, initialized, created_at, updated_at",
      [id, owner, name, definition],
    );
    return rows[0];
  }

  async updateState(
    id: string,
    state: Record<string, unknown>,
    initialized: boolean,
  ): Promise<Document | null> {
    const { rows } = await this.pool.query<Document>(
      "UPDATE documents SET state = $1, initialized = $2, updated_at = NOW() WHERE id = $3 RETURNING id, owner, name, definition, state, initialized, created_at, updated_at",
      [state, initialized, id],
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      "DELETE FROM documents WHERE id = $1",
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  // ── Document History ─────────────────────────────────────────────────────────

  async getHistory(documentId: string): Promise<DocumentHistoryEntry[]> {
    const { rows } = await this.pool.query<DocumentHistoryEntry>(
      "SELECT id, document_id, seq, event, state_after, created_at FROM document_history WHERE document_id = $1 ORDER BY seq ASC",
      [documentId],
    );
    return rows;
  }

  async appendHistory(
    documentId: string,
    event: Record<string, unknown>,
    stateAfter: Record<string, unknown> | null,
  ): Promise<DocumentHistoryEntry> {
    const { rows } = await this.pool.query<DocumentHistoryEntry>(
      `INSERT INTO document_history (document_id, seq, event, state_after)
       VALUES ($1, (SELECT COALESCE(MAX(seq), 0) + 1 FROM document_history WHERE document_id = $1), $2, $3)
       RETURNING id, document_id, seq, event, state_after, created_at`,
      [documentId, event, stateAfter],
    );
    return rows[0];
  }
}
