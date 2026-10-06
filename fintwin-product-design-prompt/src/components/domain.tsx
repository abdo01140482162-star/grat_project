"use client";
import { motion } from "framer-motion";
import {
  ArrowLeftRight, Briefcase, Car, Circle, CreditCard, Copy, Film, GraduationCap, HeartPulse, Home, Landmark, MoreHorizontal, PenTool, Pencil, Plane,
  Play, Repeat, ShoppingBag, ShoppingBasket, Sparkles, Target, Trash2, Users, Wallet, Zap, Umbrella, Baby, TrendingUp, Building2, PiggyBank, Heart, Gem, FileText, ChevronRight, LineChart as LineIcon,
} from "lucide-react";
import Link from "next/link";
import { createContext, type ReactNode, useContext, useState } from "react";
import { type Account, type Goal, type Scenario, type Transaction, fmtDate, fmtMoney, fmtPct, monthsBetween } from "@/lib/model";
import { CircularProgress, CountUp, ProgressPill } from "./motion";
import { Badge, Button, Drawer, Field, IconCircle, MoneyInput, Segmented, Select, TextInput, cx, useToast } from "./ui";
import { useStore } from "./store";

const I = { strokeWidth: 1.5, className: "h-4 w-4" };
export const CATEGORY_ICON: Record<string, ReactNode> = {
  Salary: <Briefcase {...I} />, Freelance: <PenTool {...I} />, Housing: <Home {...I} />, Food: <ShoppingBasket {...I} />, Transportation: <Car {...I} />,
  Utilities: <Zap {...I} />, Healthcare: <HeartPulse {...I} />, Education: <GraduationCap {...I} />, Debt: <CreditCard {...I} />, Family: <Users {...I} />,
  Entertainment: <Film {...I} />, Shopping: <ShoppingBag {...I} />, Travel: <Plane {...I} />, Subscriptions: <Repeat {...I} />, Transfer: <ArrowLeftRight {...I} />, Other: <Circle {...I} />,
};
export const CATEGORIES = Object.keys(CATEGORY_ICON);
export const GOAL_ICON: Record<string, ReactNode> = {
  "Emergency Fund": <Umbrella {...I} />, "Buy a Home": <Home {...I} />, "Buy a Car": <Car {...I} />, Marriage: <Heart {...I} />, Education: <GraduationCap {...I} />,
  Travel: <Plane {...I} />, Retirement: <PiggyBank {...I} />, Business: <Building2 {...I} />, "Debt Free": <CreditCard {...I} />, "Wealth Building": <TrendingUp {...I} />, Custom: <Gem {...I} />, Child: <Baby {...I} />,
};
export const GOAL_KINDS = ["Emergency Fund", "Buy a Home", "Buy a Car", "Marriage", "Education", "Travel", "Retirement", "Business", "Debt Free", "Wealth Building", "Custom"];
export const ACCOUNT_ICON: Record<string, ReactNode> = { Checking: <Landmark {...I} />, Savings: <PiggyBank {...I} />, "Credit Card": <CreditCard {...I} />, Cash: <Wallet {...I} />, Investment: <LineIcon {...I} /> };
export const ACCOUNT_TYPES = Object.keys(ACCOUNT_ICON);

export function goalStatus(g: Goal) {
  const p = g.target > 0 ? g.current / g.target : 0;
  const months = Math.max(1, monthsBetween(new Date(), new Date(g.targetDate)));
  const required = Math.max(0, (g.target - g.current) / months);
  const onPace = g.monthly >= required * 0.95;
  const prob = g.probability;
  const tone: "pos" | "warn" | "neg" = p >= 1 ? "pos" : prob !== null ? (prob >= 0.65 ? "pos" : prob >= 0.35 ? "warn" : "neg") : onPace ? "pos" : "warn";
  const label = p >= 1 ? "Reached" : tone === "pos" ? "On track" : tone === "warn" ? "Needs attention" : "At risk";
  return { p, months, required, onPace, tone, label };
}

/* -------- Goal card -------- */
export function GoalCard({ goal, currency, fresh }: { goal: Goal; currency: string; fresh?: boolean }) {
  const s = goalStatus(goal);
  return (
    <Link href={`/app/goals/${goal.id}`} className={cx("card lift block p-5 transition-colors", fresh && "!bg-accentsoft")}>
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <IconCircle tone="card">{GOAL_ICON[goal.kind] ?? GOAL_ICON.Custom}</IconCircle>
          <div><div className="text-[14.5px] font-bold tracking-tight">{goal.name}</div><div className="text-[11.5px] text-muted">by {fmtDate(goal.targetDate)}</div></div>
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      <div className="mb-3 flex items-end justify-between">
        <div><CountUp value={goal.current} format={(v) => fmtMoney(v, currency)} className="text-[22px] font-bold" /><div className="text-[11.5px] text-muted num">of {fmtMoney(goal.target, currency)}</div></div>
        <div className="text-right"><div className="num text-[13px] font-bold">{fmtPct(s.p, 0)}</div><div className="text-[11px] text-muted">saved</div></div>
      </div>
      <ProgressPill value={s.p} marker={1} />
      <div className="mt-4 flex items-center justify-between text-[11.5px] text-muted">
        <span>{goal.probability !== null ? <>Simulated probability <b className="num text-fg">{fmtPct(goal.probability, 0)}</b></> : "Not simulated yet"}</span>
        <span className="num">{fmtMoney(goal.monthly, currency)}/mo</span>
      </div>
    </Link>
  );
}

