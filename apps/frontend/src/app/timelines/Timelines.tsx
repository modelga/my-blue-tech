"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteTimeline, type Timeline } from "@/lib/api";
import {
  cardActionButton,
  cardCopyButton,
  cardDeleteButton,
  cardIdRow,
  cardIdText,
  cardMeta,
  dashCard,
  dashCardBody,
  dashCardTitle,
  dashGrid,
  emptyState,
} from "@/lib/styles";

function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={cardIdRow}>
      <span style={cardIdText} title={id}>{id}</span>
      <button type="button" style={cardCopyButton} onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

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
          <CopyIdButton id={t.id} />
          <p style={cardMeta}>{new Date(t.created_at).toLocaleDateString()}</p>
          <div>
            <a href={`/timelines/${t.id}`} style={cardActionButton}>Open</a>
            <button
              type="button"
              style={{ ...cardDeleteButton, opacity: deleting === t.id ? 0.5 : 1 }}
            disabled={deleting === t.id}
            onClick={() => handleDelete(t.id)}
          >
              {deleting === t.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
