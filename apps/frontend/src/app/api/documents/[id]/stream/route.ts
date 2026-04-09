import { auth } from "@/auth";
import type { NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

/**
 * Proxies the upstream SSE stream from the API, adding the server-side
 * auth header so the browser can connect with a plain EventSource.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.name) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const upstream = await fetch(`${API_URL}/api/documents/${id}/stream`, {
    headers: {
      Authorization: `Bearer user ${session.user.name}`,
      Accept: "text/event-stream",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Failed to connect to upstream stream", { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
