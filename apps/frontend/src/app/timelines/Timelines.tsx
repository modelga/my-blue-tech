"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteTimeline, type Timeline } from "@/lib/api";
import {
  colors,
  dashCard,
  dashCardBody,
  dashCardTitle,
  dashGrid,
  emptyState,
} from "@/lib/styles";

const deleteButton: React.CSSProperties = {
  marginTop: "0.75rem",
  padding: "0.25rem 0.75rem",
  fontSize: "0.8rem",
  color: colors.errorText,
  background: "transparent",
  border: `1px solid ${colors.errorBorder}`,
  borderRadius: 6,
  cursor: "pointer",
};

export function TimelineList({
  timelines: initial,
}: {
  timelines: Timeline[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteTimeline(id);
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  if (initial.length === 0) {
    return (
      <p style={emptyState}>
        No timelines yet. Create one to start adding entries.
      </p>
    );
  }

  return (
    <div style={dashGrid}>
      {initial.map((t) => (
        <div key={t.id} style={dashCard}>
          <p style={dashCardTitle}>{t.name}</p>
          {t.description && <p style={dashCardBody}>{t.description}</p>}
          <p
            style={{
              ...dashCardBody,
              marginTop: "0.75rem",
              color: colors.textMuted,
              fontSize: "0.8rem",
            }}
          >
            {new Date(t.created_at).toLocaleDateString()}
          </p>
          <button
            type="button"
            style={{ ...deleteButton, opacity: deleting === t.id ? 0.5 : 1 }}
            disabled={deleting === t.id}
            onClick={() => handleDelete(t.id)}
          >
            {deleting === t.id ? "Deleting…" : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}
