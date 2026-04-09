"use server";

import { auth } from "@/auth";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Unauthenticated");

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer user ${session.user.name}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Timelines ─────────────────────────────────────────────────────────────────

export interface Timeline {
  id: string;
  owner: string;
  name: string;
  description: string;
  created_at: string;
}

export async function getTimelines(): Promise<Timeline[]> {
  const data = await apiRequest<{ timelines: Timeline[] }>("/api/timelines");
  return data.timelines;
}

export async function deleteTimeline(id: string): Promise<void> {
  await apiRequest(`/api/timelines/${id}`, { method: "DELETE" });
}

export async function getTimeline(id: string): Promise<Timeline> {
  return apiRequest<Timeline>(`/api/timelines/${id}`);
}

// ── Documents ─────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  owner: string;
  name: string;
  created_at: string;
  changes_count: number;
}

export interface DocumentDetail extends Document {
  definition: Record<string, unknown>;
  state: Record<string, unknown> | null;
  initialized: boolean;
  updated_at: string;
}

export interface DocumentHistoryEntry {
  id: number;
  document_id: string;
  seq: number;
  event: Record<string, unknown>;
  diff: Record<string, unknown>[] | null;
  created_at: string;
}

export async function getDocuments(): Promise<Document[]> {
  const data = await apiRequest<{ documents: Document[] }>("/api/documents");
  return data.documents;
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  return apiRequest<DocumentDetail>(`/api/documents/${id}`);
}

export async function getDocumentHistory(id: string): Promise<DocumentHistoryEntry[]> {
  const data = await apiRequest<{ documentId: string; history: DocumentHistoryEntry[] }>(`/api/documents/${id}/history`);
  return data.history;
}

// ── Timeline Entries ──────────────────────────────────────────────────────────

export interface TimelineEntry {
  id: string;
  timeline_id: string;
  seq: number;
  payload: Record<string, unknown>;
  created_at: string;
}

export async function getTimelineEntries(timelineId: string): Promise<TimelineEntry[]> {
  const data = await apiRequest<{ timelineId: string; entries: TimelineEntry[] }>(`/api/timelines/${timelineId}/entries`);
  return data.entries;
}

export async function pushTimelineEntry(timelineId: string, payload: Record<string, unknown>): Promise<TimelineEntry> {
  return apiRequest<TimelineEntry>(`/api/timelines/${timelineId}/entries`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
