import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions, twins, accounts, transactions, goals, scenarios, simulations, reports, notifications, aiMessages } from "@/db/schema";
import { type Twin, defaultTwin, emptyChanges, SCENARIO_TEMPLATES, demoTwin } from "./model";

const COOKIE = "fintwin_session";

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex"), b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createSession(userId: number, remember = true) {
  const id = randomBytes(24).toString("hex");
  await db.insert(sessions).values({ id, userId });
  const jar = await cookies();
  jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: remember ? 60 * 60 * 24 * 30 : undefined });
}
export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  jar.delete(COOKIE);
}
export async function currentUser() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  const s = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!s[0]) return null;
  const u = await db.select().from(users).where(eq(users.id, s[0].userId)).limit(1);
  return u[0] ?? null;
}

export function iso<T extends Record<string, unknown>>(row: T): T {
  const o: Record<string, unknown> = { ...row };
  for (const k of Object.keys(o)) if (o[k] instanceof Date) o[k] = (o[k] as Date).toISOString();
  return o as T;
}

export async function loadAll(userId: number) {
  const [tw, acc, tx, gl, sc, sm, rp, nt] = await Promise.all([
    db.select().from(twins).where(eq(twins.userId, userId)).limit(1),
    db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(accounts.id),
    db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.date), desc(transactions.id)),
    db.select().from(goals).where(eq(goals.userId, userId)).orderBy(goals.id),
    db.select().from(scenarios).where(eq(scenarios.userId, userId)).orderBy(desc(scenarios.id)),
    db.select().from(simulations).where(eq(simulations.userId, userId)).orderBy(desc(simulations.id)),
    db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.id)),
    db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.id)),
  ]);
  const strip = <T extends { userId?: number }>(r: T) => { const { userId: _u, ...rest } = r; void _u; return iso(rest as Record<string, unknown>); };
  return {
    twin: (tw[0]?.data as Twin) ?? defaultTwin(),
    accounts: acc.map(strip), transactions: tx.map(strip), goals: gl.map(strip), scenarios: sc.map(strip),
    simulations: sm.map(strip), reports: rp.map(strip), notifications: nt.map(strip),
  };
}

export async function notify(userId: number, type: string, title: string, body = "") {
  await db.insert(notifications).values({ userId, type, title, body });
}

export async function wipeUserData(userId: number, scope: "transactions" | "profile" | "all") {
  await db.delete(transactions).where(eq(transactions.userId, userId));
  if (scope === "transactions") return;
  for (const t of [accounts, goals, scenarios, simulations, reports, notifications, aiMessages]) await db.delete(t).where(eq(t.userId, userId));
  await db.delete(twins).where(eq(twins.userId, userId));
  await db.update(users).set({ onboarded: false }).where(eq(users.id, userId));
  if (scope === "all") {
    await db.delete(sessions).where(eq(sessions.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
}

export async function seedDemo(userId: number, name: string, twin?: Twin, withHistory = true) {
  const tw = twin ?? demoTwin(name);
  await db.insert(twins).values({ userId, data: tw }).onConflictDoUpdate({ target: twins.userId, set: { data: tw, updatedAt: new Date() } });
  if (!withHistory) return;
  const acc = await db.insert(accounts).values([
    { userId, name: "Main Bank", type: "Checking", balance: 38200, currency: "EGP" },
    { userId, name: "Emergency Savings", type: "Savings", balance: 47300, currency: "EGP" },
    { userId, name: "Credit Card", type: "Credit Card", balance: -8500, currency: "EGP" },
  ]).returning();
  const [main, , cc] = acc;
  const tx: (typeof transactions.$inferInsert)[] = [];
  const now = new Date();
  for (let mo = 3; mo >= 0; mo--) {
    const d = (day: number) => { const x = new Date(now.getFullYear(), now.getMonth() - mo, day); return x > now ? null : x.toISOString().slice(0, 10); };
    const push = (day: number, description: string, category: string, kind: string, amount: number, accountId = main.id) => { const dt = d(day); if (dt) tx.push({ userId, accountId, description, category, kind, amount, date: dt }); };
    const drift = 1 + (3 - mo) * 0.04;
    push(1, "Salary — Nile Systems", "Salary", "income", 28000);
    push(2, "Rent — Maadi apartment", "Housing", "expense", -7000);
    push(4, "Carrefour groceries", "Food", "expense", -Math.round(1650 * drift));
    push(6, "Car loan installment", "Debt", "expense", -1600);
    push(7, "Electricity & water", "Utilities", "expense", -Math.round(720 * drift));
    push(9, "Uber rides", "Transportation", "expense", -Math.round(640 * drift), cc.id);
    push(11, "Freelance design project", "Freelance", "income", mo % 2 === 0 ? 5200 : 2800);
    push(12, "Talabat orders", "Food", "expense", -Math.round(980 * drift), cc.id);
    push(14, "Transfer to Emergency Savings", "Transfer", "transfer", -3000);
    push(15, "Family support", "Family", "expense", -1500);
    push(17, "Fuel — TotalEnergies", "Transportation", "expense", -Math.round(900 * drift));
    push(19, "Cinema & dinner", "Entertainment", "expense", -Math.round(780 * drift), cc.id);
    push(21, "Pharmacy", "Healthcare", "expense", -420);
    push(23, "Zara", "Shopping", "expense", -Math.round(1150 * drift), cc.id);
    push(25, "Netflix & Spotify", "Subscriptions", "expense", -380, cc.id);
    push(27, "Weekend groceries", "Food", "expense", -Math.round(1200 * drift));
  }
  if (tx.length) await db.insert(transactions).values(tx);
  const year = now.getFullYear();
  await db.insert(goals).values([
    { userId, name: "Buy a Home", kind: "Buy a Home", target: 1500000, current: 210000, monthly: 6500, targetDate: `${year + 5}-06-01` },
    { userId, name: "Emergency Fund", kind: "Emergency Fund", target: 128000, current: 47300, monthly: 3000, targetDate: `${year + 2}-01-01`, accountId: acc[1].id },
    { userId, name: "Japan Trip", kind: "Travel", target: 60000, current: 22000, monthly: 1500, targetDate: `${year + 1}-10-01` },
  ]);
  const pick = ["Lose My Job", "Save 15% More", "Buy a Home", "High Inflation"];
  await db.insert(scenarios).values(pick.map((n) => {
    const tpl = SCENARIO_TEMPLATES.find((x) => x.name === n)!;
    return { userId, name: tpl.name, category: tpl.category, description: tpl.description, changes: { ...emptyChanges(), ...tpl.changes } };
  }));
  await notify(userId, "financial", "Food spending is up 12%", "Compared with your three-month average.");
  await notify(userId, "goals", "Emergency Fund passed 35%", "EGP 47,300 of EGP 128,000.");
  await notify(userId, "system", "Your Financial Twin is ready", "Explore a scenario to see possible futures.");
}

export async function ownedBy(table: typeof accounts | typeof goals, id: number, userId: number) {
  const r = await db.select().from(table).where(and(eq(table.id, id), eq(table.userId, userId))).limit(1);
  return r[0] ?? null;
}
