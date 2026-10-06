"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Briefcase, Check, Clock, GraduationCap, Lock, Plus, Shield, Trash2, User, Laptop, Building2, Coffee, Sunset, HelpCircle, Pencil, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { type Twin, ASSUMPTION_INFO, EXPENSE_KEYS, EXPENSE_LABELS, ESSENTIAL, PREFERENCE_ADJ, PRESETS, defaultTwin, fmtMoney, fmtPct, metrics, uid, type Assumptions } from "@/lib/model";
import { api } from "./store";
import { GOAL_ICON, GOAL_KINDS } from "./domain";
import { CountUp, EASE } from "./motion";
import { Badge, Button, Field, InfoTip, Logo, MoneyInput, Select, Slider, TextInput, Toggle, cx } from "./ui";

type GoalDraft = { kind: string; name: string; target: number; current: number; monthly: number; targetDate: string };
const STEP_NAMES = ["Welcome", "Profile", "Employment", "Income", "Expenses", "Savings", "Assets", "Liabilities", "Goals", "Preferences", "Assumptions", "Review"];
const BUILD = ["Reading your inputs", "Mapping your financial structure", "Calculating cash flow", "Connecting goals", "Applying assumptions", "Preparing possible futures", "Your Twin is ready"];
const EMP = [{ t: "Employed", i: <Briefcase /> }, { t: "Self-employed", i: <User /> }, { t: "Freelancer", i: <Laptop /> }, { t: "Business owner", i: <Building2 /> }, { t: "Student", i: <GraduationCap /> }, { t: "Unemployed", i: <Coffee /> }, { t: "Retired", i: <Sunset /> }, { t: "Other", i: <HelpCircle /> }];
const GOAL_DEFAULTS: Record<string, number> = { "Emergency Fund": 120000, "Buy a Home": 1500000, "Buy a Car": 650000, Marriage: 300000, Education: 200000, Travel: 60000, Retirement: 5000000, Business: 400000, "Debt Free": 100000, "Wealth Building": 1000000, Custom: 100000 };

