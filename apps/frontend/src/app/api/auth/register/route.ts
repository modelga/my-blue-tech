import { type NextRequest, NextResponse } from "next/server";
import { stmtFindByUserName, stmtInsertUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = stmtFindByUserName().get(username.trim());
  if (existing) {
    return NextResponse.json({ error: "Username already taken." }, { status: 409 });
  }

  const hash = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 12,
  });

  stmtInsertUser().run(username.trim(), hash);

  return NextResponse.json({ ok: true }, { status: 201 });
}
