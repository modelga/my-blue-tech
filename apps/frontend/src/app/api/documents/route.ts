import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json();
  const { name, definition } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  if (!definition || typeof definition !== "object") {
    return NextResponse.json({ error: "Document payload is required." }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/api/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer user ${session.user.name}`,
    },
    body: JSON.stringify({ name: name.trim(), definition }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
