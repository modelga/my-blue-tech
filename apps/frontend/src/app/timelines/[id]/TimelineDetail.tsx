"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Format, PayloadEditor } from "@/components/PayloadEditor";
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
  submitButton,
} from "@/lib/styles";

const MESSAGE_EXAMPLES: Record<Format, string> = {
  json: JSON.stringify({ type: "Conversation/Operation Request", operation: "increment", request: 1 }, null, 2),
  yaml: `type: Conversation/Operation Request\noperation: increment\nrequest: 1\n`,
};

export function TimelineDetail({ timeline, entries: initial }: { timeline: Timeline; entries: TimelineEntry[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState(initial);
  const [parsedMessage, setParsedMessage] = useState<unknown | null>(JSON.parse(MESSAGE_EXAMPLES.json));
  const [messageError, setMessageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handlePush(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (messageError || !parsedMessage) {
      setError("Fix the message payload errors before pushing.");
      return;
    }

    setPending(true);
    try {
      const entry = await pushTimelineEntry(timeline.id, parsedMessage as Record<string, unknown>);
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
      <h3 style={{ margin: "0 0 1.5rem", fontSize: "1.1rem", color: colors.textBody }}>Entries</h3>

      {entries.length === 0 ? (
        <p style={emptyState}>No entries yet. Push the first one below.</p>
      ) : (
        <div style={entryList}>
          {entries.map((e) => (
            <div key={e.id} style={entryRow}>
              <div style={entryRowHeader}>
                <span style={entrySeq}>#{e.seq}</span>
                <span style={entryTimestamp}>{new Date(e.created_at).toLocaleString()}</span>
              </div>
              <pre style={entryPayload}>{JSON.stringify(e.payload, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ margin: "2rem 0 1rem", fontSize: "1.1rem", color: colors.textBody }}>Push Entry</h3>

      <form onSubmit={handlePush} style={formCard}>
        {error && <p style={errorBanner}>{error}</p>}

        <PayloadEditor
          label="Message payload"
          defaultFormat="json"
          defaultValue={MESSAGE_EXAMPLES.json}
          examples={MESSAGE_EXAMPLES}
          rows={8}
          onChange={(_raw, p, err) => {
            setParsedMessage(p);
            setMessageError(err);
          }}
        />

        <div style={formActions}>
          <button
            type="submit"
            disabled={pending || !!messageError}
            style={{
              ...submitButton,
              opacity: pending || !!messageError ? 0.7 : 1,
            }}
          >
            {pending ? "Pushing…" : "Push Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}