export function Onboarding({ userName }: { userName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [t, setT] = useState<Twin>(() => { const d = defaultTwin(); d.profile.name = userName; return d; });
  const [goals, setGoals] = useState<GoalDraft[]>([]);
  const [build, setBuild] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const m = useMemo(() => metrics(t, [{ id: 0, name: "", type: "Checking", balance: t.savings.cash + t.savings.emergency + t.savings.otherLiquid, currency: "", updatedAt: "", createdAt: "" }]), [t]);
  const cur = t.profile.currency;
  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const set = <K extends keyof Twin>(k: K, v: Twin[K]) => setT((x) => ({ ...x, [k]: v }));

  const finish = async () => {
    setBuild(0); setError(null);
    const req = api("/api/twin", "POST", { twin: t, goals: goals.map((g) => ({ ...g, name: g.name || g.kind })) });
    try {
      for (let i = 1; i < BUILD.length; i++) { await new Promise((r) => setTimeout(r, 750)); if (i === BUILD.length - 1) await req; setBuild(i); }
    } catch (e) { setError((e as Error).message); setBuild(-1); }
  };

  if (build >= 0) return (
    <div className="glow-bg flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-lg text-center">
        <motion.div className="relative mx-auto mb-10 h-40 w-40" animate={{ rotate: build >= BUILD.length - 1 ? 0 : 360 }} transition={{ repeat: build >= BUILD.length - 1 ? 0 : Infinity, duration: 14, ease: "linear" }}>
          {Array.from({ length: 6 }, (_, i) => (
            <motion.span key={i} className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-fg" style={{ marginLeft: -6, marginTop: -6 }}
              initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: Math.cos((i / 6) * Math.PI * 2) * (build >= i ? 64 : 20), y: Math.sin((i / 6) * Math.PI * 2) * (build >= i ? 64 : 20), opacity: build >= i ? 1 : 0.2 }} transition={{ duration: 0.8, ease: EASE }} />
          ))}
          <motion.div className="absolute inset-[38px] grid place-items-center rounded-full bg-accent text-accentfg" animate={{ scale: build >= BUILD.length - 1 ? 1.15 : [1, 1.06, 1] }} transition={{ repeat: build >= BUILD.length - 1 ? 0 : Infinity, duration: 1.6 }}>
            {build >= BUILD.length - 1 ? <Check className="h-10 w-10" strokeWidth={2} /> : <Logo label={false} size={34} />}
          </motion.div>
        </motion.div>
        <h1 className="text-[28px] font-bold tracking-tight">{build >= BUILD.length - 1 ? "Your Financial Twin is ready" : "Building your Financial Twin…"}</h1>
        <div className="mx-auto mt-6 max-w-sm space-y-2 text-left">
          {BUILD.map((s, i) => (
            <motion.div key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: i <= build ? 1 : 0.3, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 text-[13.5px]">
              <span className={cx("grid h-5 w-5 place-items-center rounded-full transition-colors", i < build || build === BUILD.length - 1 ? "bg-btn text-accent" : i === build ? "bg-accent" : "bg-line2")}>{(i < build || build === BUILD.length - 1) && <Check className="h-3 w-3" strokeWidth={2.4} />}</span>
              <span className={i === build ? "font-bold" : ""}>{s}</span>
            </motion.div>
          ))}
        </div>
        <AnimatePresence>{build >= BUILD.length - 1 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8">
            <div className="card-solid mx-auto mb-5 max-w-sm p-5"><div className="text-[12px] text-solidmuted">Starting net worth</div><CountUp value={m.netWorth} format={(v) => fmtMoney(v, cur)} className="text-[30px] font-bold text-accent" /><div className="mt-1 text-[12px] text-solidmuted">{fmtMoney(m.savings, cur, { sign: true })}/month · {m.coverage.toFixed(1)} months covered</div></div>
            <Button size="lg" onClick={() => { router.push("/app"); router.refresh(); }} icon={<ArrowRight className="h-4 w-4" />}>Open my Financial Twin</Button>
          </motion.div>
        )}</AnimatePresence>
      </div>
    </div>
  );

  const Card = ({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) => (
    <motion.button type="button" onClick={onClick} whileTap={{ scale: 0.98 }} animate={{ scale: on ? 1 : 0.995 }} className={cx("relative flex items-center gap-3 rounded-[20px] border p-4 text-left transition-colors", on ? "border-btn bg-card shadow-soft" : "border-line bg-card/60 hover:bg-card", className)}>
      {children}{on && <motion.span layoutId={undefined} initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-accent text-accentfg"><Check className="h-3 w-3" strokeWidth={2.4} /></motion.span>}
    </motion.button>
  );
  const body = () => {
    switch (step) {
      case 0: return (<>
        <h1 className="text-[36px] font-bold leading-tight tracking-tight md:text-[44px]">Let&apos;s build your financial twin.</h1>
        <p className="mt-3 max-w-md text-[15px] text-muted">A few details are enough to create your starting model. Everything can be changed later.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">{[{ i: <Clock className="h-4 w-4" />, t: "About 8 minutes", d: "Rough numbers are fine." }, { i: <Lock className="h-4 w-4" />, t: "Private", d: "Your model is visible only to you." }, { i: <BookOpen className="h-4 w-4" />, t: "Educational", d: "Simulations explore possibilities — not advice." }].map((x) => <div key={x.t} className="card p-4"><span className="mb-3 grid h-8 w-8 place-items-center rounded-full bg-accent text-accentfg">{x.i}</span><div className="text-[13.5px] font-bold">{x.t}</div><div className="text-[12px] text-muted">{x.d}</div></div>)}</div>
      </>);
      case 1: return (<>
        <H t="A little about you" d="Only what the model needs." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><TextInput value={t.profile.name} onChange={(e) => set("profile", { ...t.profile, name: e.target.value })} /></Field>
          <Field label="Age"><MoneyInput value={t.profile.age} onChange={(v) => set("profile", { ...t.profile, age: v })} currency="" suffix="yrs" /></Field>
          <Field label="Country"><TextInput value={t.profile.country} onChange={(e) => set("profile", { ...t.profile, country: e.target.value })} /></Field>
          <Field label="City"><TextInput value={t.profile.city} onChange={(e) => set("profile", { ...t.profile, city: e.target.value })} /></Field>
        </div>
        <Field label="Currency"><div className="flex flex-wrap gap-2">{["EGP", "USD", "EUR", "GBP", "SAR", "AED", "Other"].map((c) => <button key={c} type="button" onClick={() => set("profile", { ...t.profile, currency: c === "Other" ? "USD" : c })} className={cx("press h-9 rounded-full border px-4 text-[13px] font-semibold", t.profile.currency === c ? "border-btn bg-btn text-btnfg" : "border-line bg-card")}>{c}</button>)}</div></Field>
      </>);
      case 2: return (<>
        <H t="How does your income currently work?" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{EMP.map((e) => <Card key={e.t} on={t.employment === e.t} onClick={() => set("employment", e.t)} className="flex-col !items-start"><span className="grid h-9 w-9 place-items-center rounded-full bg-card2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.5]">{e.i}</span><span className="text-[13px] font-bold">{e.t}</span></Card>)}</div>
      </>);
      case 3: return (<>
        <H t="Your income" d="Monthly amounts after tax." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monthly income"><MoneyInput value={t.income.monthly} onChange={(v) => set("income", { ...t.income, monthly: v })} currency={cur} /></Field>
          <Field label="Additional income" hint="Freelance, rent, side projects"><MoneyInput value={t.income.additional} onChange={(v) => set("income", { ...t.income, additional: v })} currency={cur} /></Field>
          <Field label="Income frequency"><Select value={t.income.frequency} onChange={(v) => set("income", { ...t.income, frequency: v })} options={["Monthly", "Bi-weekly", "Weekly", "Irregular"]} /></Field>
          <Field label="Expected annual growth" hint={t.income.unsure ? "Using a sensible default of 10% — editable anytime." : undefined}><MoneyInput value={t.income.growth} onChange={(v) => setT((x) => ({ ...x, income: { ...x.income, growth: v, unsure: false }, assumptions: { ...x.assumptions, incomeGrowth: v } }))} currency="" suffix="%" /></Field>
        </div>
        <div className="flex items-center gap-3"><Toggle label="I'm not sure" checked={t.income.unsure} onChange={(v) => setT((x) => ({ ...x, income: { ...x.income, unsure: v, growth: v ? 10 : x.income.growth } }))} /><span className="text-[13px]">I&apos;m not sure about growth</span></div>
      </>);
      case 4: return (<>
        <H t="Your monthly expenses" d="Estimates are fine. Essential costs are marked." />
        <SummaryGrid cur={cur} items={[["Monthly expenses", m.expenses - m.debtPayments, true], ["Essential", m.essential - m.debtPayments], ["Flexible", m.flexible]]} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{EXPENSE_KEYS.map((k) => <Field key={k} label={EXPENSE_LABELS[k]} unit={ESSENTIAL.includes(k) ? "essential" : undefined}><MoneyInput value={t.expenses[k]} onChange={(v) => set("expenses", { ...t.expenses, [k]: v })} currency={cur} /></Field>)}</div>
      </>);
      case 5: return (<>
        <H t="Your savings" d="Cash you could access within a few days." />
        <SummaryGrid cur={cur} items={[["Savings rate", fmtPct(Math.max(-1, m.savingsRate), 0), true], ["Monthly surplus", m.savings], ["Months covered", `${m.coverage.toFixed(1)} mo`]]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cash savings"><MoneyInput value={t.savings.cash} onChange={(v) => set("savings", { ...t.savings, cash: v })} currency={cur} /></Field>
          <Field label="Emergency savings"><MoneyInput value={t.savings.emergency} onChange={(v) => set("savings", { ...t.savings, emergency: v })} currency={cur} /></Field>
          <Field label="Planned monthly savings"><MoneyInput value={t.savings.monthly} onChange={(v) => set("savings", { ...t.savings, monthly: v })} currency={cur} /></Field>
          <Field label="Other liquid assets"><MoneyInput value={t.savings.otherLiquid} onChange={(v) => set("savings", { ...t.savings, otherLiquid: v })} currency={cur} /></Field>
        </div>
      </>);
      case 6: return (<>
        <H t="What do you own?" d="Add anything with meaningful value." />
        <div className="flex flex-wrap gap-2">{["Cash", "Bank account", "Investments", "Property", "Vehicle", "Business", "Other"].map((ty) => <Button key={ty} size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => set("assets", [...t.assets, { id: uid(), name: ty === "Property" ? "Apartment" : ty, type: ty, value: 0 }])}>{ty}</Button>)}</div>
        <div className="grid gap-3 sm:grid-cols-2"><AnimatePresence>{t.assets.map((a, i) => (
          <motion.div key={a.id} layout initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card space-y-2 p-4">
            <div className="flex items-center gap-2"><input value={a.name} onChange={(e) => { const x = [...t.assets]; x[i] = { ...a, name: e.target.value }; set("assets", x); }} className="flex-1 bg-transparent text-[14px] font-bold outline-none" aria-label="Asset name" /><Badge tone="neutral" dot={false}>{a.type}</Badge><button aria-label="Remove" onClick={() => set("assets", t.assets.filter((y) => y.id !== a.id))} className="text-muted hover:text-neg"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></button></div>
            <MoneyInput value={a.value} onChange={(v) => { const x = [...t.assets]; x[i] = { ...a, value: v }; set("assets", x); }} currency={cur} />
          </motion.div>
        ))}</AnimatePresence></div>
        {t.assets.length === 0 && <p className="text-[13px] text-muted">No assets yet — that&apos;s fine. You can add them later.</p>}
      </>);
      case 7: return (<>
        <H t="Any debts?" d="Loans, mortgages and card balances." />
        <SummaryGrid cur={cur} items={[["Total debt", t.liabilities.reduce((s, l) => s + l.balance, 0), true], ["Monthly payments", m.debtPayments], ["Debt / income", fmtPct(m.dti, 0)]]} />
        <div className="flex flex-wrap gap-2">{["Credit card", "Personal loan", "Mortgage", "Car loan", "Student loan", "Other"].map((ty) => <Button key={ty} size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => set("liabilities", [...t.liabilities, { id: uid(), name: ty, type: ty, balance: 0, payment: 0, rate: 0, months: 12 }])}>{ty}</Button>)}</div>
        <AnimatePresence>{t.liabilities.map((l, i) => {
          const upd = (p: Partial<typeof l>) => { const x = [...t.liabilities]; x[i] = { ...l, ...p }; set("liabilities", x); };
          return (
            <motion.div key={l.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="card p-4">
              <div className="mb-3 flex items-center gap-2"><input value={l.name} onChange={(e) => upd({ name: e.target.value })} className="flex-1 bg-transparent text-[14px] font-bold outline-none" aria-label="Debt name" /><button aria-label="Remove" onClick={() => set("liabilities", t.liabilities.filter((y) => y.id !== l.id))} className="text-muted hover:text-neg"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></button></div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Field label="Remaining balance"><MoneyInput value={l.balance} onChange={(v) => upd({ balance: v })} currency={cur} /></Field>
                <Field label="Monthly payment"><MoneyInput value={l.payment} onChange={(v) => upd({ payment: v })} currency={cur} /></Field>
                <Field label="Interest rate"><MoneyInput value={l.rate} onChange={(v) => upd({ rate: v })} currency="" suffix="%" /></Field>
                <Field label="Remaining"><MoneyInput value={l.months} onChange={(v) => upd({ months: v })} currency="" suffix="mo" /></Field>
              </div>
            </motion.div>
          );
        })}</AnimatePresence>
      </>);
      case 8: return (<>
        <H t="What are you building toward?" d="Pick any that matter. Details appear as you select." />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">{GOAL_KINDS.map((k) => { const on = goals.some((g) => g.kind === k); return (
          <Card key={k} on={on} onClick={() => setGoals(on ? goals.filter((g) => g.kind !== k) : [...goals, { kind: k, name: k, target: GOAL_DEFAULTS[k], current: 0, monthly: 1000, targetDate: `${new Date().getFullYear() + (k === "Retirement" ? 25 : k === "Buy a Home" ? 7 : 3)}-01-01` }])}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-card2">{GOAL_ICON[k]}</span><span className="text-[12.5px] font-bold">{k}</span>
          </Card>
        ); })}</div>
        <AnimatePresence>{goals.map((g, i) => {
          const upd = (p: Partial<GoalDraft>) => { const x = [...goals]; x[i] = { ...g, ...p }; setGoals(x); };
          return (
            <motion.div key={g.kind} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="card p-4"><div className="mb-3 flex items-center gap-2 text-[14px] font-bold">{GOAL_ICON[g.kind]}{g.kind}</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Field label="Target amount"><MoneyInput value={g.target} onChange={(v) => upd({ target: v })} currency={cur} /></Field>
                  <Field label="Target date"><TextInput type="date" value={g.targetDate} onChange={(e) => upd({ targetDate: e.target.value })} /></Field>
                  <Field label="Current amount"><MoneyInput value={g.current} onChange={(v) => upd({ current: v })} currency={cur} /></Field>
                  <Field label="Monthly contribution"><MoneyInput value={g.monthly} onChange={(v) => upd({ monthly: v })} currency={cur} /></Field>
                </div>
              </div>
            </motion.div>
          );
        })}</AnimatePresence>
      </>);
      case 9: return (<>
        <H t="How would you like FinTwin to model uncertainty?" />
        <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(PREFERENCE_ADJ) as Twin["preference"][]).map((k) => <Card key={k} on={t.preference === k} onClick={() => set("preference", k)} className="flex-col !items-start"><span className="text-[14px] font-bold">{PREFERENCE_ADJ[k].label}</span><span className="text-[12px] text-muted">{{ cautious: "Lower expected returns", balanced: "Assumptions close to averages", growth: "Higher returns, a bit more volatility", wide: "Same averages, much wider range" }[k]}</span></Card>)}</div>
        <div className="flex gap-3 rounded-2xl bg-card2 p-4 text-[12.5px] text-muted"><Shield className="h-4 w-4 shrink-0" strokeWidth={1.5} />This changes the model assumptions and scenario ranges. It does not predict your future or provide investment advice.</div>
      </>);
      case 10: return (<>
        <H t="Economic assumptions" d="Starting values based on a “Normal” environment. Adjust any of them." />
        <div className="flex flex-wrap gap-2">{Object.entries(PRESETS).map(([k, p]) => <button key={k} onClick={() => setT((x) => ({ ...x, economicPreset: k, assumptions: { ...p.a, horizonYears: x.assumptions.horizonYears } }))} className={cx("press rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold", t.economicPreset === k ? "border-btn bg-btn text-btnfg" : "border-line bg-card")}>{p.label}</button>)}</div>
        <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(ASSUMPTION_INFO) as (keyof Assumptions)[]).map((k) => { const info = ASSUMPTION_INFO[k]; return (
          <div key={k} className="card p-4"><div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[13px] font-bold">{info.label}<InfoTip text={`Why this matters: ${info.why}`} /></span><span className="num text-[18px] font-bold">{t.assumptions[k]}{info.unit === "%" ? "%" : " yrs"}</span></div><p className="mb-3 text-[11.5px] text-muted">{info.explain}</p><Slider label={info.label} value={t.assumptions[k]} onChange={(v) => setT((x) => ({ ...x, economicPreset: "custom", assumptions: { ...x.assumptions, [k]: v } }))} min={info.min} max={info.max} step={info.step} /></div>
        ); })}</div>
      </>);
      case 11: return (<>
        <H t="Review your Twin" d="Check everything before we build it." />
        <div className="grid gap-3 md:grid-cols-2">
          {[{ t: "You", s: 1, rows: [["Age", `${t.profile.age}`], ["Country", `${t.profile.city}, ${t.profile.country}`], ["Currency", cur]] },
            { t: "Your cash flow", s: 3, rows: [["Income", fmtMoney(m.income, cur)], ["Expenses", fmtMoney(m.expenses, cur)], ["Savings", `${fmtMoney(m.savings, cur)} · ${fmtPct(m.savingsRate, 0)}`]] },
            { t: "Your balance sheet", s: 6, rows: [["Assets", fmtMoney(m.totalAssets, cur)], ["Debt", fmtMoney(m.totalDebt, cur)], ["Net worth", fmtMoney(m.netWorth, cur)]] },
            { t: "Your goals", s: 8, rows: goals.length ? goals.map((g) => [g.name, fmtMoney(g.target, cur, { compact: true })]) : [["Goals", "None yet"]] },
            { t: "Model assumptions", s: 10, rows: [["Inflation", `${t.assumptions.inflation}%`], ["Income growth", `${t.assumptions.incomeGrowth}%`], ["Return", `${t.assumptions.investReturn}% ± ${t.assumptions.volatility}%`]] },
          ].map((sec, i) => (
            <motion.div key={sec.t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={cx("p-5", i === 2 ? "card-solid" : "card")}>
              <div className="mb-3 flex items-center justify-between"><span className="text-[14px] font-bold">{sec.t}</span><button onClick={() => go(sec.s)} className={cx("flex items-center gap-1 text-[12px] font-semibold", i === 2 ? "text-solidmuted hover:text-solidfg" : "text-muted hover:text-fg")}><Pencil className="h-3 w-3" />Edit</button></div>
              {sec.rows.map(([l, v]) => <div key={l} className="flex justify-between py-1 text-[13px]"><span className={i === 2 ? "text-solidmuted" : "text-muted"}>{l}</span><span className={cx("num font-semibold", i === 2 && l === "Net worth" && "text-accent")}>{v}</span></div>)}
            </motion.div>
          ))}
        </div>
        {error && <p className="rounded-2xl bg-neg/8 p-3 text-[12.5px] text-neg">{error}</p>}
      </>);
    }
  };

  return (
    <div className="glow-bg min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[880px] items-center gap-4 px-5">
          <Logo label={false} />
          <div className="flex-1">
            <div className="mb-1.5 flex justify-between text-[11.5px] font-semibold"><span>{STEP_NAMES[step]}</span>{step > 0 && <span className="num text-muted">Step {step} / {STEP_NAMES.length - 1}</span>}</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line2"><motion.div className="h-full rounded-full bg-accent" animate={{ width: `${(step / (STEP_NAMES.length - 1)) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} /></div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[880px] px-5 pb-32 pt-10">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: 0.3, ease: EASE }} className="space-y-6">{body()}</motion.div>
        </AnimatePresence>
      </main>
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[880px] items-center justify-between px-5">
          {step > 0 ? <Button variant="ghost" onClick={() => go(step - 1)} icon={<ArrowLeft className="h-4 w-4" />}>Back</Button> : <span />}
          {step < 11 ? <Button size="lg" onClick={() => go(step + 1)} icon={<ArrowRight className="h-4 w-4" />}>Continue</Button> : <Button size="lg" variant="accent" onClick={finish}>Build my Financial Twin</Button>}
        </div>
      </footer>
    </div>
  );
}
function H({ t, d }: { t: string; d?: string }) { return <div><h1 className="text-[28px] font-bold leading-tight tracking-tight md:text-[34px]">{t}</h1>{d && <p className="mt-1.5 text-[14px] text-muted">{d}</p>}</div>; }

function SummaryGrid({ items, cur }: { items: [string, number | string, boolean?][]; cur: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">{items.map(([l, v, hi]) => <div key={l} className={cx("rounded-[18px] p-4", hi ? "bg-solid text-solidfg" : "bg-card2")}><div className={cx("text-[11.5px]", hi ? "text-solidmuted" : "text-muted")}>{l}</div>{typeof v === "number" ? <CountUp value={v} duration={600} format={(x) => fmtMoney(x, cur)} className={cx("text-[17px] font-bold", hi && "text-accent")} /> : <div className={cx("num text-[17px] font-bold", hi && "text-accent")}>{v}</div>}</div>)}</div>
  );
}
