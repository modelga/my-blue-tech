"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { pushTimelineEntry, type Timeline, type TimelineEntry } from "@/lib/api";
import {
  colors,
  emptyState,
  entryList,
  entryPayload,
  entryRow,
  entryRowHeader,
  entrySeq,
  entryTimestamp,
  errorBanner,
  formActions,
  formCard,
  formLabel,
  monoTextarea,
  submitButton,
} from "@/lib/styles";

const EXAMPLE_PAYLOAD = JSON.stringify(
  { type: "MyOS/MyOS Timeline Entry", message: { type: "Conversation/Operation Request" } },
  null,
  2,
);

export function TimelineDetail({
  timeline,
  entries: initial,
}: {
  timeline: Timeline;
  entries: TimelineEntry[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initial);
  const [payload, setPayload] = useState(EXAMPLE_PAYLOAD);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handlePush(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload);
    } catch {
      setError("Payload must be valid JSON.");
      return;
    }

    setPending(true);
    try {
      const entry = await pushTimelineEntry(timeline.id, parsed);
      setEntries((prev) => [...prev, entry]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to push entry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.1rem", color: colors.textBody }}>
        Entries
      </h3>

      {entries.length === 0 ? (
        <p style={emptyState}>No entries yet. Push the first one below.</p>
      ) : (
        <div style={entryList}>
          {entries.map((e) => (
            <div key={e.id} style={entryRow}>
              <div style={entryRowHeader}>
                <span style={entrySeq}>#{e.seq}</span>
                <span style={entryTimestamp}>
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </div>
              <pre style={entryPayload}>{JSON.stringify(e.payload, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ margin: "2rem 0 1rem", fontSize: "1.1rem", color: colors.textBody }}>
        Push Entry
      </h3>

      <form onSubmit={handlePush} style={formCard}>
        {error && <p style={errorBanner}>{error}</p>}

        <label style={formLabel}>
          Payload (JSON)
          <textarea
            rows={10}
            style={monoTextarea}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
        </label>

        <div style={formActions}>
          <button
            type="submit"
            disabled={pending}
            style={{ ...submitButton, opacity: pending ? 0.7 : 1 }}
          >
            {pending ? "Pushing…" : "Push Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
