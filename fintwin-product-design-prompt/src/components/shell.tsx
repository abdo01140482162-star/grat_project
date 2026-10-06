"use client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, BarChart3, Boxes, Brain, Cog, FileText, FlaskConical, Globe2, Home, Layers, LayoutGrid, LogOut, Menu, Moon, Search, Sun, Target, User, Wallet,
  ArrowLeftRight, HeartPulse, GitCompare, Plus, Play, Sparkles, Command, CornerDownLeft, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { fmtMoney } from "@/lib/model";
import { api, useStore } from "./store";
import { ComposerProvider, useComposer } from "./domain";
import { PageTransition, SPRING } from "./motion";
import { Avatar, IconButton, Logo, cx } from "./ui";

const ic = { strokeWidth: 1.5, className: "h-[17px] w-[17px]" };
export const NAV: { group: string; items: { href: string; label: string; icon: ReactNode }[] }[] = [
  { group: "Financial life", items: [
    { href: "/app", label: "Overview", icon: <LayoutGrid {...ic} /> },
    { href: "/app/twin", label: "Financial Twin", icon: <Layers {...ic} /> },
    { href: "/app/accounts", label: "Accounts", icon: <Wallet {...ic} /> },
    { href: "/app/transactions", label: "Transactions", icon: <ArrowLeftRight {...ic} /> },
    { href: "/app/goals", label: "Goals", icon: <Target {...ic} /> },
  ] },
  { group: "Simulation lab", items: [
    { href: "/app/scenarios", label: "Scenarios", icon: <Boxes {...ic} /> },
    { href: "/app/simulations", label: "Simulations", icon: <FlaskConical {...ic} /> },
    { href: "/app/compare", label: "Compare", icon: <GitCompare {...ic} /> },
  ] },
  { group: "Intelligence", items: [
    { href: "/app/ai", label: "AI Intelligence", icon: <Brain {...ic} /> },
    { href: "/app/analytics", label: "Analytics", icon: <BarChart3 {...ic} /> },
    { href: "/app/health", label: "Financial Health", icon: <HeartPulse {...ic} /> },
  ] },
  { group: "Economic data", items: [{ href: "/app/economy", label: "Economic Environment", icon: <Globe2 {...ic} /> }] },
  { group: "Reports", items: [{ href: "/app/reports", label: "Reports", icon: <FileText {...ic} /> }] },
  { group: "Account", items: [
    { href: "/app/profile", label: "Profile", icon: <User {...ic} /> },
    { href: "/app/notifications", label: "Notifications", icon: <Bell {...ic} /> },
    { href: "/app/settings", label: "Settings", icon: <Cog {...ic} /> },
  ] },
];
const ALL = NAV.flatMap((g) => g.items);
function activeHref(path: string) {
  return ALL.map((i) => i.href).filter((h) => (h === "/app" ? path === "/app" : path.startsWith(h))).sort((a, b) => b.length - a.length)[0];
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => { setTheme((document.documentElement.dataset.theme as "light" | "dark") || "light"); }, []);
  const toggle = () => { const t = theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; localStorage.setItem("fintwin-theme", t); setTheme(t); };
  return { theme, toggle };
}

export function AppShell({ children }: { children: ReactNode }) {
  return <ComposerProvider><ShellInner>{children}</ShellInner></ComposerProvider>;
}

