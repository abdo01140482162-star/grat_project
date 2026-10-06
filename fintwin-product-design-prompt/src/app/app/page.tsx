"use client";
import { ArrowUpRight, Brain, Briefcase, Flame, Home, PiggyBank, Play, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/components/store";
import { useSimulation } from "@/components/hooks";
import { FanChart } from "@/components/charts";
import { CountUp, Item, ProgressPill, Stagger } from "@/components/motion";
import { Badge, Button, Card, CardHeader, ChartSkeleton, EmptyState, MetricCard, Segmented } from "@/components/ui";
import { InsightCard, goalStatus } from "@/components/domain";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/model";
import { useState } from "react";

export default function Overview() {
  const { user, m, currency, goals, simulations, transactions, twin } = useStore();
  const [view, setView] = useState<"range" | "paths">("range");
  const { result } = useSimulation({ paths: 400 });
  const money = (v: number) => fmtMoney(v, currency);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = user.name.split(" ")[0];
  const home = goals.find((g) => /home/i.test(g.kind + g.name)) ?? goals[0];

  const risks = useMemo(() => [
    { label: "Emergency coverage", value: `${m.coverage.toFixed(1)} mo`, score: Math.min(1, m.coverage / 6), note: m.coverage >= 6 ? "Comfortable buffer" : m.coverage >= 3 ? "Below the common 6-month guide" : "Thin buffer", tone: m.coverage >= 6 ? "pos" : m.coverage >= 3 ? "warn" : "neg" },
    { label: "Debt payments / income", value: fmtPct(m.dti, 0), score: Math.max(0, 1 - m.dti / 0.4), note: m.dti < 0.2 ? "Light debt load" : "Watch debt load", tone: m.dti < 0.2 ? "pos" : m.dti < 0.36 ? "warn" : "neg" },
    { label: "Savings rate", value: fmtPct(m.savingsRate, 0), score: Math.min(1, Math.max(0, m.savingsRate / 0.3)), note: m.savingsRate >= 0.2 ? "Strong" : m.savingsRate > 0 ? "Positive, room to grow" : "Spending exceeds income", tone: m.savingsRate >= 0.2 ? "pos" : m.savingsRate > 0 ? "warn" : "neg" },
    { label: "Expense vs income growth", value: `${twin.assumptions.expenseGrowth}% / ${twin.assumptions.incomeGrowth}%`, score: Math.max(0, Math.min(1, 0.5 + (twin.assumptions.incomeGrowth - twin.assumptions.expenseGrowth) / 10)), note: twin.assumptions.expenseGrowth > twin.assumptions.incomeGrowth ? "Surplus shrinks over time" : "Surplus can grow", tone: twin.assumptions.expenseGrowth > twin.assumptions.incomeGrowth ? "warn" : "pos" },
  ] as const, [m, twin]);

  const insights = useMemo(() => {
    const list: { title: string; body: string; href: string; cta: string }[] = [];
    list.push({ title: "Emergency runway", body: `Your liquid savings cover about ${m.coverage.toFixed(1)} months of essentials under the current model.`, href: "/app/ai?q=How%20long%20could%20my%20savings%20cover%20my%20expenses%3F", cta: "View calculation" });
    if (result && home) list.push({ title: `${home.name} outlook`, body: `The simulation estimates a median net worth of ${fmtMoney(result.kpis.medianNetWorth, currency, { compact: true })} in ${result.months[result.months.length - 1] / 12} years under the selected assumptions.`, href: `/app/goals/${home.id}`, cta: "Simulate goal" });
    const food = transactions.filter((t) => t.category === "Food").slice(0, 8);
    if (food.length) list.push({ title: "Spending signal", body: `Food is your most frequent flexible expense this quarter. Ask what changed this month to see the comparison.`, href: "/app/ai?q=What%20changed%20in%20my%20finances%20this%20month%3F", cta: "Ask AI" });
    return list.slice(0, 3);
  }, [m, result, home, currency, transactions]);

  const proj = result ? result.kpis : null;
  return (
    <div>
      <Stagger gap={0.07}>
        <Item className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="label mb-2">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
            <h1 className="text-[28px] font-bold tracking-tight md:text-[34px]">{greet}, {first}.</h1>
            <p className="mt-1 text-[13.5px] text-muted">Here&apos;s your financial life today — and the range of futures it points toward.</p>
          </div>
          <div className="flex gap-2"><Button variant="secondary" href="/app/ai" icon={<Sparkles className="h-4 w-4" strokeWidth={1.6} />}>Ask AI</Button><Button href="/app/simulations" icon={<Play className="h-4 w-4" strokeWidth={1.6} />}>Run simulation</Button></div>
        </Item>

        <Item className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
          <MetricCard solid className="col-span-2 lg:col-span-1" label="Net worth" value={m.netWorth} format={money} delta={proj ? `${fmtMoney(proj.medianNetWorth, currency, { compact: true })} median` : undefined} sub={proj ? `in ${result!.months[result!.months.length - 1] / 12} yrs` : "projecting…"} info="Assets minus debts, from your Financial Twin." />
          <MetricCard label="Monthly income" value={m.income} format={money} delta={`+${twin.assumptions.incomeGrowth}%/yr`} sub="assumed" />
          <MetricCard label="Expenses" value={m.expenses} format={money} delta={fmtPct(m.expenses / Math.max(1, m.income), 0)} deltaTone="neutral" sub="of income" />
          <MetricCard label="Monthly savings" value={m.savings} format={money} delta={fmtPct(m.savingsRate, 0)} deltaTone={m.savings >= 0 ? "pos" : "neg"} sub="savings rate" />
          <MetricCard label="Financial stability" value={m.coverage} format={(v) => `${v.toFixed(1)} mo`} delta={m.coverage >= 6 ? "Strong" : m.coverage >= 3 ? "Moderate" : "Thin"} deltaTone={m.coverage >= 6 ? "pos" : m.coverage >= 3 ? "warn" : "neg"} sub="essential coverage" info="Liquid savings divided by essential monthly spending." />
        </Item>

        <Item className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Future projection" sub={result ? `${result.months.length > 1 ? "Monte Carlo · 400 possible futures · " : ""}current plan` : "Simulating possible futures…"} info="Each shaded band shows where a share of simulated futures land. The future is a distribution, not one line."
              action={<Segmented size="sm" value={view} onChange={setView} options={[{ value: "range", label: "Range" }, { value: "paths", label: "Scenarios" }]} />} />
            {result ? (
              view === "range" ? <FanChart months={result.months} bands={result.bands} currency={currency} height={250} /> : (
                <div className="grid grid-cols-3 gap-3">
                  {[{ l: "Stress (15th)", v: result.percentiles["15"] }, { l: "Median (50th)", v: result.percentiles["50"], hi: true }, { l: "Optimistic (85th)", v: result.percentiles["85"] }].map((x) => (
                    <div key={x.l} className={x.hi ? "card-solid p-4" : "rounded-[18px] border border-line bg-card2 p-4"}>
                      <div className={`text-[11.5px] font-semibold ${x.hi ? "text-solidmuted" : "text-muted"}`}>{x.l}</div>
                      <CountUp value={x.v} format={(v) => fmtMoney(v, currency, { compact: true })} className={`mt-2 block text-[22px] font-bold ${x.hi ? "text-accent" : ""}`} />
                      <div className={`mt-1 text-[11px] ${x.hi ? "text-solidmuted" : "text-muted"}`}>net worth in {result.months[result.months.length - 1] / 12} yrs</div>
                    </div>
                  ))}
                  <p className="col-span-3 text-[11.5px] text-muted">Values are simulation estimates under the selected assumptions, not predictions.</p>
                </div>
              )
            ) : <div className="h-[280px]"><ChartSkeleton h={220} /></div>}
          </Card>
          <Card>
            <CardHeader title="Financial risk" sub="Measurable areas, from your Twin" action={<Link href="/app/health" className="text-[12px] font-semibold text-muted hover:text-fg">Details</Link>} />
            <div className="space-y-4">
              {risks.map((r) => (
                <div key={r.label}>
                  <div className="mb-1.5 flex items-center justify-between text-[12.5px]"><span className="font-semibold">{r.label}</span><span className="num font-bold">{r.value}</span></div>
                  <ProgressPill value={r.score} tone={r.tone === "pos" ? "ink" : r.tone === "warn" ? "accent" : "neg"} height={6} />
                  <div className="mt-1 text-[11px] text-muted">{r.note}</div>
                </div>
              ))}
            </div>
          </Card>
        </Item>

        <Item className="mt-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-bold tracking-tight">What if…</h2><Link href="/app/scenarios" className="text-[12px] font-semibold text-muted hover:text-fg">Scenario library</Link></div>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:px-0">
            {[{ t: "Lose My Job", d: "Income pauses for 6 months", i: <Briefcase className="h-4 w-4" strokeWidth={1.5} /> }, { t: "Save 15% More", d: "Redirect flexible spending", i: <PiggyBank className="h-4 w-4" strokeWidth={1.5} /> }, { t: "Buy a Home", d: "Down payment + mortgage", i: <Home className="h-4 w-4" strokeWidth={1.5} /> }, { t: "High Inflation", d: "Prices outpace income", i: <Flame className="h-4 w-4" strokeWidth={1.5} /> }].map((w) => (
              <Link key={w.t} href={`/app/simulations?template=${encodeURIComponent(w.t)}`} className="card lift group flex min-w-[220px] items-center gap-3 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-card2 transition-colors group-hover:bg-accent group-hover:text-accentfg">{w.i}</span>
                <div className="flex-1"><div className="text-[13.5px] font-bold">{w.t}</div><div className="text-[11.5px] text-muted">{w.d}</div></div>
                <ArrowUpRight className="h-4 w-4 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.5} />
              </Link>
            ))}
          </div>
        </Item>

        <Item className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <div className="flex items-center gap-2"><Brain className="h-4 w-4" strokeWidth={1.5} /><h2 className="text-[15px] font-bold tracking-tight">AI insights</h2><Badge tone="neutral" dot={false}>Grounded in your Twin</Badge></div>
            {insights.map((x) => <InsightCard key={x.title} {...x} />)}
          </div>
          <Card className="lg:col-span-1">
            <CardHeader title="Goals" sub={`${goals.length} active`} action={<Link href="/app/goals" className="text-[12px] font-semibold text-muted hover:text-fg">All goals</Link>} />
            {goals.length === 0 ? <EmptyState icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.5} />} title="No goals yet" body="Give your future something to measure." /> : (
              <div className="space-y-4">{goals.slice(0, 4).map((g) => { const s = goalStatus(g); return (
                <Link key={g.id} href={`/app/goals/${g.id}`} className="block rounded-2xl p-1 transition hover:bg-glow">
                  <div className="mb-1.5 flex justify-between text-[12.5px]"><span className="font-semibold">{g.name}</span><span className="num text-muted">{fmtMoney(g.current, currency, { compact: true })} / {fmtMoney(g.target, currency, { compact: true })}</span></div>
                  <ProgressPill value={s.p} height={6} />
                  <div className="mt-1 flex justify-between text-[11px] text-muted"><span>{s.label}</span><span>{g.probability !== null ? `${fmtPct(g.probability, 0)} simulated` : fmtDate(g.targetDate)}</span></div>
                </Link>
              ); })}</div>
            )}
          </Card>
          <Card className="lg:col-span-1">
            <CardHeader title="Recent simulations" action={<Link href="/app/simulations?tab=history" className="text-[12px] font-semibold text-muted hover:text-fg">History</Link>} />
            {simulations.length === 0 ? <EmptyState icon={<Play className="h-5 w-5" strokeWidth={1.5} />} title="No simulations yet" body="Test a decision before you make it." action={<Button size="sm" href="/app/simulations">Run your first</Button>} /> : (
              <ul className="space-y-1">{simulations.slice(0, 5).map((s) => (
                <li key={s.id}><Link href={`/app/simulations/${s.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-glow">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-card2"><Play className="h-3.5 w-3.5" strokeWidth={1.6} /></span>
                  <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold">{s.scenarioName}</div><div className="text-[11px] text-muted">{fmtDate(s.createdAt)} · {s.paths} paths</div></div>
                  <span className="num text-[12.5px] font-bold">{fmtMoney(s.result.kpis.medianNetWorth, currency, { compact: true })}</span>
                </Link></li>
              ))}</ul>
            )}
          </Card>
        </Item>
      </Stagger>
    </div>
  );
}
