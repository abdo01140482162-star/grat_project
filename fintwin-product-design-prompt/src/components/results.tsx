"use client";
import { ChevronDown, Database, FlaskConical, Layers, Sigma, SlidersHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";
import { type SimResult, fmtMoney, fmtPct } from "@/lib/model";
import { FanChart, Histogram, Tornado } from "./charts";
import { Collapse, CountUp, Item, ProgressPill, Stagger, CircularProgress } from "./motion";
import { Badge, Card, CardHeader, Segmented, cx } from "./ui";

export function describeChanges(r: SimResult) {
  const c = r.changes; const out: string[] = [];
  if (c.incomeChangePct) out.push(`Income ${c.incomeChangePct > 0 ? "+" : ""}${c.incomeChangePct}% from month ${c.incomeStartMonth}${c.incomeDurationMonths ? ` for ${c.incomeDurationMonths} months` : ""}`);
  if (c.expenseChangePct) out.push(`Expenses ${c.expenseChangePct > 0 ? "+" : ""}${c.expenseChangePct}%`);
  if (c.expenseChangeAmount) out.push(`Monthly costs +${Math.round(c.expenseChangeAmount).toLocaleString()}`);
  if (c.oneTimeCost) out.push(`One-time cost ${Math.round(c.oneTimeCost).toLocaleString()} in month ${c.oneTimeMonth}`);
  if (c.savingsBoostPct) out.push(`Redirect ${c.savingsBoostPct}% of income to savings`);
  if (c.newDebtAmount) out.push(`New loan ${Math.round(c.newDebtAmount).toLocaleString()} · ${Math.round(c.newDebtPayment).toLocaleString()}/mo × ${c.newDebtMonths}`);
  if (c.assetPurchase) out.push(`Asset added worth ${Math.round(c.assetPurchase).toLocaleString()}`);
  if (Object.keys(c.econ ?? {}).length) out.push(`Economic override: ${Object.entries(c.econ).map(([k, v]) => `${k} ${v}%`).join(", ")}`);
  return out.length ? out : ["No changes — current plan"];
}

export function SimResults({ r, currency, paths, name, explain = true }: { r: SimResult; currency: string; paths: number; name: string; explain?: boolean }) {
  const [tab, setTab] = useState<"distribution" | "percentiles" | "risk">("distribution");
  const [ctx, setCtx] = useState(false);
  const k = r.kpis;
  const yrs = r.months[r.months.length - 1] / 12;
  const c = (v: number) => fmtMoney(v, currency, { compact: true });
  const diff = k.medianNetWorth - k.baselineMedian;
  return (
    <div className="space-y-4">
      <Stagger gap={0.08} className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Item className="col-span-2 lg:col-span-1"><div className="card-solid h-full p-5"><div className="text-[12px] font-semibold text-solidmuted">Expected net worth</div><CountUp value={k.expectedNetWorth} format={c} className="mt-3 block text-[30px] font-bold" /><div className="mt-2 text-[11.5px] text-solidmuted">mean · median <span className="num text-accent">{c(k.medianNetWorth)}</span> in {yrs} yrs</div></div></Item>
        <Item><div className="card h-full p-5"><div className="text-[12px] font-semibold text-muted">Goal probability</div>{k.goalProbability !== null ? <div className="mt-2 flex items-center gap-3"><CircularProgress value={k.goalProbability} size={56}><span className="num text-[12px] font-bold">{Math.round(k.goalProbability * 100)}%</span></CircularProgress><span className="text-[11.5px] text-muted">{r.goal?.name}</span></div> : <div className="mt-3 text-[13px] text-muted">No goal selected</div>}</div></Item>
        <Item><div className="card h-full p-5"><div className="text-[12px] font-semibold text-muted">Emergency fund survival</div><CountUp value={k.emergencySurvival * 100} format={(v) => `${v.toFixed(0)}%`} className="mt-3 block text-[26px] font-bold" /><div className="text-[11.5px] text-muted">futures where cash never runs out</div></div></Item>
        <Item><div className="card h-full p-5"><div className="text-[12px] font-semibold text-muted">Cash shortfall</div><CountUp value={k.shortfallProbability * 100} format={(v) => `${v.toFixed(0)}%`} className="mt-3 block text-[26px] font-bold" /><div className="text-[11.5px] text-muted">{k.medianShortfall > 0 ? `median gap ${c(k.medianShortfall)}` : "chance of needing to borrow"}</div></div></Item>
        <Item><div className="card h-full p-5"><div className="text-[12px] font-semibold text-muted">Monthly cash flow</div><CountUp value={k.monthlyCashFlow} format={(v) => fmtMoney(v, currency, { sign: true })} className={cx("mt-3 block text-[22px] font-bold", k.monthlyCashFlow < 0 && "text-neg")} /><div className="text-[11.5px] text-muted">{k.runwayMonths < 999 ? `runway ${k.runwayMonths.toFixed(1)} months` : "when the change starts"}</div></div></Item>
      </Stagger>

      {explain && (
        <Card className="!bg-glow">
          <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accentfg"><Sparkles className="h-4 w-4" strokeWidth={1.7} /></span>
            <div className="text-[13.5px] leading-relaxed">
              <p>Under the selected assumptions, <b>{name}</b> leads to an estimated median net worth of <b className="num">{c(k.medianNetWorth)}</b> after {yrs} years — <b className="num">{fmtMoney(diff, currency, { compact: true, sign: true })}</b> versus your current plan. In 90% of simulated futures the result falls between <span className="num">{c(r.percentiles["5"])}</span> and <span className="num">{c(r.percentiles["95"])}</span>.
                {k.emergencySurvival < 0.98 && <> Cash runs out before other assets in about <b>{fmtPct(1 - k.emergencySurvival, 0)}</b> of paths.</>}
                {k.goalProbability !== null && <> The estimated probability of reaching <b>{r.goal?.name}</b> is <b>{fmtPct(k.goalProbability, 0)}</b>.</>}</p>
              <p className="mt-1.5 text-[11.5px] text-muted">The biggest driver in this model is {r.risk.drivers[0]?.label.toLowerCase()}. Simulation outputs are estimates, not predictions.</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Future distribution" sub={`${paths.toLocaleString()} simulated futures · ${yrs} years`} action={<Segmented size="sm" value={tab} onChange={setTab} options={[{ value: "distribution", label: "Range" }, { value: "percentiles", label: "Percentiles" }, { value: "risk", label: "Risk" }]} />} />
        {tab === "distribution" && <FanChart months={r.months} bands={r.bands} baseline={r.baselineMedian} currency={currency} height={300} />}
        {tab === "percentiles" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2"><Histogram bins={r.histogram} percentiles={r.percentiles} currency={currency} height={220} /></div>
            <div className="space-y-1.5">
              {["95", "85", "75", "50", "25", "15", "5"].map((p) => (
                <div key={p} className={cx("flex items-center justify-between rounded-xl px-3 py-2 text-[13px]", p === "50" ? "bg-accentsoft font-bold" : "bg-card2")}><span>{p}th percentile</span><span className="num font-semibold">{fmtMoney(r.percentiles[p], currency)}</span></div>
              ))}
            </div>
          </div>
        )}
        {tab === "risk" && <RiskAnalysis r={r} currency={currency} />}
      </Card>

      <Card>
        <button onClick={() => setCtx((v) => !v)} className="flex w-full items-center justify-between text-left" aria-expanded={ctx}>
          <span className="text-[14px] font-bold">Model transparency</span>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">View model context<ChevronDown className={cx("h-4 w-4 transition-transform", ctx && "rotate-180")} strokeWidth={1.6} /></span>
        </button>
        <Collapse open={ctx}>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { i: <Layers className="h-4 w-4" />, t: "Financial Twin", d: ["Income, expenses, accounts, assets and liabilities at run time"] },
              { i: <SlidersHorizontal className="h-4 w-4" />, t: "Scenario — what changed", d: describeChanges(r) },
              { i: <Database className="h-4 w-4" />, t: "Economic assumptions", d: [`Inflation ${r.assumptions.inflation}%`, `Income growth ${r.assumptions.incomeGrowth}%`, `Expense growth ${r.assumptions.expenseGrowth}%`, `Return ${r.assumptions.investReturn}% ± ${r.assumptions.volatility}%`] },
              { i: <FlaskConical className="h-4 w-4" />, t: "Monte Carlo", d: [`${paths.toLocaleString()} paths · monthly steps · ${yrs} years`, "Random returns, inflation and income growth per path"] },
              { i: <Sigma className="h-4 w-4" />, t: "Results", d: ["Percentiles 5/15/25/50/75/85/95", "Expected = mean of final net worth"] },
              { i: <Sparkles className="h-4 w-4" />, t: "Explanation", d: ["Generated from the numbers above — no external data"] },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl bg-card2 p-4"><div className="mb-2 flex items-center gap-2 text-[12.5px] font-bold">{x.i}{x.t}</div><ul className="space-y-1 text-[12px] text-muted">{x.d.map((d) => <li key={d}>{d}</li>)}</ul></div>
            ))}
          </div>
        </Collapse>
      </Card>
    </div>
  );
}

