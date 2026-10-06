import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, goals, twins, users } from "@/db/schema";
import { currentUser, notify } from "@/lib/server";
import type { Twin } from "@/lib/model";

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { twin } = (await req.json()) as { twin: Twin };
  await db.insert(twins).values({ userId: user.id, data: twin }).onConflictDoUpdate({ target: twins.userId, set: { data: twin, updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

// Onboarding completion: persist twin, create accounts from savings and goals.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { twin, goals: gl } = (await req.json()) as { twin: Twin; goals: { name: string; kind: string; target: number; current: number; monthly: number; targetDate: string }[] };
  const cur = twin.profile.currency || "EGP";
  const liquidAssets = twin.assets.filter((a) => a.type === "Cash" || a.type === "Bank account");
  twin.assets = twin.assets.filter((a) => a.type !== "Cash" && a.type !== "Bank account");
  await db.insert(twins).values({ userId: user.id, data: twin }).onConflictDoUpdate({ target: twins.userId, set: { data: twin, updatedAt: new Date() } });
  const existing = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, user.id)).limit(1);
  if (!existing[0]) {
    const acc = [
      ...(twin.savings.cash > 0 ? [{ userId: user.id, name: "Main Bank", type: "Checking", balance: twin.savings.cash, currency: cur }] : []),
      ...(twin.savings.emergency > 0 ? [{ userId: user.id, name: "Emergency Savings", type: "Savings", balance: twin.savings.emergency, currency: cur }] : []),
      ...(twin.savings.otherLiquid > 0 ? [{ userId: user.id, name: "Other liquid", type: "Savings", balance: twin.savings.otherLiquid, currency: cur }] : []),
      ...liquidAssets.map((a) => ({ userId: user.id, name: a.name, type: a.type === "Cash" ? "Cash" : "Checking", balance: a.value, currency: cur })),
    ];
    if (acc.length) await db.insert(accounts).values(acc);
  }
  if (gl?.length) await db.insert(goals).values(gl.map((g) => ({ ...g, userId: user.id })));
  await db.update(users).set({ onboarded: true, name: twin.profile.name || user.name }).where(eq(users.id, user.id));
  await notify(user.id, "system", "Your Financial Twin is ready", "Explore a scenario to see possible futures.");
  return NextResponse.json({ ok: true });
}
