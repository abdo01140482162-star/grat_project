"use client";
import { motion } from "framer-motion";
import { ArrowLeft, FlaskConical, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { useSimulation } from "@/components/hooks";
import { GOAL_ICON, goalStatus } from "@/components/domain";
import { FanChart } from "@/components/charts";
import { CircularProgress, CountUp, Item, ProgressPill, Stagger } from "@/components/motion";
import { Badge, Button, Card, CardHeader, ChartSkeleton, ConfirmDialog, EmptyState, Field, IconCircle, MoneyInput, Slider, TextInput, useToast } from "@/components/ui";
import { effectiveAssumptions, emptyChanges, fmtDate, fmtMoney, fmtPct, monthsBetween, SCENARIO_TEMPLATES } from "@/lib/model";

/** Goal-fund Monte Carlo used by the planner: contributions + investment returns with volatility. */
function goalMC(target: number, months: number, monthly: number, start: number, ret: number, vol: number, paths = 600) {
  let seed = 99; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const n = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r());
  const mu = ret / 100 / 12, sd = vol / 100 / Math.sqrt(12) * 0.6;
  let hit = 0; const finals: number[] = [];
  for (let p = 0; p < paths; p++) { let v = start; for (let t = 0; t < months; t++) v = v * (1 + mu + n() * sd) + monthly; finals.push(v); if (v >= target) hit++; }
  finals.sort((a, b) => a - b);
  return { prob: hit / paths, p10: finals[Math.floor(paths * 0.1)], p50: finals[Math.floor(paths * 0.5)], p90: finals[Math.floor(paths * 0.9)] };
}

