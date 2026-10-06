import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { currentUser, iso } from "@/lib/server";
import { TABLES, pick, anyDb } from "@/lib/resources";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ctx = { params: Promise<{ resource: string; id: string }> };

async function adjust(userId: number, accountId: number | null, delta: number) {
  if (!accountId || !delta) return;
  await db.update(accounts).set({ balance: sql`${accounts.balance} + ${delta}`, updatedAt: new Date() }).where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { resource, id } = await ctx.params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const table = TABLES[resource];
  if (!table) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  const body = await req.json();
  const where = and(eq(table.id, Number(id)), eq(table.userId, user.id));
  if (resource === "transactions") {
    const [old] = await db.select().from(transactions).where(and(eq(transactions.id, Number(id)), eq(transactions.userId, user.id)));
    if (old) await adjust(user.id, old.accountId, -old.amount);
  }
  const vals = pick(resource, body);
  if (resource === "accounts") (vals as any).updatedAt = new Date();
  const rows: any[] = await anyDb.update(table).set(vals).where(where).returning();
  if (resource === "transactions" && rows[0]) await adjust(user.id, rows[0].accountId, rows[0].amount);
  const accts = resource === "transactions" ? (await db.select().from(accounts).where(eq(accounts.userId, user.id))).map((a) => iso(a)) : undefined;
  return NextResponse.json({ item: rows[0] ? iso(rows[0]) : null, accounts: accts });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { resource, id } = await ctx.params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const table = TABLES[resource];
  if (!table) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  const rows: any[] = await anyDb.delete(table).where(and(eq(table.id, Number(id)), eq(table.userId, user.id))).returning();
  if (resource === "transactions" && rows[0]) await adjust(user.id, rows[0].accountId, -rows[0].amount);
  if (resource === "accounts" && rows[0]) await db.update(transactions).set({ accountId: null }).where(and(eq(transactions.accountId, rows[0].id), eq(transactions.userId, user.id)));
  const accts = resource === "transactions" ? (await db.select().from(accounts).where(eq(accounts.userId, user.id))).map((a) => iso(a)) : undefined;
  return NextResponse.json({ ok: true, accounts: accts });
}
