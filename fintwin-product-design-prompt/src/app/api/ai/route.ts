import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiMessages } from "@/db/schema";
import { currentUser, iso, loadAll } from "@/lib/server";
import { analyze } from "@/lib/ai";
import type { Account, Goal, Transaction } from "@/lib/model";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const rows = await db.select().from(aiMessages).where(eq(aiMessages.userId, user.id)).orderBy(asc(aiMessages.id));
  return NextResponse.json({ messages: rows.map((r) => iso(r)) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { question } = await req.json();
  if (!question || typeof question !== "string") return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  const settings = (user.settings ?? {}) as Record<string, unknown>;
  if (settings.aiEnabled === false) return NextResponse.json({ error: "AI analysis is turned off in Settings." }, { status: 403 });
  try {
    const data = await loadAll(user.id);
    const payload = await analyze({ question, twin: data.twin, accounts: data.accounts as unknown as Account[], goals: data.goals as unknown as Goal[], transactions: data.transactions as unknown as Transaction[] });
    const [u] = await db.insert(aiMessages).values({ userId: user.id, role: "user", content: question }).returning();
    const [a] = await db.insert(aiMessages).values({ userId: user.id, role: "assistant", content: payload.text, payload }).returning();
    return NextResponse.json({ user: iso(u), assistant: iso(a) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI analysis is temporarily unavailable. Your data is safe — try again in a moment." }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await db.delete(aiMessages).where(eq(aiMessages.userId, user.id));
  return NextResponse.json({ ok: true });
}