function ShellInner({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, notifications, twin, saveTwin, currency } = useStore();
  const { theme, toggle } = useTheme();
  const [palette, setPalette] = useState(false);
  const [more, setMore] = useState(false);
  const active = activeHref(path);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => { setMore(false); }, [path]);
  const logout = async () => { await api("/api/auth/logout", "POST"); router.push("/"); };
  const title = ALL.find((i) => i.href === active)?.label ?? "FinTwin";

  return (
    <div className="glow-bg min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-canvas/80 px-4 pb-4 pt-5 backdrop-blur-xl lg:flex">
        <Link href="/app" className="mb-6 px-2"><Logo /></Link>
        <nav className="no-scrollbar -mx-1 flex-1 space-y-5 overflow-y-auto px-1" aria-label="Main">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="label mb-1.5 px-3 !text-[9.5px]">{g.group}</div>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const on = active === it.href;
                  return (
                    <li key={it.href}>
                      <Link href={it.href} aria-current={on ? "page" : undefined} className={cx("relative flex h-9 items-center gap-3 rounded-full px-3 text-[13px] font-semibold transition-colors", on ? "text-btnfg" : "text-muted hover:text-fg")}>
                        {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-btn shadow-soft" transition={SPRING} />}
                        <span className="relative z-10 flex items-center gap-3">{it.icon}{it.label}</span>
                        {it.href === "/app/notifications" && unread > 0 && <motion.span key={unread} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={SPRING} className="relative z-10 ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10.5px] font-bold text-accentfg">{unread}</motion.span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mt-4 space-y-2 border-t border-line pt-4">
          <div className="flex items-center gap-1.5">
            <button onClick={toggle} className="press flex h-9 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-card text-[12px] font-semibold" aria-label="Toggle theme">{theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}{theme === "dark" ? "Light" : "Dark"}</button>
            <select aria-label="Currency" value={currency} onChange={(e) => saveTwin({ ...twin, profile: { ...twin.profile, currency: e.target.value } })} className="h-9 flex-1 cursor-pointer appearance-none rounded-full border border-line bg-card px-3 text-center text-[12px] font-semibold outline-none">
              {["EGP", "USD", "EUR", "GBP", "SAR", "AED"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2.5 rounded-full p-1">
            <Link href="/app/profile" className="flex min-w-0 flex-1 items-center gap-2.5"><Avatar name={user.name} size={34} tone="accent" /><div className="min-w-0"><div className="truncate text-[12.5px] font-bold">{user.name}</div><div className="truncate text-[11px] text-muted">{user.email}</div></div></Link>
            <IconButton label="Log out" onClick={logout}><LogOut className="h-4 w-4" strokeWidth={1.5} /></IconButton>
          </div>
        </div>
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl lg:ml-[248px]">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 md:px-8">
          <Link href="/app" className="lg:hidden"><Logo label={false} /></Link>
          <div className="hidden text-[13px] font-semibold text-muted md:block lg:hidden">{title}</div>
          <button onClick={() => setPalette(true)} className="press ml-auto flex h-10 w-full max-w-[380px] items-center gap-2.5 rounded-full border border-line bg-card px-4 text-[13px] text-muted transition hover:bg-card2 lg:ml-0" aria-label="Search and commands">
            <Search className="h-4 w-4" strokeWidth={1.5} /><span className="flex-1 truncate text-left">Search or run a command…</span><kbd className="hidden rounded-md border border-line bg-card2 px-1.5 py-0.5 text-[10.5px] font-semibold md:inline">Ctrl K</kbd>
          </button>
          <div className="flex items-center gap-1 lg:ml-auto">
            <Link href="/app/simulations" className="press hidden h-10 items-center gap-2 rounded-full bg-btn px-4 text-[12.5px] font-semibold text-btnfg md:flex"><Play className="h-3.5 w-3.5" strokeWidth={1.8} />Run simulation</Link>
            <Link href="/app/notifications" aria-label={`Notifications, ${unread} unread`} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-card2">
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
              <AnimatePresence>{unread > 0 && <motion.span key={unread} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING} className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9.5px] font-bold text-accentfg">{unread}</motion.span>}</AnimatePresence>
            </Link>
            <IconButton label="Toggle theme" onClick={toggle} className="lg:hidden">{theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}</IconButton>
          </div>
        </div>
      </header>

      <main className="lg:ml-[248px]">
        <div className="mx-auto max-w-[1320px] px-4 pb-28 pt-6 md:px-8 md:pt-8 lg:pb-12">
          <PageTransition id={path}>{children}</PageTransition>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-full border border-line bg-canvas/90 p-1.5 shadow-lift backdrop-blur-xl lg:hidden" aria-label="Mobile">
        {[{ href: "/app", label: "Home", icon: <Home {...ic} /> }, { href: "/app/twin", label: "Twin", icon: <Layers {...ic} /> }, { href: "/app/scenarios", label: "Scenarios", icon: <Boxes {...ic} /> }, { href: "/app/goals", label: "Goals", icon: <Target {...ic} /> }, { href: "/app/ai", label: "AI", icon: <Brain {...ic} /> }].map((it) => {
          const on = active === it.href;
          return (
            <Link key={it.href} href={it.href} className={cx("relative flex h-11 flex-1 flex-col items-center justify-center rounded-full text-[10px] font-semibold", on ? "text-btnfg" : "text-muted")}>
              {on && <motion.span layoutId="mnav-pill" className="absolute inset-0 rounded-full bg-btn" transition={SPRING} />}
              <span className="relative z-10 flex flex-col items-center gap-0.5">{it.icon}{it.label}</span>
            </Link>
          );
        })}
        <button onClick={() => setMore(true)} className="flex h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted"><Menu {...ic} />More</button>
      </nav>
      <AnimatePresence>
        {more && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)} />
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-x-0 bottom-0 rounded-t-[28px] border-t border-line bg-canvas p-5 pb-8">
              <div className="mb-4 flex items-center justify-between"><span className="text-[16px] font-bold">More</span><IconButton label="Close" onClick={() => setMore(false)}><X className="h-4 w-4" /></IconButton></div>
              <div className="grid grid-cols-3 gap-2">
                {ALL.filter((i) => !["/app", "/app/twin", "/app/scenarios", "/app/goals", "/app/ai"].includes(i.href)).map((it) => (
                  <Link key={it.href} href={it.href} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card p-3 text-center text-[11.5px] font-semibold">{it.icon}{it.label}</Link>
                ))}
                <button onClick={logout} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card p-3 text-[11.5px] font-semibold"><LogOut {...ic} />Log out</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <CommandPalette open={palette} onClose={() => setPalette(false)} toggleTheme={toggle} />
    </div>
  );
}

/* ---------------- Command palette + global search ---------------- */
type Cmd = { id: string; group: string; label: string; hint?: string; icon: ReactNode; run: () => void };
function CommandPalette({ open, onClose, toggleTheme }: { open: boolean; onClose: () => void; toggleTheme: () => void }) {
  const router = useRouter();
  const compose = useComposer();
  const { accounts, transactions, goals, scenarios, simulations, reports, currency } = useStore();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  const go = (href: string) => () => { router.push(href); onClose(); };
  const s = { strokeWidth: 1.5, className: "h-4 w-4" };
  const items = useMemo<Cmd[]>(() => {
    const cmds: Cmd[] = [
      { id: "c1", group: "Commands", label: "Add account", icon: <Plus {...s} />, run: () => { onClose(); compose("account"); } },
      { id: "c2", group: "Commands", label: "Add transaction", icon: <Plus {...s} />, run: () => { onClose(); compose("transaction"); } },
      { id: "c3", group: "Commands", label: "Add goal", icon: <Target {...s} />, run: () => { onClose(); compose("goal"); } },
      { id: "c4", group: "Commands", label: "Create scenario", icon: <Boxes {...s} />, run: go("/app/scenarios?new=1") },
      { id: "c5", group: "Commands", label: "Run simulation", icon: <Play {...s} />, run: go("/app/simulations") },
      { id: "c6", group: "Commands", label: "Ask AI", icon: <Sparkles {...s} />, run: go("/app/ai") },
      { id: "c7", group: "Commands", label: "Create report", icon: <FileText {...s} />, run: go("/app/reports?new=1") },
      { id: "c8", group: "Commands", label: "View analytics", icon: <BarChart3 {...s} />, run: go("/app/analytics") },
      { id: "c9", group: "Commands", label: "Open economic environment", icon: <Globe2 {...s} />, run: go("/app/economy") },
      { id: "c10", group: "Commands", label: "Open Financial Twin", icon: <Layers {...s} />, run: go("/app/twin") },
      { id: "c11", group: "Commands", label: "Toggle theme", icon: <Moon {...s} />, run: () => { toggleTheme(); onClose(); } },
    ];
    const data: Cmd[] = [
      ...accounts.map((a) => ({ id: `a${a.id}`, group: "Accounts", label: a.name, hint: fmtMoney(a.balance, a.currency), icon: <Wallet {...s} />, run: go(`/app/accounts/${a.id}`) })),
      ...goals.map((g) => ({ id: `g${g.id}`, group: "Goals", label: g.name, hint: fmtMoney(g.target, currency, { compact: true }), icon: <Target {...s} />, run: go(`/app/goals/${g.id}`) })),
      ...scenarios.map((x) => ({ id: `s${x.id}`, group: "Scenarios", label: x.name, hint: x.category, icon: <Boxes {...s} />, run: go(`/app/simulations?scenario=${x.id}`) })),
      ...simulations.slice(0, 20).map((x) => ({ id: `m${x.id}`, group: "Simulations", label: x.scenarioName, hint: `${x.paths} paths`, icon: <FlaskConical {...s} />, run: go(`/app/simulations/${x.id}`) })),
      ...reports.map((r) => ({ id: `r${r.id}`, group: "Reports", label: r.title, hint: r.type, icon: <FileText {...s} />, run: go(`/app/reports/${r.id}`) })),
      ...transactions.slice(0, 200).map((t) => ({ id: `t${t.id}`, group: "Transactions", label: t.description, hint: fmtMoney(t.amount, currency, { sign: true }), icon: <ArrowLeftRight {...s} />, run: go(`/app/transactions?q=${encodeURIComponent(t.description)}`) })),
      ...ALL.map((p) => ({ id: `p${p.href}`, group: "Pages", label: p.label, icon: p.icon, run: go(p.href) })),
      { id: "ai-hist", group: "AI conversations", label: "Open AI conversation history", icon: <Brain {...s} />, run: go("/app/ai") },
    ];
    const t = q.trim().toLowerCase();
    if (!t) return [...cmds, ...ALL.slice(0, 6).map((p) => ({ id: `p${p.href}`, group: "Pages", label: p.label, icon: p.icon, run: go(p.href) }))];
    return [...cmds, ...data].filter((c) => c.label.toLowerCase().includes(t) || c.group.toLowerCase().includes(t)).slice(0, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, accounts, goals, scenarios, simulations, reports, transactions]);
  const groups = useMemo(() => { const m = new Map<string, Cmd[]>(); items.forEach((c) => m.set(c.group, [...(m.get(c.group) ?? []), c])); return [...m.entries()]; }, [items]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    if (e.key === "Enter") items[idx]?.run();
    if (e.key === "Escape") onClose();
  };
  let n = -1;
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
          <motion.div className="absolute inset-0 bg-black/25 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[620px] overflow-hidden rounded-[26px] border border-line bg-canvas shadow-lift">
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Command className="h-4 w-4 text-muted" strokeWidth={1.5} />
              <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} onKeyDown={onKey} placeholder="Search accounts, goals, scenarios… or type a command" className="h-14 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-faint" aria-label="Search" />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10.5px] text-muted">Esc</kbd>
            </div>
            <div className="max-h-[56vh] overflow-y-auto p-2">
              {items.length === 0 && <div className="p-8 text-center text-[13px] text-muted">Nothing matches “{q}”.</div>}
              {groups.map(([g, list], gi) => (
                <motion.div key={g} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.04 }}>
                  <div className="label px-3 pb-1 pt-3 !text-[9.5px]">{g}</div>
                  {list.map((c) => { n++; const i = n; return (
                    <button key={c.id} onMouseEnter={() => setIdx(i)} onClick={c.run} className={cx("relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-semibold", idx === i ? "text-btnfg" : "")}>
                      {idx === i && <motion.span layoutId="cmd-pill" className="absolute inset-0 rounded-2xl bg-btn" transition={SPRING} />}
                      <span className="relative z-10 flex flex-1 items-center gap-3">{c.icon}<span className="flex-1 truncate">{c.label}</span>{c.hint && <span className={cx("num text-[11.5px] font-medium", idx === i ? "text-btnfg/70" : "text-muted")}>{c.hint}</span>}{idx === i && <CornerDownLeft className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />}</span>
                    </button>
                  ); })}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
