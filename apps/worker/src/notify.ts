import type { Pool } from "pg";

/**
 * Sends a pg_notify on the `document_updated` channel.
 * The API's pgListener picks this up and fans the event out to SSE clients.
 */
export async function notifyDocumentUpdated(
  pool: Pool,
  documentId: string,
  seq: number,
  event: string,
): Promise<void> {
  const payload = JSON.stringify({ documentId, seq, event });
  await pool.query("SELECT pg_notify($1, $2)", ["document_updated", payload]);
}
