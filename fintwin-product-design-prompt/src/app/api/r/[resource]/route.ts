import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, goals, scenarios } from "@/db/schema";
import { TABLES, pick, anyDb } from "@/lib/resources";
import { currentUser, iso, notify } from "@/lib/server";
import { fmtMoney, fmtPct } from "@/lib/model";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request, ctx: { params: Promise<{ resource: string }> }) {
  const { resource } = await ctx.params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const table = TABLES[resource];
  if (!table || resource === "notifications") return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  const body = await req.json();
  const items: Record<string, unknown>[] = Array.isArray(body) ? body : [body];
  if (items.length === 0) return NextResponse.json({ items: [] });
  const values: Record<string, any>[] = items.map((b) => ({ ...pick(resource, b), userId: user.id }));
  if (resource === "transactions") {
    for (const v of values) {
      if (!v.description || v.amount === undefined || !v.date) return NextResponse.json({ error: "Description, amount and date are required." }, { status: 400 });
      v.amount = Number(v.amount);
    }
  }
  const rows: any[] = await anyDb.insert(table).values(values).returning();

  if (resource === "transactions") {
    const byAcc = new Map<number, number>();
    for (const r of rows) if (r.accountId) byAcc.set(r.accountId, (byAcc.get(r.accountId) ?? 0) + r.amount);
    for (const [id, delta] of byAcc) await db.update(accounts).set({ balance: sql`${accounts.balance} + ${delta}`, updatedAt: new Date() }).where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
    if (rows.length > 1) await notify(user.id, "system", "Import completed", `${rows.length} transactions were added to your Twin.`);
  }
  if (resource === "simulations") {
    const s = rows[0];
    const k = s.result?.kpis ?? {};
    const summary = `Median ${fmtMoney(k.medianNetWorth ?? 0, "EGP", { compact: true })}${k.goalProbability != null ? ` · goal ${fmtPct(k.goalProbability, 0)}` : ""}`;
    if (s.scenarioId) await db.update(scenarios).set({ lastRunAt: new Date(), lastSummary: summary }).where(and(eq(scenarios.id, s.scenarioId), eq(scenarios.userId, user.id)));
    if (s.goalId && k.goalProbability != null) await db.update(goals).set({ probability: k.goalProbability }).where(and(eq(goals.id, s.goalId), eq(goals.userId, user.id)));
    await notify(user.id, "simulation", `Simulation finished — ${s.scenarioName}`, `${s.paths} futures · ${summary}`);
  }
  if (resource === "goals" && rows.length === 1) await notify(user.id, "goals", `New goal: ${rows[0].name}`, `Target ${fmtMoney(rows[0].target)}.`);
  const accts = resource === "transactions" ? (await db.select().from(accounts).where(eq(accounts.userId, user.id))).map((a) => iso(a)) : undefined;
  return NextResponse.json({ items: rows.map((r) => { const { userId: _u, ...rest } = r; void _u; return iso(rest); }), accounts: accts });
}
