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