export default function GoalDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { goals, currency, twin, update, remove } = useStore();
  const toast = useToast();
  const g = goals.find((x) => x.id === Number(id));
  const [target, setTarget] = useState(g?.target ?? 0); const [date, setDate] = useState(g?.targetDate ?? ""); const [monthly, setMonthly] = useState(g?.monthly ?? 0); const [start, setStart] = useState(g?.current ?? 0);
  const [del, setDel] = useState(false);
  useEffect(() => { if (g) { setTarget(g.target); setDate(g.targetDate); setMonthly(g.monthly); setStart(g.current); } }, [g?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = effectiveAssumptions(twin);
  const months = Math.max(1, monthsBetween(new Date(), new Date(date || Date.now())));
  const plan = useMemo(() => goalMC(target, months, monthly, start, a.investReturn * 0.6, a.volatility), [target, months, monthly, start, a.investReturn, a.volatility]);
  const required = Math.max(0, (target - start) / months);
  const horizon = Math.min(15, Math.max(1, Math.ceil(months / 12)));
  const { result } = useSimulation({ goal: g ?? null, horizonYears: horizon, paths: 300, enabled: !!g });
  const tpl = (n: string) => ({ ...emptyChanges(), ...SCENARIO_TEMPLATES.find((t) => t.name === n)!.changes });
  const job = useSimulation({ goal: g ?? null, horizonYears: horizon, paths: 200, changes: tpl("Lose My Job"), enabled: !!g });
  const save = useSimulation({ goal: g ?? null, horizonYears: horizon, paths: 200, changes: tpl("Save 15% More"), enabled: !!g });
  const infl = useSimulation({ goal: g ?? null, horizonYears: horizon, paths: 200, changes: tpl("High Inflation"), enabled: !!g });

  if (!g) return <Card><EmptyState icon={<ArrowLeft className="h-5 w-5" />} title="Goal not found" action={<Button href="/app/goals">Back to goals</Button>} /></Card>;
  const s = goalStatus(g);
  const dirty = target !== g.target || date !== g.targetDate || monthly !== g.monthly || start !== g.current;
  const elapsed = Math.max(0, Math.min(1, (Date.now() - new Date(g.createdAt).getTime()) / (new Date(g.targetDate).getTime() - new Date(g.createdAt).getTime() || 1)));

  return (
    <div>
      <Link href="/app/goals" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} />Goals</Link>
      <motion.div layoutId={`goal-${g.id}`} className="card-solid mb-4 p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3"><IconCircle tone="accent">{GOAL_ICON[g.kind] ?? GOAL_ICON.Custom}</IconCircle><div><h1 className="text-[24px] font-bold tracking-tight">{g.name}</h1><div className="text-[12.5px] text-solidmuted">{g.kind} · by {fmtDate(g.targetDate)}</div></div></div>
            <div className="mt-6 flex items-end gap-3"><CountUp value={g.current} format={(v) => fmtMoney(v, currency)} className="text-[36px] font-bold leading-none" /><span className="num pb-1 text-[14px] text-solidmuted">→ {fmtMoney(g.target, currency)}</span></div>
            <div className="mt-4"><div className="relative h-3 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${s.p * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} /></div></div>
          </div>
          <div className="flex gap-6">
            <CircularProgress value={g.probability ?? plan.prob} size={96} stroke={8} track="rgba(255,255,255,.1)"><div className="text-center"><div className="num text-[18px] font-bold">{fmtPct(g.probability ?? plan.prob, 0)}</div><div className="text-[9.5px] text-solidmuted">{g.probability !== null ? "simulated" : "plan est."}</div></div></CircularProgress>
          </div>
        </div>
      </motion.div>
      <Stagger className="grid gap-4 md:grid-cols-3">
        <Item><Card className="h-full"><CardHeader title="Timeline" sub="Today → target date" /><div className="mb-2 flex justify-between text-[12px] text-muted"><span>{fmtDate(g.createdAt)}</span><span>{fmtDate(g.targetDate)}</span></div><ProgressPill value={elapsed} tone="ink" height={6} marker={s.p} /><div className="mt-3 text-[12.5px]"><b className="num">{s.months}</b> <span className="text-muted">months remaining · amber marker shows savings progress</span></div></Card></Item>
        <Item><Card className="h-full"><CardHeader title="Required monthly saving" sub="Without investment growth" /><CountUp value={s.required} format={(v) => fmtMoney(v, currency)} className="text-[28px] font-bold" /><div className="mt-2 flex items-center gap-2 text-[12px]"><Badge tone={s.onPace ? "pos" : "warn"}>{s.onPace ? "Contribution covers it" : "Contribution short"}</Badge><span className="num text-muted">now {fmtMoney(g.monthly, currency)}/mo</span></div></Card></Item>
        <Item><Card className="h-full"><CardHeader title="Status" /><Badge tone={s.tone}>{s.label}</Badge><p className="mt-3 text-[12.5px] text-muted">Under the selected simulation assumptions, the estimated probability is {fmtPct(g.probability ?? plan.prob, 0)}. This is not a guarantee.</p><Button className="mt-4" size="sm" href={`/app/simulations?goal=${g.id}`} icon={<FlaskConical className="h-3.5 w-3.5" />}>Simulate Goal</Button></Card></Item>
      </Stagger>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Goal planner" sub="Adjust and watch the outcome respond" />
          <div className="space-y-5">
            <Field label="Target"><MoneyInput value={target} onChange={setTarget} currency={currency} /></Field>
            <Slider label="Target" value={target} onChange={setTarget} min={Math.round(g.target * 0.3)} max={Math.round(g.target * 2)} step={1000} />
            <Field label="Target date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label={`Monthly contribution · ${fmtMoney(monthly, currency)}`}><Slider label="Monthly contribution" value={monthly} onChange={setMonthly} min={0} max={Math.max(20000, Math.round(required * 2.5))} step={250} /></Field>
            <Field label={`Starting balance · ${fmtMoney(start, currency)}`}><Slider label="Starting balance" value={start} onChange={setStart} min={0} max={Math.round(target)} step={1000} /></Field>
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Possible outcome range" sub={`Goal fund at ${fmtDate(date || g.targetDate)} · 600 paths · ${(a.investReturn * 0.6).toFixed(1)}% avg return`} />
          <div className="grid grid-cols-3 gap-3">
            {[{ l: "Cautious (10th)", v: plan.p10 }, { l: "Median", v: plan.p50, hi: true }, { l: "Optimistic (90th)", v: plan.p90 }].map((x) => (
              <div key={x.l} className={x.hi ? "rounded-[18px] bg-accentsoft p-4" : "rounded-[18px] bg-card2 p-4"}><div className="text-[11.5px] font-semibold text-muted">{x.l}</div><CountUp value={x.v} format={(v) => fmtMoney(v, currency, { compact: true })} duration={500} className="mt-1 block text-[20px] font-bold" /></div>
            ))}
          </div>
          <div className="relative mt-6 h-10">
            <div className="hatch absolute top-4 h-2 rounded-full bg-card2" style={{ left: `${Math.min(100, (plan.p10 / Math.max(target, plan.p90) * 100))}%`, right: `${100 - Math.min(100, (plan.p90 / Math.max(target, plan.p90)) * 100)}%` }} />
            <motion.div className="absolute top-2 h-6 w-1 rounded-full bg-fg" animate={{ left: `${Math.min(100, (plan.p50 / Math.max(target, plan.p90)) * 100)}%` }} transition={{ duration: 0.4 }} />
            <motion.div className="absolute -top-1 text-[10.5px] font-bold text-muted" animate={{ left: `calc(${Math.min(100, (target / Math.max(target, plan.p90)) * 100)}% - 18px)` }}>Target</motion.div>
            <motion.div className="absolute top-3 h-4 w-0.5 bg-accent" animate={{ left: `${Math.min(100, (target / Math.max(target, plan.p90)) * 100)}%` }} />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-card2 p-4">
            <div><div className="text-[12px] text-muted">Estimated probability of reaching target</div><CountUp value={plan.prob * 100} format={(v) => `${v.toFixed(0)}%`} duration={500} className="text-[26px] font-bold" /></div>
            <div className="text-right"><div className="text-[12px] text-muted">Required without growth</div><CountUp value={required} format={(v) => fmtMoney(v, currency) + "/mo"} duration={500} className="text-[15px] font-bold" /></div>
          </div>
          {dirty && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => { setTarget(g.target); setDate(g.targetDate); setMonthly(g.monthly); setStart(g.current); }}>Reset</Button><Button onClick={async () => { await update("goals", g.id, { target, targetDate: date, monthly, current: start, probability: null }); toast("Goal plan saved"); }}>Save plan</Button></motion.div>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3"><CardHeader title="Net worth outlook to goal date" sub="Full Twin simulation · current plan" />{result ? <FanChart months={result.months} bands={result.bands} currency={currency} height={220} /> : <ChartSkeleton h={200} />}</Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Scenario impact" sub="Goal probability under each scenario" info="Probability that liquid and invested wealth at the target date covers the goal target." />
          <div className="space-y-3">
            {[{ l: "Current plan", r: result }, { l: "Lose My Job", r: job.result }, { l: "Save 15% More", r: save.result }, { l: "High Inflation", r: infl.result }].map((x, i) => (
              <div key={x.l} className={i === 0 ? "card-solid !rounded-2xl p-3" : "rounded-2xl bg-card2 p-3"}>
                <div className="mb-1.5 flex justify-between text-[12.5px]"><span className="font-semibold">{x.l}</span><span className="num font-bold">{x.r ? fmtPct(x.r.kpis.goalProbability ?? 0, 0) : "…"}</span></div>
                <ProgressPill value={x.r?.kpis.goalProbability ?? 0} height={5} tone={i === 0 ? "accent" : "ink"} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-6 flex justify-end"><Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDel(true)}>Delete goal</Button></div>
      <ConfirmDialog open={del} onClose={() => setDel(false)} title={`Delete "${g.name}"?`} body="Its simulation history stays, but the goal will no longer be tracked." onConfirm={async () => { await remove("goals", g.id); toast("Goal deleted"); router.push("/app/goals"); }} />
    </div>
  );
}
