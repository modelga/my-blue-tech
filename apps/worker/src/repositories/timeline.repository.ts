import type { Pool } from "pg";

export interface TimelineEntry {
  id: string;
  timeline_id: string;
  seq: number;
  payload: Record<string, unknown>;
  created_at: Date;
}

export class TimelineRepository {
  constructor(private readonly pool: Pool) {}

  async findEntriesByTimelineIds(timelineIds: string[]): Promise<TimelineEntry[]> {
    if (timelineIds.length === 0) return [];
    const { rows } = await this.pool.query<TimelineEntry>(
      `SELECT id, timeline_id, seq, payload, created_at
       FROM timeline_entries
       WHERE timeline_id = ANY($1)
       ORDER BY created_at ASC, seq ASC`,
      [timelineIds],
    );
    return rows;
  }
}
