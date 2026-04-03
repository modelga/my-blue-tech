import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  console.log(session);
  const body = await req.json();
  const { name, document } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  if (!document || typeof document !== "object") {
    return NextResponse.json(
      { error: "Document payload is required." },
      { status: 400 },
    );
  }

  // TODO: forward to backend API once available
  // await fetch(`${process.env.API_URL}/documents`, { method: "POST", ... })

  console.log("[stub] Create document:", { name: name.trim(), document });

  return NextResponse.json(
    { ok: true, name: name.trim(), document },
    { status: 201 },
  );
}
