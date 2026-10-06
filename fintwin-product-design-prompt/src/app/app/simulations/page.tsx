"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FlaskConical, Play, RotateCcw, History as HistoryIcon, SlidersHorizontal, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/components/store";
import { useQuery, useSimulation } from "@/components/hooks";
import { SimResults, describeChanges } from "@/components/results";
import { FanChart, Tornado } from "@/components/charts";
import { CountUp, ProgressPill } from "@/components/motion";
import { Badge, Button, Card, CardHeader, ChartSkeleton, Drawer, EmptyState, ErrorState, Field, PageHeader, Segmented, Select, Slider, cx } from "@/components/ui";
import { type ScenarioChanges, type SimResult, type Simulation, PRESETS, SCENARIO_TEMPLATES, effectiveAssumptions, emptyChanges, fmtDate, fmtMoney, fmtPct } from "@/lib/model";
import { runSimulationAsync } from "@/lib/sim";

const STAGES = ["Preparing model", "Generating possible paths", "Running futures", "Calculating percentiles", "Analyzing risk", "Preparing results"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SimulationsPage() {
  const query = useQuery();
  const [tab, setTab] = useState<"studio" | "sensitivity" | "history">("studio");
  useEffect(() => { const t = query?.get("tab"); if (t === "sensitivity" || t === "history") setTab(t); }, [query]);
  return (
    <div>
      <PageHeader eyebrow="Simulation lab" title="Simulation Studio" sub="Change one thing. Run hundreds of possible futures. See the full range — not a single guess." actions={<Segmented value={tab} onChange={setTab} options={[{ value: "studio", label: "Studio" }, { value: "sensitivity", label: "Sensitivity" }, { value: "history", label: "History" }]} />} />
      {tab === "studio" && <Studio query={query} />}
      {tab === "sensitivity" && <Sensitivity />}
      {tab === "history" && <HistoryList />}
    </div>
  );
}

function Studio({ query }: { query: URLSearchParams | null }) {
  const { scenarios, goals, twin, accounts, currency, create, m } = useStore();
  const [sel, setSel] = useState("plan");
  const [goalId, setGoalId] = useState<string>(String(goals.find((g) => /home/i.test(g.kind))?.id ?? goals[0]?.id ?? ""));
  const [horizon, setHorizon] = useState(Math.min(twin.assumptions.horizonYears, 15));
  const [paths, setPaths] = useState("600");
  const [phase, setPhase] = useState<"config" | "running" | "done" | "error">("config");
  const [progress, setProgress] = useState(0); const [done, setDone] = useState(0); const [stage, setStage] = useState(0);
  const [result, setResult] = useState<SimResult | null>(null); const [saved, setSaved] = useState<Simulation | null>(null);
  const autorun = useRef(false);

  useEffect(() => {
    if (!query) return;
    const s = query.get("scenario"), t = query.get("template"), g = query.get("goal");
    if (s) setSel(`s:${s}`); else if (t) setSel(`t:${t}`);
    if (g) setGoalId(g);
    if (query.get("paths")) setPaths(query.get("paths")!);
    if (query.get("horizon")) setHorizon(Number(query.get("horizon")));
    if (query.get("autorun")) autorun.current = true;
  }, [query]);

  const picked = useMemo((): { name: string; changes: ScenarioChanges; scenarioId: number | null } => {
    if (sel.startsWith("s:")) { const s = scenarios.find((x) => x.id === Number(sel.slice(2))); if (s) return { name: s.name, changes: { ...emptyChanges(), ...s.changes }, scenarioId: s.id }; }
    if (sel.startsWith("t:")) { const t = SCENARIO_TEMPLATES.find((x) => x.name === sel.slice(2)); if (t) return { name: t.name, changes: { ...emptyChanges(), ...t.changes }, scenarioId: null }; }
    return { name: "Current plan", changes: emptyChanges(), scenarioId: null };
  }, [sel, scenarios]);
  const goal = goals.find((g) => String(g.id) === goalId) ?? null;
  const a = effectiveAssumptions(twin);

  const run = async () => {
    const N = Number(paths);
    setPhase("running"); setProgress(0); setDone(0); setStage(0); setResult(null); setSaved(null);
    try {
      await sleep(350); setStage(1); setProgress(6); await sleep(350); setStage(2);
      const chunk = Math.max(20, Math.round(N / 30));
      const r = await runSimulationAsync({ twin, accounts, changes: picked.changes, horizonYears: horizon, paths: N, goal, seed: Date.now() % 100000 }, async (d) => { setDone(d); setProgress(8 + (d / N) * 76); }, chunk, Math.max(10, Math.round(1400 / (N / chunk))));
      for (let i = 3; i < 6; i++) { setStage(i); setProgress(84 + (i - 2) * 5); await sleep(320); }
      setProgress(100);
      const [s] = await create<Simulation>("simulations", { scenarioId: picked.scenarioId, scenarioName: picked.name, goalId: goal?.id ?? null, horizonYears: horizon, paths: N, status: "complete", result: r });
      setSaved(s); setResult(r); await sleep(250); setPhase("done");
    } catch (e) { console.error(e); setPhase("error"); }
  };
  useEffect(() => { if (autorun.current && query && phase === "config" && sel !== "plan") { autorun.current = false; run(); } }); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "running") return (
    <Card className="mx-auto max-w-2xl overflow-hidden !p-0">
      <div className="relative p-8 md:p-10">
        <div className="hatch absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="label mb-2">Simulating · {picked.name}</div>
          <div className="flex items-end gap-4"><span className="num text-[64px] font-bold leading-none">{Math.round(progress)}</span><span className="pb-2 text-[20px] font-bold text-muted">%</span></div>
          <ProgressPill className="mt-5" value={progress / 100} height={10} />
          <div className="mt-3 flex justify-between text-[12.5px] text-muted"><span className="num"><b className="text-fg">{done.toLocaleString()}</b> / {Number(paths).toLocaleString()} futures</span><span>{horizon} years · monthly steps</span></div>
          <ol className="mt-8 space-y-2.5">
            {STAGES.map((s, i) => (
              <motion.li key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: i <= stage ? 1 : 0.35, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 text-[13.5px]">
                <span className={cx("grid h-6 w-6 place-items-center rounded-full transition-colors duration-300", i < stage ? "bg-btn text-accent" : i === stage ? "bg-accent text-accentfg" : "bg-card2 text-faint")}>
                  {i < stage ? <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> : i === stage ? <motion.span className="h-2 w-2 rounded-full bg-current" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <span className={i === stage ? "font-bold" : ""}>{i === 2 ? `Running ${Number(paths).toLocaleString()} futures` : s}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </Card>
  );

  if (phase === "error") return <ErrorState title="We couldn't complete this simulation." what="The model stopped before all paths finished." why="This can happen if an input is extreme or the result couldn't be saved." next="Retry, or review the scenario's assumptions." actions={<><Button size="sm" onClick={run} icon={<RotateCcw className="h-3.5 w-3.5" />}>Retry</Button><Button size="sm" variant="secondary" href="/app/economy">Review assumptions</Button></>} />;

  if (phase === "done" && result) return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Badge tone="pos">Complete</Badge><span className="text-[13px] font-semibold">{picked.name}</span><span className="text-[12px] text-muted">· saved to history</span></div>
        <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setPhase("config")}>New simulation</Button><Button size="sm" variant="secondary" href="/app/compare">Compare</Button>{saved && <Button size="sm" href={`/app/reports?new=1&sim=${saved.id}`}>Create report</Button>}</div>
      </div>
      <SimResults r={result} currency={currency} paths={Number(paths)} name={picked.name} />
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader title="Simulation configuration" />
        <div className="space-y-4">
          <Field label="Scenario"><Select value={sel} onChange={setSel} options={[{ value: "plan", label: "Current plan (no changes)" }, ...scenarios.map((s) => ({ value: `s:${s.id}`, label: `${s.name} · saved` })), ...SCENARIO_TEMPLATES.map((t) => ({ value: `t:${t.name}`, label: `${t.name} · template` }))]} /></Field>
          <Field label="Goal to test"><Select value={goalId} onChange={setGoalId} options={[{ value: "", label: "No goal" }, ...goals.map((g) => ({ value: String(g.id), label: g.name }))]} /></Field>
          <Field label={`Horizon · ${horizon} years`}><Slider label="Horizon" value={horizon} onChange={setHorizon} min={1} max={30} /></Field>
          <Field label="Paths"><Segmented value={paths} onChange={setPaths} options={["100", "300", "600", "1000", "5000"].map((v) => ({ value: v, label: v }))} /></Field>
          <div className="rounded-2xl bg-card2 p-3 text-[12px] text-muted">Economy: <b className="text-fg">{PRESETS[twin.economicPreset]?.label ?? "Custom"}</b> · inflation {a.inflation}% · return {a.investReturn}% ± {a.volatility}% <Link href="/app/economy" className="ml-1 font-semibold text-fg">Edit</Link></div>
          <Button size="lg" className="w-full" onClick={run} icon={<Play className="h-4 w-4" strokeWidth={1.8} />}>Run Simulation</Button>
        </div>
      </Card>
      <div className="grid gap-4 lg:col-span-3 md:grid-cols-2">
        <Card>
          <div className="label mb-2">Current plan</div>
          <div className="space-y-2 text-[13px]">
            {[["Income", fmtMoney(m.income, currency)], ["Expenses", fmtMoney(m.expenses, currency)], ["Monthly surplus", fmtMoney(m.savings, currency)], ["Liquid savings", fmtMoney(m.liquid, currency)], ["Net worth", fmtMoney(m.netWorth, currency)]].map(([l, v]) => <div key={l} className="flex justify-between"><span className="text-muted">{l}</span><span className="num font-semibold">{v}</span></div>)}
          </div>
        </Card>
        <motion.div key={sel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-solid p-5">
          <div className="label mb-2 !text-solidmuted">Scenario</div>
          <div className="text-[18px] font-bold">{picked.name}</div>
          <ul className="mt-3 space-y-1.5 text-[12.5px] text-solidmuted">{describeChanges({ changes: picked.changes } as SimResult).map((d) => <li key={d} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{d}</li>)}</ul>
          {goal && <div className="mt-4 border-t border-white/10 pt-3 text-[12px] text-solidmuted">Testing goal: <b className="text-solidfg">{goal.name}</b> · {fmtMoney(goal.target, currency, { compact: true })} by {new Date(goal.targetDate).getFullYear()}</div>}
        </motion.div>
        <Card className="md:col-span-2">
          <CardHeader title="How this works" />
          <div className="grid gap-3 text-[12.5px] text-muted sm:grid-cols-3">
            <div><b className="text-fg">1 · Your Twin</b><br />Starts from today&apos;s income, spending, accounts and debts.</div>
            <div><b className="text-fg">2 · The change</b><br />Applies the scenario on its timeline, month by month.</div>
            <div><b className="text-fg">3 · Uncertainty</b><br />Each path draws different returns, inflation and income growth.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Sensitivity() {
  const { twin, goals, currency } = useStore();
  const base = effectiveAssumptions(twin);
  const [v, setV] = useState({ savings: 0, incomeGrowth: base.incomeGrowth, inflation: base.inflation, investReturn: base.investReturn, expenses: 0, cost: 0 });
  const goal = goals.find((g) => /home/i.test(g.kind)) ?? goals[0] ?? null;
  const changes = useMemo(() => ({ ...emptyChanges(), expenseChangePct: v.expenses, oneTimeCost: v.cost, oneTimeMonth: 12 }), [v.expenses, v.cost]);
  const assumptions = useMemo(() => ({ ...base, incomeGrowth: v.incomeGrowth, inflation: v.inflation, expenseGrowth: base.expenseGrowth + (v.inflation - base.inflation), investReturn: v.investReturn }), [v, base]); // eslint-disable-line react-hooks/exhaustive-deps
  const { result, running } = useSimulation({ changes, assumptions, extraSavings: v.savings, goal, paths: 300, debounce: 140 });
  const ref = useSimulation({ goal, paths: 300 });
  const controls: { k: keyof typeof v; l: string; min: number; max: number; step: number; f: (x: number) => string }[] = [
    { k: "savings", l: "Monthly savings", min: -5000, max: 10000, step: 250, f: (x) => fmtMoney(x, currency, { sign: true }) },
    { k: "incomeGrowth", l: "Income growth", min: -5, max: 30, step: 0.5, f: (x) => `${x}%` },
    { k: "inflation", l: "Inflation", min: 0, max: 40, step: 0.5, f: (x) => `${x}%` },
    { k: "investReturn", l: "Investment return", min: -5, max: 30, step: 0.5, f: (x) => `${x}%` },
    { k: "expenses", l: "Expenses", min: -30, max: 50, step: 1, f: (x) => `${x > 0 ? "+" : ""}${x}%` },
    { k: "cost", l: "Scenario cost (month 12)", min: 0, max: 1000000, step: 10000, f: (x) => fmtMoney(x, currency, { compact: true }) },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader title="Adjust assumptions" sub="Results update live · 300 paths per change" action={<Button size="sm" variant="ghost" onClick={() => setV({ savings: 0, incomeGrowth: base.incomeGrowth, inflation: base.inflation, investReturn: base.investReturn, expenses: 0, cost: 0 })}>Reset</Button>} />
        <div className="space-y-5">{controls.map((c) => (
          <div key={c.k}><div className="mb-2 flex justify-between text-[12.5px]"><span className="font-semibold">{c.l}</span><span className="num font-bold">{c.f(v[c.k])}</span></div><Slider label={c.l} value={v[c.k]} onChange={(x) => setV((s) => ({ ...s, [c.k]: x }))} min={c.min} max={c.max} step={c.step} /></div>
        ))}</div>
      </Card>
      <div className="space-y-4 lg:col-span-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="card-solid p-5"><div className="flex items-center justify-between text-[12px] text-solidmuted">Median net worth<span className={cx("h-2 w-2 rounded-full", running ? "animate-pulse bg-accent" : "bg-pos")} /></div>{result ? <CountUp value={result.kpis.medianNetWorth} duration={500} format={(x) => fmtMoney(x, currency, { compact: true })} className="mt-2 block text-[28px] font-bold" /> : <div className="mt-2 h-8" />}{result && ref.result && <div className="num mt-1 text-[11.5px] text-accent">{fmtMoney(result.kpis.medianNetWorth - ref.result.kpis.medianNetWorth, currency, { compact: true, sign: true })} vs your assumptions</div>}</div>
          <div className="card p-5"><div className="text-[12px] text-muted">{goal ? `${goal.name} probability` : "Emergency survival"}</div>{result ? <CountUp value={(goal ? result.kpis.goalProbability ?? 0 : result.kpis.emergencySurvival) * 100} duration={500} format={(x) => `${x.toFixed(0)}%`} className="mt-2 block text-[28px] font-bold" /> : <div className="mt-2 h-8" />}</div>
        </div>
        <Card>{result ? <FanChart months={result.months} bands={result.bands} baseline={ref.result?.bands.p50} currency={currency} height={200} /> : <ChartSkeleton h={180} />}</Card>
        <Card><CardHeader title="Which assumptions matter most?" sub="Impact on final net worth when each input moves alone" info="Computed by re-running the model with one variable changed at a time." />{result ? <Tornado items={result.risk.drivers} currency={currency} /> : <ChartSkeleton h={120} />}</Card>
      </div>
    </div>
  );
}

function HistoryList() {
  const { simulations, currency } = useStore();
  const [sel, setSel] = useState<Simulation | null>(null);
  if (simulations.length === 0) return <Card><EmptyState icon={<HistoryIcon className="h-5 w-5" strokeWidth={1.5} />} title="No simulations yet" body="Every run is saved here with its assumptions, so you can revisit or compare it later." /></Card>;
  return (
    <>
      <Card className="!p-2">
        <div className="hidden grid-cols-[1.5fr_1fr_.6fr_.6fr_1fr_.6fr] gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-faint md:grid"><span>Scenario</span><span>Date</span><span>Horizon</span><span>Paths</span><span>Median outcome</span><span>Status</span></div>
        <ul>{simulations.map((s, i) => (
          <motion.li key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.04 }}>
            <button onClick={() => setSel(s)} className="grid w-full grid-cols-2 items-center gap-3 rounded-2xl px-4 py-3 text-left text-[13px] transition hover:bg-glow md:grid-cols-[1.5fr_1fr_.6fr_.6fr_1fr_.6fr]">
              <span className="flex items-center gap-2.5 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-full bg-card2"><FlaskConical className="h-3.5 w-3.5" strokeWidth={1.5} /></span>{s.scenarioName}</span>
              <span className="text-muted max-md:text-right">{fmtDate(s.createdAt)}</span>
              <span className="hidden md:block">{s.horizonYears} yrs</span><span className="num hidden md:block">{s.paths}</span>
              <span className="num font-bold">{fmtMoney(s.result.kpis.medianNetWorth, currency, { compact: true })}</span>
              <span className="max-md:text-right"><Badge tone="pos">{s.status}</Badge></span>
            </button>
          </motion.li>
        ))}</ul>
      </Card>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.scenarioName ?? ""} footer={sel && <div className="flex justify-end gap-2"><Button variant="secondary" href={`/app/compare?ids=${sel.id}`}>Compare</Button><Button href={`/app/simulations/${sel.id}`} icon={<ArrowRight className="h-4 w-4" />}>Full results</Button></div>}>
        {sel && <div className="space-y-4">
          <div className="text-[12.5px] text-muted">{fmtDate(sel.createdAt)} · {sel.paths} paths · {sel.horizonYears} years</div>
          <FanChart months={sel.result.months} bands={sel.result.bands} baseline={sel.result.baselineMedian} currency={currency} height={180} compact />
          <div className="grid grid-cols-2 gap-2">{[["Median", fmtMoney(sel.result.kpis.medianNetWorth, currency, { compact: true })], ["Expected", fmtMoney(sel.result.kpis.expectedNetWorth, currency, { compact: true })], ["Goal probability", sel.result.kpis.goalProbability !== null ? fmtPct(sel.result.kpis.goalProbability, 0) : "—"], ["Emergency survival", fmtPct(sel.result.kpis.emergencySurvival, 0)]].map(([l, v]) => <div key={l} className="rounded-2xl bg-card2 p-3"><div className="text-[11.5px] text-muted">{l}</div><div className="num text-[16px] font-bold">{v}</div></div>)}</div>
          <div><div className="mb-1.5 text-[12.5px] font-bold">What changed</div><ul className="space-y-1 text-[12.5px] text-muted">{describeChanges(sel.result).map((d) => <li key={d}>· {d}</li>)}</ul></div>
          <div className="flex items-center gap-2 text-[12px] text-muted"><SlidersHorizontal className="h-3.5 w-3.5" />Inflation {sel.result.assumptions.inflation}% · return {sel.result.assumptions.investReturn}% ± {sel.result.assumptions.volatility}%</div>
        </div>}
      </Drawer>
    </>
  );
}
