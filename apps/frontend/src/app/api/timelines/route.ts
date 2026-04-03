import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json();
  const { id, name, description } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  // TODO: forward to backend API once available
  // await fetch(`${process.env.API_URL}/timelines`, { method: "POST", ... })

  console.log("[stub] Create timeline:", { id, name: name.trim(), description });

  return NextResponse.json(
    { ok: true, id, name: name.trim(), description },
    { status: 201 },
  );
}
