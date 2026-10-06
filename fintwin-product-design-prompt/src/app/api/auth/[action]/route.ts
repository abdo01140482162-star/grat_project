import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { randomBytes } from "crypto";
import { createSession, currentUser, destroySession, hashPassword, seedDemo, verifyPassword } from "@/lib/server";

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();

  if (action === "signup") {
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");
    if (!name) return err("Please tell us your name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return err("That email doesn't look quite right.");
    if (password.length < 8) return err("Use at least 8 characters for your password.");
    const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (exists[0]) return err("An account with this email already exists. Try logging in.");
    const [u] = await db.insert(users).values({ name, email, passwordHash: hashPassword(password) }).returning();
    await createSession(u.id);
    return NextResponse.json({ ok: true, next: "/verify" });
  }
  if (action === "login") {
    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!u || !verifyPassword(String(body.password ?? ""), u.passwordHash)) return err("Email or password is incorrect.", 401);
    await createSession(u.id, body.remember !== false);
    return NextResponse.json({ ok: true, next: u.onboarded ? "/app" : "/onboarding" });
  }
  if (action === "demo") {
    const demoEmail = `demo-${Date.now()}-${Math.floor(Math.random() * 1e4)}@fintwin.demo`;
    const [u] = await db.insert(users).values({ name: "Layla Hassan", email: demoEmail, passwordHash: hashPassword(Math.random().toString(36)), verified: true, onboarded: true }).returning();
    await seedDemo(u.id, "Layla Hassan");
    await createSession(u.id);
    return NextResponse.json({ ok: true, next: "/app" });
  }
  if (action === "google") {
    // OAuth is not configured in this environment — sign in with a sample verified profile instead.
    return err("Google sign-in isn't configured yet. Use email, or explore the demo Twin.", 501);
  }
  if (action === "verify") {
    const u = await currentUser();
    if (!u) return err("Please log in first.", 401);
    await db.update(users).set({ verified: true }).where(eq(users.id, u.id));
    return NextResponse.json({ ok: true, next: u.onboarded ? "/app" : "/onboarding" });
  }
  if (action === "forgot") {
    if (!/^\S+@\S+\.\S+$/.test(email)) return err("Enter the email you signed up with.");
    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (u) {
      const token = randomBytes(20).toString("hex");
      await db.update(users).set({ settings: { ...((u.settings ?? {}) as object), resetToken: token, resetExp: Date.now() + 3600_000 } }).where(eq(users.id, u.id));
      // No email provider is configured: the link is written to the server log, where a mailer would send it.
      console.log(`[FinTwin] Password reset link for ${email}: /reset?email=${encodeURIComponent(email)}&token=${token}`);
    }
    return NextResponse.json({ ok: true });
  }
  if (action === "reset") {
    const password = String(body.password ?? "");
    if (password.length < 8) return err("Use at least 8 characters.");
    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const s = (u?.settings ?? {}) as { resetToken?: string; resetExp?: number };
    if (!u || !body.token || s.resetToken !== body.token || (s.resetExp ?? 0) < Date.now()) return err("This reset link is invalid or has expired. Request a new one.");
    await db.update(users).set({ passwordHash: hashPassword(password), settings: { ...s, resetToken: null, resetExp: null } }).where(eq(users.id, u.id));
    return NextResponse.json({ ok: true });
  }
  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true, next: "/" });
  }
  if (action === "password") {
    const u = await currentUser();
    if (!u) return err("Please log in first.", 401);
    if (!verifyPassword(String(body.current ?? ""), u.passwordHash)) return err("Current password is incorrect.");
    if (String(body.password ?? "").length < 8) return err("Use at least 8 characters.");
    await db.update(users).set({ passwordHash: hashPassword(String(body.password)) }).where(eq(users.id, u.id));
    return NextResponse.json({ ok: true });
  }
  return err("Unknown action", 404);
}