/* -------- Scenario card -------- */
export function ScenarioCard({ s, onRun, onEdit, onDuplicate, onDelete, selected }: { s: Scenario; onRun: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; selected?: boolean }) {
  const [menu, setMenu] = useState(false);
  const c = s.changes;
  const params = [
    c.incomeChangePct ? `Income ${c.incomeChangePct > 0 ? "+" : ""}${c.incomeChangePct}%${c.incomeDurationMonths ? ` · ${c.incomeDurationMonths} mo` : ""}` : null,
    c.expenseChangePct ? `Expenses ${c.expenseChangePct > 0 ? "+" : ""}${c.expenseChangePct}%` : null,
    c.expenseChangeAmount ? `+${Math.round(c.expenseChangeAmount).toLocaleString()}/mo costs` : null,
    c.oneTimeCost ? `One-time ${fmtMoney(c.oneTimeCost, "", { compact: true }).trim()}` : null,
    c.savingsBoostPct ? `Save +${c.savingsBoostPct}%` : null,
    c.newDebtPayment ? `Loan ${Math.round(c.newDebtPayment).toLocaleString()}/mo` : null,
    Object.keys(c.econ ?? {}).length ? "Economic override" : null,
  ].filter(Boolean) as string[];
  return (
    <motion.div layout layoutId={`scenario-${s.id}`} className={cx("group relative flex flex-col p-5 lift", selected ? "card-solid" : "card")}>
      <div className="mb-3 flex items-start justify-between">
        <span className={cx("label", selected && "!text-solidmuted")}>{s.category}</span>
        <div className="relative">
          <button aria-label="More actions" onClick={() => setMenu((v) => !v)} className="grid h-7 w-7 place-items-center rounded-full opacity-60 transition hover:bg-card2 hover:opacity-100"><MoreHorizontal {...I} /></button>
          {menu && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-2xl border border-line bg-canvas p-1 text-[12.5px] text-fg shadow-lift" onMouseLeave={() => setMenu(false)}>
              <button onClick={() => { setMenu(false); onDuplicate(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 hover:bg-card2"><Copy {...I} />Duplicate</button>
              <button onClick={() => { setMenu(false); onDelete(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-neg hover:bg-card2"><Trash2 {...I} />Delete</button>
            </motion.div>
          )}
        </div>
      </div>
      <h3 className="text-[16px] font-bold tracking-tight">{s.name}</h3>
      <p className={cx("mt-1 line-clamp-2 text-[12.5px]", selected ? "text-solidmuted" : "text-muted")}>{s.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">{params.slice(0, 3).map((p) => <span key={p} className={cx("rounded-full px-2.5 py-1 text-[11px] font-semibold", selected ? "bg-white/10" : "bg-card2")}>{p}</span>)}</div>
      <div className={cx("mt-4 border-t pt-3 text-[11.5px]", selected ? "border-white/10 text-solidmuted" : "border-line text-muted")}>
        {s.lastRunAt ? <><span>Last run {fmtDate(s.lastRunAt)}</span><div className={cx("num mt-0.5 font-semibold", selected ? "text-accent" : "text-fg")}>{s.lastSummary}</div></> : <span>Not simulated yet</span>}
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant={selected ? "accent" : "primary"} onClick={onRun} icon={<Play className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />}>Run</Button>
        <Button size="sm" variant="secondary" onClick={onEdit} icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />}>Edit</Button>
      </div>
    </motion.div>
  );
}

/* -------- Account card -------- */
export function AccountCard({ a, fresh, currency }: { a: Account; fresh?: boolean; currency: string }) {
  return (
    <Link href={`/app/accounts/${a.id}`} className={cx("card lift group flex items-center gap-4 p-4 transition-colors", fresh && "!bg-accentsoft")}>
      <IconCircle tone={a.type === "Credit Card" ? "ink" : "card"} size={42}>{ACCOUNT_ICON[a.type] ?? <Wallet {...I} />}</IconCircle>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold">{a.name}</div>
        <div className="text-[11.5px] text-muted">{a.type} · updated {fmtDate(a.updatedAt)}</div>
      </div>
      <div className="text-right">
        <CountUp value={a.balance} format={(v) => fmtMoney(v, a.currency || currency)} className={cx("text-[16px] font-bold", a.balance < 0 && "text-neg")} />
        <div className="text-[11px] text-muted">{a.currency}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
    </Link>
  );
}

/* -------- Transaction row -------- */
export function TransactionRow({ t, account, currency, onSelect, onDelete, selected, fresh }: { t: Transaction; account?: string; currency: string; onSelect?: () => void; onDelete?: () => void; selected?: boolean; fresh?: boolean }) {
  return (
    <motion.li layout initial={{ opacity: 0, y: -10, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.28 } }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cx("group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-300 hover:bg-glow", selected && "bg-card2", fresh && "bg-accentsoft")}
      onClick={onSelect} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect?.()}>
      <IconCircle tone={t.kind === "income" ? "accent" : "card"}>{CATEGORY_ICON[t.category] ?? CATEGORY_ICON.Other}</IconCircle>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold">{t.description}</div>
        <div className="truncate text-[11.5px] text-muted">{t.category} · {fmtDate(t.date)}{account ? ` · ${account}` : ""}</div>
      </div>
      {onDelete && <button aria-label="Delete transaction" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="grid h-8 w-8 place-items-center rounded-full text-muted opacity-0 transition hover:bg-card2 hover:text-neg group-hover:opacity-100 focus:opacity-100"><Trash2 {...I} /></button>}
      <span className={cx("num w-28 text-right text-[13.5px] font-bold", t.amount > 0 ? "text-pos" : "")}>{fmtMoney(t.amount, currency, { sign: true })}</span>
    </motion.li>
  );
}

/* -------- Insight card -------- */
export function InsightCard({ title, body, href, cta = "Explore", icon }: { title: string; body: string; href: string; cta?: string; icon?: ReactNode }) {
  return (
    <Link href={href} className="card lift group block p-4">
      <div className="mb-2 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-accentfg">{icon ?? <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />}</span><span className="text-[13px] font-bold">{title}</span></div>
      <p className="text-[12.5px] leading-relaxed text-muted">{body}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold">{cta}<ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} /></span>
    </Link>
  );
}

export function ReportCard({ title, type, date, href }: { title: string; type: string; date?: string; href: string }) {
  return (
    <Link href={href} className="card lift group flex items-center gap-4 p-4">
      <IconCircle size={42}><FileText {...I} /></IconCircle>
      <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-bold">{title}</div><div className="text-[11.5px] text-muted">{type}{date ? ` · ${fmtDate(date)}` : ""}</div></div>
      <ChevronRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
    </Link>
  );
}

export function Ring({ value, label, sub, size = 72 }: { value: number; label: string; sub?: string; size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <CircularProgress value={value} size={size}><span className="num text-[13px] font-bold">{Math.round(value * 100)}%</span></CircularProgress>
      <div><div className="text-[13px] font-bold">{label}</div>{sub && <div className="text-[11.5px] text-muted">{sub}</div>}</div>
    </div>
  );
}

/* ================= Composers (shared add flows) ================= */
type ComposerKind = "transaction" | "account" | "goal" | null;
const ComposerCtx = createContext<(k: ComposerKind, preset?: Record<string, unknown>) => void>(() => {});
export const useComposer = () => useContext(ComposerCtx);

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<ComposerKind>(null);
  const [preset, setPreset] = useState<Record<string, unknown>>({});
  const open = (k: ComposerKind, p: Record<string, unknown> = {}) => { setPreset(p); setKind(k); };
  return (
    <ComposerCtx.Provider value={open}>
      {children}
      <TransactionComposer open={kind === "transaction"} onClose={() => setKind(null)} preset={preset} />
      <AccountComposer open={kind === "account"} onClose={() => setKind(null)} />
      <GoalComposer open={kind === "goal"} onClose={() => setKind(null)} preset={preset} />
    </ComposerCtx.Provider>
  );
}

function TransactionComposer({ open, onClose, preset }: { open: boolean; onClose: () => void; preset: Record<string, unknown> }) {
  const { accounts, create, currency } = useStore();
  const toast = useToast();
  const [kind, setKind] = useState<"expense" | "income" | "transfer">("expense");
  const [desc, setDesc] = useState(""); const [amount, setAmount] = useState(0);
  const [cat, setCat] = useState("Food"); const [acc, setAcc] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState<string>(); const [busy, setBusy] = useState(false);
  const accountId = acc || String(preset.accountId ?? accounts[0]?.id ?? "");
  const submit = async () => {
    if (!desc.trim()) return setErr("Add a short description.");
    if (!amount) return setErr("Enter an amount.");
    setBusy(true); setErr(undefined);
    try {
      await create("transactions", { description: desc.trim(), amount: kind === "income" ? Math.abs(amount) : -Math.abs(amount), kind, category: kind === "transfer" ? "Transfer" : cat, date, accountId: accountId ? Number(accountId) : null });
      toast("Transaction added — balances updated");
      setDesc(""); setAmount(0); onClose();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} title="Add transaction" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Add transaction</Button></div>}>
      <div className="space-y-4">
        <Segmented value={kind} onChange={setKind} options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }, { value: "transfer", label: "Transfer" }]} />
        <Field label="Description" error={err}><TextInput value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Weekly groceries" autoFocus /></Field>
        <Field label="Amount" unit={currency}><MoneyInput value={amount} onChange={setAmount} currency={currency} /></Field>
        {kind !== "transfer" && <Field label="Category"><Select value={cat} onChange={setCat} options={CATEGORIES.filter((c) => c !== "Transfer")} /></Field>}
        <Field label="Account"><Select value={accountId} onChange={setAcc} options={[{ value: "", label: "No account" }, ...accounts.map((a) => ({ value: String(a.id), label: a.name }))]} /></Field>
        <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <p className="text-[11.5px] text-muted">The linked account balance updates immediately, which flows into your Twin, analytics and simulations.</p>
      </div>
    </Drawer>
  );
}

function AccountComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { create, currency } = useStore();
  const toast = useToast();
  const [name, setName] = useState(""); const [type, setType] = useState("Checking"); const [bal, setBal] = useState(0); const [cur, setCur] = useState(currency);
  const [err, setErr] = useState<string>(); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return setErr("Give this account a name.");
    setBusy(true);
    try { await create("accounts", { name: name.trim(), type, balance: type === "Credit Card" ? -Math.abs(bal) : bal, currency: cur }); toast("Account added to your Twin"); setName(""); setBal(0); onClose(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} title="Add account" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Add account</Button></div>}>
      <div className="space-y-4">
        <Field label="Account name" error={err}><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CIB Savings" autoFocus /></Field>
        <Field label="Type"><div className="flex flex-wrap gap-2">{ACCOUNT_TYPES.map((t) => <button key={t} type="button" onClick={() => setType(t)} className={cx("press flex items-center gap-2 rounded-full border px-3 py-2 text-[12.5px] font-semibold transition", type === t ? "border-btn bg-btn text-btnfg" : "border-line bg-card hover:bg-card2")}>{ACCOUNT_ICON[t]}{t}</button>)}</div></Field>
        <Field label={type === "Credit Card" ? "Amount owed" : "Current balance"}><MoneyInput value={bal} onChange={setBal} currency={cur} /></Field>
        <Field label="Currency"><Select value={cur} onChange={setCur} options={["EGP", "USD", "EUR", "GBP", "SAR", "AED"]} /></Field>
      </div>
    </Drawer>
  );
}

