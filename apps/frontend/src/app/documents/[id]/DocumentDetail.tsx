"use client";

import { useDebounce } from "@uidotdev/usehooks";
import { dump } from "js-yaml";
import { useEffect, useRef, useState } from "react";
import type { DocumentDetail as DocumentDetailType, DocumentHistoryEntry } from "@/lib/api";
import { getDocument, getDocumentHistory } from "@/lib/api";
import {
  colors,
  detailSection,
  detailSectionTitle,
  diffRowAdd,
  diffRowRemove,
  diffRowUpdate,
  docDetailLayout,
  emptyState,
  historyItemActive,
  historyItemBase,
  historyPanel,
  historyPanelTitle,
  stateViewer,
} from "@/lib/styles";

// Mirrors the IChange shape produced by json-diff-ts v4
interface IChange {
  type: "ADD" | "REMOVE" | "UPDATE";
  key: string;
  value?: unknown;
  oldValue?: unknown;
  changes?: IChange[];
}

/** Reconstruct the document state after a given set of diff changes. */
function applyChanges(obj: Record<string, unknown>, changes: IChange[]): Record<string, unknown> {
  const result = { ...obj };
  for (const change of changes) {
    if (change.type === "REMOVE") {
      delete result[change.key];
    } else if (change.changes?.length) {
      result[change.key] = applyChanges((result[change.key] as Record<string, unknown>) ?? {}, change.changes);
    } else {
      result[change.key] = change.value;
    }
  }
  return result;
}

/**
 * Build the full state snapshot array:
 *   snapshots[0]   = definition (before any processing)
 *   snapshots[i+1] = state after history[i] was applied
 */
function buildSnapshots(definition: Record<string, unknown>, history: DocumentHistoryEntry[]): Record<string, unknown>[] {
  const snapshots: Record<string, unknown>[] = [definition];
  for (const entry of history) {
    const prev = snapshots[snapshots.length - 1];
    const changes = (entry.diff ?? []) as unknown as IChange[];
    snapshots.push(changes.length ? applyChanges(prev, changes) : { ...prev });
  }
  return snapshots;
}

function DiffLog({ changes }: { changes: IChange[] }) {
  if (!changes.length) {
    return <p style={{ margin: 0, color: colors.textMuted, fontSize: "0.85rem" }}>No field changes recorded.</p>;
  }

  function renderChange(change: IChange, path = ""): React.ReactNode {
    const fullKey = path ? `${path}.${change.key}` : change.key;
    if (change.changes?.length) {
      // biome-ignore lint/suspicious/noArrayIndexKey: diff entries have no stable id; index is safe here because the array is derived from an immutable changeset
      return change.changes.map((c, i) => <span key={i}>{renderChange(c, fullKey)}</span>);
    }
    if (change.type === "ADD") {
      return (
        <div key={fullKey} style={diffRowAdd}>
          <span>+</span>
          <span style={{ fontWeight: 600 }}>{fullKey}</span>
          <span>= {dump(change.value)}</span>
        </div>
      );
    }
    if (change.type === "REMOVE") {
      return (
        <div key={fullKey} style={diffRowRemove}>
          <span>−</span>
          <span style={{ fontWeight: 600 }}>{fullKey}</span>
          <span>was {dump(change.oldValue)}</span>
        </div>
      );
    }
    return (
      <div key={fullKey} style={diffRowUpdate}>
        <span>~</span>
        <span style={{ fontWeight: 600 }}>{fullKey}</span>
        <span>
          {dump(change.oldValue)} → {dump(change.value)}
        </span>
      </div>
    );
  }

  return (
    <div>
      {changes.map((c, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: diff entries have no stable id; index is safe here because the array is derived from an immutable changeset
        <span key={i}>{renderChange(c)}</span>
      ))}
    </div>
  );
}

export function DocumentDetail({ document: initialDocument, history: initialHistory }: { document: DocumentDetailType; history: DocumentHistoryEntry[] }) {
  const [document, setDocument] = useState(initialDocument);
  const [history, setHistory] = useState(initialHistory);
  const [selectedIdx, setSelectedIdx] = useState<number>(initialHistory.length - 1);

  // Track selectedIdx in a ref so the SSE callback can read the current value
  // without being recreated on every render.
  const selectedIdxRef = useRef(selectedIdx);
  selectedIdxRef.current = selectedIdx;

  // Increment on every SSE message; debounce so rapid-fire events (e.g. bulk
  // replay) coalesce into a single fetch after 500 ms of silence.
  const [sseSignal, setSseSignal] = useState(0);
  const debouncedSseSignal = useDebounce(sseSignal, 500);

  useEffect(() => {
    const es = new EventSource(`/api/documents/${initialDocument.id}/stream`);
    es.onmessage = () => setSseSignal((n) => n + 1);
    return () => es.close();
  }, [initialDocument.id]);

  useEffect(() => {
    if (debouncedSseSignal === 0) return;
    (async () => {
      const [freshDoc, freshHistory] = await Promise.all([getDocument(initialDocument.id), getDocumentHistory(initialDocument.id)]);
      setDocument(freshDoc);
      setHistory((prev) => {
        // Auto-advance to the new latest entry only if the user was already there.
        const wasAtLatest = selectedIdxRef.current < 0 || selectedIdxRef.current === prev.length - 1;
        if (wasAtLatest) {
          setSelectedIdx(freshHistory.length - 1);
        }
        return freshHistory;
      });
    })();
  }, [debouncedSseSignal, initialDocument.id]);

  // snapshots[0] = definition, snapshots[i+1] = state after history[i]
  const snapshots = buildSnapshots(document.definition, history);

  const selectedEntry = selectedIdx >= 0 ? history[selectedIdx] : null;
  const selectedSnapshot = snapshots[selectedIdx + 1] ?? document.definition;
  const selectedChanges = (selectedEntry?.diff ?? []) as unknown as IChange[];

  return (
    <div style={docDetailLayout}>
      {/* ── Left: history sidebar ───────────────────────────────────────── */}
      <div style={historyPanel}>
        <p style={historyPanelTitle}>History</p>

        {history.length === 0 ? (
          <p style={{ margin: 0, padding: "1rem", color: colors.textMuted, fontSize: "0.85rem" }}>No history yet.</p>
        ) : (
          history.map((entry, idx) => {
            const active = idx === selectedIdx;
            const eventType = String((entry.event as Record<string, unknown>).type ?? "event")
              .split("/")
              .pop();
            return (
              <button key={entry.id} type="button" style={active ? historyItemActive : historyItemBase} onClick={() => setSelectedIdx(idx)}>
                <div style={{ fontWeight: 600, marginBottom: "0.15rem" }}>#{entry.seq}</div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: active ? colors.blue : colors.textMuted,
                    marginBottom: "0.1rem",
                  }}
                >
                  {new Date(entry.created_at).toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: colors.textMuted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {eventType}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ── Right: detail pane ──────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {selectedEntry === null ? (
          <p style={emptyState}>No history entries yet. Push a timeline entry to trigger processing.</p>
        ) : (
          <>
            {/* State snapshot */}
            <div style={detailSection}>
              <p style={detailSectionTitle}>State after #{selectedEntry.seq}</p>
              <pre style={stateViewer}>{dump(selectedSnapshot)}</pre>
            </div>

            {/* Triggering event */}
            <div style={detailSection}>
              <p style={detailSectionTitle}>Event</p>
              <pre style={stateViewer}>{dump(selectedEntry.event)}</pre>
            </div>

            {/* Diff log */}
            <div style={detailSection}>
              <p style={detailSectionTitle}>Changes</p>
              <DiffLog changes={selectedChanges} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
