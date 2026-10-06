import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users, twins, accounts, transactions, goals, scenarios } from "@/db/schema";
import { currentUser, loadAll, seedDemo, wipeUserData, destroySession } from "@/lib/server";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const data = await loadAll(user.id);
  return NextResponse.json({ exportedAt: new Date().toISOString(), user: { name: user.name, email: user.email }, ...data });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json();
  const action = String(body.action);
  if (action === "markAllRead") { await db.update(notifications).set({ read: true }).where(eq(notifications.userId, user.id)); return NextResponse.json({ ok: true }); }
  if (action === "settings") {
    const merged = { ...((user.settings ?? {}) as object), ...(body.settings ?? {}) };
    await db.update(users).set({ settings: merged, ...(body.name ? { name: String(body.name) } : {}) }).where(eq(users.id, user.id));
    return NextResponse.json({ ok: true, settings: merged });
  }
  if (action === "deleteTransactions") { await wipeUserData(user.id, "transactions"); return NextResponse.json({ ok: true }); }
  if (action === "deleteProfile") { await wipeUserData(user.id, "profile"); return NextResponse.json({ ok: true, next: "/onboarding" }); }
  if (action === "deleteAccount") { await wipeUserData(user.id, "all"); await destroySession(); return NextResponse.json({ ok: true, next: "/" }); }
  if (action === "resetDemo") { await wipeUserData(user.id, "profile"); await seedDemo(user.id, user.name); await db.update(users).set({ onboarded: true }).where(eq(users.id, user.id)); return NextResponse.json({ ok: true }); }
  if (action === "restore") {
    const d = body.data;
    if (!d?.twin) return NextResponse.json({ error: "This file doesn't look like a FinTwin backup." }, { status: 400 });
    await wipeUserData(user.id, "profile");
    await db.insert(twins).values({ userId: user.id, data: d.twin });
    const strip = (r: Record<string, unknown>) => { const { id: _i, createdAt: _c, updatedAt: _u, lastRunAt: _l, ...rest } = r; void _i; void _c; void _u; void _l; return { ...rest, userId: user.id }; };
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const idMap = new Map<number, number>();
    for (const a of d.accounts ?? []) { const [n] = await db.insert(accounts).values(strip(a) as any).returning(); idMap.set(a.id, n.id); }
    if (d.transactions?.length) await db.insert(transactions).values(d.transactions.map((t: any) => ({ ...strip(t), accountId: t.accountId ? idMap.get(t.accountId) ?? null : null })) as any);
    if (d.goals?.length) await db.insert(goals).values(d.goals.map((g: any) => ({ ...strip(g), accountId: null })) as any);
    if (d.scenarios?.length) await db.insert(scenarios).values(d.scenarios.map(strip) as any);
    await db.update(users).set({ onboarded: true }).where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
