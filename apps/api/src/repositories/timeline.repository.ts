import type { Pool } from "pg";

export interface Timeline {
  id: string;
  owner: string;
  name: string;
  description: string;
  created_at: Date;
}

export interface TimelineEntry {
  id: string;
  timeline_id: string;
  seq: number;
  payload: Record<string, unknown>;
  created_at: Date;
}

export class TimelineRepository {
  constructor(private readonly pool: Pool) {}

  async findByOwner(owner: string): Promise<Timeline[]> {
    const { rows } = await this.pool.query<Timeline>(
      "SELECT id, owner, name, description, created_at FROM timelines WHERE owner = $1 ORDER BY created_at DESC",
      [owner],
    );
    return rows;
  }

  async findById(id: string): Promise<Timeline | null> {
    const { rows } = await this.pool.query<Timeline>(
      "SELECT id, owner, name, description, created_at FROM timelines WHERE id = $1",
      [id],
    );
    return rows[0] ?? null;
  }

  async create(
    id: string,
    owner: string,
    name: string,
    description: string = "",
  ): Promise<Timeline> {
    const { rows } = await this.pool.query<Timeline>(
      "INSERT INTO timelines (id, owner, name, description) VALUES ($1, $2, $3, $4) RETURNING id, owner, name, description, created_at",
      [id, owner, name, description],
    );
    return rows[0];
  }

  async update(id: string, name: string, description: string): Promise<Timeline | null> {
    const { rows } = await this.pool.query<Timeline>(
      "UPDATE timelines SET name = $1, description = $2 WHERE id = $3 RETURNING id, owner, name, description, created_at",
      [name, description, id],
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      "DELETE FROM timelines WHERE id = $1",
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  // ── Timeline Entries ─────────────────────────────────────────────────────────

  async listEntries(timelineId: string): Promise<TimelineEntry[]> {
    const { rows } = await this.pool.query<TimelineEntry>(
      "SELECT id, timeline_id, seq, payload, created_at FROM timeline_entries WHERE timeline_id = $1 ORDER BY seq ASC",
      [timelineId],
    );
    return rows;
  }

  async appendEntry(
    id: string,
    timelineId: string,
    payload: Record<string, unknown>,
  ): Promise<TimelineEntry> {
    const { rows } = await this.pool.query<TimelineEntry>(
      `INSERT INTO timeline_entries (id, timeline_id, seq, payload)
       VALUES ($1, $2, (SELECT COALESCE(MAX(seq), 0) + 1 FROM timeline_entries WHERE timeline_id = $2), $3)
       RETURNING id, timeline_id, seq, payload, created_at`,
      [id, timelineId, payload],
    );
    return rows[0];
  }
}