export function RiskAnalysis({ r, currency }: { r: SimResult; currency: string }) {
  const items = [
    { t: "Cash flow stress", v: r.risk.cashFlowStress, d: "Share of simulated months where spending exceeds income." },
    { t: "Emergency fund risk", v: r.risk.emergencyRisk, d: "Share of futures where cash savings are fully used." },
    ...(r.risk.goalRisk !== null ? [{ t: "Goal risk", v: r.risk.goalRisk, d: `Share of futures that miss ${r.goal?.name}.` }] : []),
    { t: "Financial risk", v: r.kpis.shortfallProbability, d: "Share of futures needing to borrow to cover a gap." },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {items.map((x) => (
          <div key={x.t}>
            <div className="mb-1.5 flex justify-between text-[13px]"><span className="font-semibold">{x.t}</span><Badge tone={x.v < 0.1 ? "pos" : x.v < 0.35 ? "warn" : "neg"}>{fmtPct(x.v, 0)}</Badge></div>
            <ProgressPill value={x.v} height={6} tone={x.v < 0.1 ? "ink" : x.v < 0.35 ? "accent" : "neg"} />
            <div className="mt-1 text-[11.5px] text-muted">{x.d}</div>
          </div>
        ))}
      </div>
      <div><div className="mb-3 text-[13px] font-bold">Risk drivers <span className="font-normal text-muted">· change in final net worth</span></div><Tornado items={r.risk.drivers} currency={currency} /></div>
    </div>
  );
}
