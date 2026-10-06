"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Mail, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "./store";
import { Button, Checkbox, Field, Logo, TextInput } from "./ui";
import { EASE } from "./motion";

export type AuthMode = "signup" | "login" | "forgot" | "reset" | "verify";

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" /></svg>;
}

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false); const [token, setToken] = useState("");
  useEffect(() => { const q = new URLSearchParams(window.location.search); if (q.get("email")) setEmail(q.get("email")!); if (q.get("token")) setToken(q.get("token")!); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const r = await api<{ next?: string }>(`/api/auth/${mode}`, "POST", { name, email, password, remember, token });
      if (mode === "forgot" || mode === "reset") setSent(true); else if (r.next) { router.push(r.next); router.refresh(); }
    } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(false); }
  };
  const demo = async () => { setBusy(true); try { const r = await api<{ next: string }>("/api/auth/demo", "POST"); router.push(r.next); router.refresh(); } catch (e) { setErr((e as Error).message); setBusy(false); } };
  const google = async () => { setErr(null); try { await api("/api/auth/google", "POST"); } catch (e) { setErr((e as Error).message); } };
  const verify = async () => { setBusy(true); try { const r = await api<{ next: string }>("/api/auth/verify", "POST"); setSent(true); setTimeout(() => { router.push(r.next); router.refresh(); }, 1100); } catch (e) { setErr((e as Error).message); setBusy(false); } };

  const titles: Record<AuthMode, [string, string]> = {
    signup: ["Create your account", "Start building your Financial Twin."],
    login: ["Welcome back", "Your Twin has been waiting."],
    forgot: ["Reset your password", "We'll email you a secure reset link."],
    reset: ["Choose a new password", "Use at least 8 characters."],
    verify: ["Verify your email", "One last step before building your Twin."],
  };
  return (
    <div className="glow-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8"><Logo animated /></Link>
      <motion.div layoutId="auth-card" className="w-full max-w-[420px] rounded-[28px] border border-line bg-canvas p-7 shadow-lift md:p-8" transition={{ duration: 0.4, ease: EASE }}>
        <AnimatePresence mode="wait">
          <motion.div key={mode + String(sent)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE }}>
            {(mode === "verify" || sent) ? (
              <div className="py-4 text-center">
                <div className="relative mx-auto mb-5 h-20 w-20">
                  <motion.div className="absolute inset-0 rounded-full bg-accentsoft" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: sent ? 0 : Infinity, duration: 2 }} />
                  <div className="absolute inset-2 grid place-items-center rounded-full bg-accent text-accentfg">
                    {sent ? <svg viewBox="0 0 24 24" className="h-8 w-8"><motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} /></svg> : <Mail className="h-7 w-7" strokeWidth={1.5} />}
                  </div>
                </div>
                <h1 className="text-[22px] font-bold tracking-tight">{mode === "forgot" ? "Check your inbox" : mode === "reset" ? "Password updated" : sent ? "Email verified" : titles.verify[0]}</h1>
                <p className="mt-2 text-[13px] text-muted">{mode === "forgot" ? "If an account exists for that email, a reset link is on its way. It expires in one hour." : mode === "reset" ? "You can now log in with your new password." : sent ? "Taking you to onboarding…" : "We'd normally send a verification link. Email delivery isn't configured in this preview, so you can confirm here."}</p>
                {mode === "verify" && !sent && <Button className="mt-6 w-full" size="lg" loading={busy} onClick={verify}>Confirm my email</Button>}
                {(mode === "forgot" || mode === "reset") && <Button className="mt-6 w-full" variant="secondary" href="/login" icon={<ArrowLeft className="h-4 w-4" />}>Back to login</Button>}
                {err && <p className="mt-3 text-[12.5px] text-neg">{err}</p>}
              </div>
            ) : (
              <>
                <h1 className="text-[24px] font-bold tracking-tight">{titles[mode][0]}</h1>
                <p className="mt-1 text-[13px] text-muted">{titles[mode][1]}</p>
                {(mode === "signup" || mode === "login") && <>
                  <Button type="button" variant="secondary" className="mt-6 w-full" size="lg" onClick={google} icon={<GoogleIcon />}>Continue with Google</Button>
                  <div className="my-5 flex items-center gap-3 text-[11px] text-faint"><span className="h-px flex-1 bg-line2" />or with email<span className="h-px flex-1 bg-line2" /></div>
                </>}
                <form onSubmit={submit} className={mode === "forgot" || mode === "reset" ? "mt-6 space-y-4" : "space-y-4"}>
                  {mode === "signup" && <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Layla Hassan" required /></Field>}
                  <Field label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required /></Field>
                  {mode !== "forgot" && <Field label={mode === "reset" ? "New password" : "Password"} hint={mode === "signup" ? "At least 8 characters." : undefined}><TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></Field>}
                  {mode === "login" && <div className="flex items-center justify-between"><Checkbox checked={remember} onChange={setRemember} label="Remember me" /><Link href="/forgot" className="text-[12.5px] font-semibold text-muted hover:text-fg">Forgot password?</Link></div>}
                  <AnimatePresence>{err && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-2xl bg-neg/8 px-3 py-2 text-[12.5px] text-neg">{err}</motion.p>}</AnimatePresence>
                  <Button type="submit" size="lg" className="w-full" loading={busy}>{{ signup: "Create account", login: "Log in", forgot: "Send reset link", reset: "Update password", verify: "" }[mode]}</Button>
                </form>
                {(mode === "signup" || mode === "login") && <button onClick={demo} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2 text-[12.5px] font-semibold text-muted hover:text-fg"><Play className="h-3.5 w-3.5" />Explore with a demo Twin instead</button>}
                <p className="mt-5 text-center text-[12.5px] text-muted">
                  {mode === "signup" ? <>Already have an account? <Link href="/login" className="font-bold text-fg">Log in</Link></> : mode === "login" ? <>New to FinTwin? <Link href="/signup" className="font-bold text-fg">Create an account</Link></> : <Link href="/login" className="font-bold text-fg">Back to login</Link>}
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <p className="mt-6 flex items-center gap-1.5 text-[11.5px] text-faint"><Check className="h-3 w-3" />Private by default · Educational, not financial advice</p>
    </div>
  );
}