function GoalComposer({ open, onClose, preset }: { open: boolean; onClose: () => void; preset: Record<string, unknown> }) {
  const { create, currency } = useStore();
  const toast = useToast();
  const y = new Date().getFullYear();
  const [kind, setKind] = useState(String(preset.kind ?? "Emergency Fund")); const [name, setName] = useState("");
  const [target, setTarget] = useState(100000); const [current, setCurrent] = useState(0); const [monthly, setMonthly] = useState(2000);
  const [date, setDate] = useState(`${y + 3}-01-01`); const [busy, setBusy] = useState(false);
  const months = Math.max(1, monthsBetween(new Date(), new Date(date)));
  const req = Math.max(0, (target - current) / months);
  const submit = async () => {
    setBusy(true);
    try { await create("goals", { name: name.trim() || kind, kind, target, current, monthly, targetDate: date }); toast("Goal created — try simulating it next"); onClose(); }
    finally { setBusy(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} title="Add goal" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Create goal</Button></div>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">{GOAL_KINDS.map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={cx("press flex flex-col items-start gap-2 rounded-2xl border p-3 text-left text-[12px] font-semibold transition", kind === k ? "border-btn bg-btn text-btnfg" : "border-line bg-card hover:bg-card2")}>{GOAL_ICON[k]}{k}</button>)}</div>
        <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={kind} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target"><MoneyInput value={target} onChange={setTarget} currency={currency} /></Field>
          <Field label="Target date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Saved so far"><MoneyInput value={current} onChange={setCurrent} currency={currency} /></Field>
          <Field label="Monthly contribution"><MoneyInput value={monthly} onChange={setMonthly} currency={currency} /></Field>
        </div>
        <div className="rounded-2xl bg-card2 p-4 text-[12.5px]">
          <div className="flex justify-between"><span className="text-muted">Required without growth</span><CountUp value={req} format={(v) => `${fmtMoney(v, currency)}/mo`} className="font-bold" /></div>
          <ProgressPill className="mt-3" value={target ? current / target : 0} />
        </div>
      </div>
    </Drawer>
  );
}
