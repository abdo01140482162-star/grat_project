"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { useQuery } from "@/components/hooks";
import { BarChart, LineChart } from "@/components/charts";
import { CountUp, Item, ProgressPill, Stagger } from "@/components/motion";
import { Button, Card, CardHeader, EmptyState, MetricCard, PageHeader, Segmented, Slider } from "@/components/ui";
import { CATEGORY_ICON } from "@/components/domain";
import { ESSENTIAL, EXPENSE_KEYS, EXPENSE_LABELS, fmtMoney, fmtPct } from "@/lib/model";
import { BarChart3 } from "lucide-react";

type Tab = "networth" | "cashflow" | "spending" | "debt" | "savings";
const ESSENTIAL_CATS = ["Housing", "Food", "Transportation", "Utilities", "Healthcare", "Education", "Debt", "Family"];
const RECURRING = ["Housing", "Utilities", "Subscriptions", "Debt", "Family"];

export default function AnalyticsPage() {
  const { transactions, twin, m, currency, accounts } = useStore();
  const router = useRouter();
  const query = useQuery();
  const [tab, setTab] = useState<Tab>("networth");
  const [extra, setExtra] = useState(0);
  useEffect(() => { const t = query?.get("tab") as Tab | null; if (t) setTab(t); }, [query]);
  const money = (v: number) => fmtMoney(v, currency);

  const monthly = useMemo(() => {
    const now = new Date();
    const keys = Array.from({ length: 4 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 3 + i, 1).toISOString().slice(0, 7));
    return keys.map((k) => {
      const tx = transactions.filter((t) => t.date.startsWith(k));
      const income = tx.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = -tx.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
      const cats: Record<string, number> = {};
      tx.filter((t) => t.kind === "expense").forEach((t) => { cats[t.category] = (cats[t.category] ?? 0) - t.amount; });
      return { key: k, label: new Date(k + "-01").toLocaleDateString("en-GB", { month: "short" }), income, expenses, net: income - expenses, cats };
    });
  }, [transactions]);
  const nwSeries = useMemo(() => { let nw = m.netWorth; const out = [nw]; for (let i = monthly.length - 1; i > 0; i--) { nw -= monthly[i].net; out.unshift(nw); } return out; }, [m.netWorth, monthly]);
  const allCats = useMemo(() => { const c: Record<string, number> = {}; monthly.forEach((mo) => Object.entries(mo.cats).forEach(([k, v]) => { c[k] = (c[k] ?? 0) + v; })); return Object.entries(c).sort((a, b) => b[1] - a[1]); }, [monthly]);
  const totalSpend = allCats.reduce((s, [, v]) => s + v, 0);
  const essential = allCats.filter(([k]) => ESSENTIAL_CATS.includes(k)).reduce((s, [, v]) => s + v, 0);
  const recurring = allCats.filter(([k]) => RECURRING.includes(k)).reduce((s, [, v]) => s + v, 0);
  const last = monthly[monthly.length - 1], prev = monthly[monthly.length - 2];

  const payoff = useMemo(() => {
    const debts = twin.liabilities.map((l) => ({ ...l }));
    const total0 = debts.reduce((s, d) => s + d.balance, 0) + m.creditCards;
    const run = (ex: number) => { let bal = total0, months = 0, interest = 0; const pay = m.debtPayments + (m.creditCards > 0 ? m.creditCards * 0.05 : 0) + ex; const rate = (debts.reduce((s, d) => s + d.rate * d.balance, 0) + m.creditCards * 28) / Math.max(1, total0) / 100 / 12; const series = [bal]; while (bal > 1 && months < 360) { const i = bal * rate; interest += i; bal = bal + i - pay; months++; if (months % 3 === 0) series.push(Math.max(0, bal)); if (pay <= i) break; } return { months, interest, series }; };
    return { total0, base: run(0), extra: run(extra) };
  }, [twin.liabilities, m, extra]);

  return (
    <div>
      <PageHeader eyebrow="Intelligence" title="Analytics" sub="What happened, and why — the foundation for exploring what could happen next." actions={<Segmented value={tab} onChange={setTab} options={[{ value: "networth", label: "Net worth" }, { value: "cashflow", label: "Cash flow" }, { value: "spending", label: "Spending" }, { value: "debt", label: "Debt" }, { value: "savings", label: "Savings" }]} />} />
      {transactions.length === 0 && tab !== "networth" && tab !== "debt" ? <Card><EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No transactions yet" body="Add or import transactions to unlock deeper analytics." action={<Button href="/app/transactions?import=1">Import transactions</Button>} /></Card> : (
      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {tab === "networth" && <Stagger className="grid gap-4 lg:grid-cols-3">
          <Item className="lg:col-span-2"><Card><CardHeader title="Net worth over time" sub="Reconstructed from monthly net cash flow" /><LineChart series={[{ label: "Net worth", data: nwSeries, fill: true }]} labels={monthly.map((x) => x.label)} currency={currency} height={240} /></Card></Item>
          <Item><Card className="h-full"><CardHeader title="Assets vs debt" />
            <div className="mb-4 flex h-4 overflow-hidden rounded-full"><motion.div className="bg-fg" initial={{ width: 0 }} animate={{ width: `${(m.totalAssets / (m.totalAssets + m.totalDebt || 1)) * 100}%` }} transition={{ duration: 0.8 }} /><div className="hatch flex-1 bg-card2" /></div>
            {[["Cash & bank", m.liquid], ["Investments", m.investments], ["Property & vehicles", twin.assets.filter((a) => a.type === "Property" || a.type === "Vehicle").reduce((s, a) => s + a.value, 0)], ["Other assets", twin.assets.filter((a) => a.type === "Business" || a.type === "Other").reduce((s, a) => s + a.value, 0)], ["Debt", -m.totalDebt]].map(([l, v]) => (
              <div key={l as string} className="flex items-center justify-between border-b border-line py-2.5 text-[13px] last:border-0"><span className="text-muted">{l}</span><span className="num font-semibold">{money(v as number)}</span></div>
            ))}
          </Card></Item>
        </Stagger>}
        {tab === "cashflow" && <Stagger className="grid gap-4">
          <Item className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard solid label="Income this month" value={last.income} format={money} />
            <MetricCard label="Expenses this month" value={last.expenses} format={money} delta={prev?.expenses ? fmtPct((last.expenses - prev.expenses) / prev.expenses, 0, true) : undefined} deltaTone="neutral" sub="vs last month" />
            <MetricCard label="Net cash flow" value={last.net} format={(v) => fmtMoney(v, currency, { sign: true })} />
            <MetricCard label="Modeled monthly surplus" value={m.savings} format={money} sub="from Twin" />
          </Item>
          <Item><Card><CardHeader title="Income vs expenses" sub="Solid = income · hatched = expenses" /><BarChart data={monthly.map((x) => ({ label: x.label, a: x.income, b: x.expenses }))} currency={currency} height={220} /></Card></Item>
          <Item><Card><CardHeader title="Net cash flow" /><LineChart series={[{ label: "Net", data: monthly.map((x) => x.net), tone: "accent", fill: true }]} labels={monthly.map((x) => x.label)} currency={currency} height={160} /></Card></Item>
        </Stagger>}
        {tab === "spending" && <Stagger className="grid gap-4 lg:grid-cols-3">
          <Item className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-4">
            <MetricCard solid label="Spending (4 months)" value={totalSpend} format={money} />
            <MetricCard label="Essential" value={essential} format={money} delta={fmtPct(essential / (totalSpend || 1), 0)} deltaTone="neutral" />
            <MetricCard label="Discretionary" value={totalSpend - essential} format={money} delta={fmtPct((totalSpend - essential) / (totalSpend || 1), 0)} deltaTone="neutral" />
            <MetricCard label="Recurring" value={recurring} format={money} sub="housing, bills, subscriptions" />
          </Item>
          <Item className="lg:col-span-2"><Card><CardHeader title="Largest categories" sub="Click a category to see its transactions" />
            <div className="space-y-1">{allCats.slice(0, 9).map(([k, v], i) => {
              const ch = prev && prev.cats[k] ? (last.cats[k] ?? 0) / prev.cats[k] - 1 : 0;
              return (
                <button key={k} onClick={() => router.push(`/app/transactions?category=${encodeURIComponent(k)}`)} className="grid w-full grid-cols-[28px_120px_1fr_90px_56px] items-center gap-3 rounded-xl px-2 py-2 text-left text-[12.5px] hover:bg-glow">
                  <span className="text-muted">{CATEGORY_ICON[k]}</span><span className="truncate font-semibold">{k}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-line"><motion.span className={`block h-full rounded-full ${i === 0 ? "bg-accent" : "bg-fg"}`} initial={{ width: 0 }} animate={{ width: `${(v / allCats[0][1]) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.04 }} /></span>
                  <span className="num text-right font-semibold">{fmtMoney(v, currency, { compact: true })}</span>
                  <span className={`num text-right text-[11px] ${ch > 0.05 ? "text-warn" : "text-muted"}`}>{ch ? fmtPct(ch, 0, true) : "—"}</span>
                </button>
              );
            })}</div>
          </Card></Item>
          <Item><Card className="h-full"><CardHeader title="Modeled budget" sub="From your Twin" />
            {EXPENSE_KEYS.filter((k) => twin.expenses[k] > 0).map((k) => <div key={k} className="flex justify-between py-1.5 text-[12.5px]"><span className="text-muted">{EXPENSE_LABELS[k]}{ESSENTIAL.includes(k) ? "" : " ·  flexible"}</span><span className="num font-semibold">{money(twin.expenses[k])}</span></div>)}
          </Card></Item>
        </Stagger>}
        {tab === "debt" && <Stagger className="grid gap-4 lg:grid-cols-3">
          <Item className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-4">
            <MetricCard solid label="Total debt" value={m.totalDebt} format={money} />
            <MetricCard label="Monthly payments" value={m.debtPayments} format={money} />
            <MetricCard label="Debt-to-income" value={m.dti} format={(v) => fmtPct(v, 0)} delta={m.dti < 0.2 ? "light" : m.dti < 0.36 ? "moderate" : "heavy"} deltaTone={m.dti < 0.2 ? "pos" : "warn"} sub="of monthly income" />
            <MetricCard label="Debt-free in" value={payoff.base.months} format={(v) => `${Math.round(v)} mo`} sub="at current payments" />
          </Item>
          <Item className="lg:col-span-2"><Card><CardHeader title="Payoff simulation" sub="Remaining debt by quarter" />
            {payoff.total0 > 0 ? <LineChart labels={payoff.base.series.map((_, i) => (i === 0 ? "Now" : `Q${i}`))} currency={currency} height={200} series={[{ label: "With extra", data: payoff.base.series.map((_, i) => payoff.extra.series[i] ?? 0), tone: "accent" }, { label: "Current", data: payoff.base.series, tone: "muted", style: "dashed" }]} /> : <p className="py-10 text-center text-[13px] text-muted">No debt to pay off.</p>}
          </Card></Item>
          <Item><Card className="h-full"><CardHeader title="Extra monthly payment" />
            <div className="num mb-3 text-[24px] font-bold">{money(extra)}</div>
            <Slider label="Extra payment" value={extra} onChange={setExtra} min={0} max={10000} step={250} />
            <div className="mt-5 space-y-2 text-[12.5px]"><div className="flex justify-between"><span className="text-muted">Debt-free in</span><CountUp value={payoff.extra.months} duration={400} format={(v) => `${Math.round(v)} months`} className="font-bold" /></div><div className="flex justify-between"><span className="text-muted">Months saved</span><span className="num font-bold">{payoff.base.months - payoff.extra.months}</span></div><div className="flex justify-between"><span className="text-muted">Interest saved</span><span className="num font-bold">{money(payoff.base.interest - payoff.extra.interest)}</span></div></div>
            <Button className="mt-5 w-full" href="/app/scenarios?new=1">Simulate Debt Payoff</Button>
          </Card></Item>
        </Stagger>}
        {tab === "savings" && <Stagger className="grid gap-4 lg:grid-cols-3">
          <Item className="lg:col-span-2"><Card><CardHeader title="Savings rate by month" sub="Net cash flow ÷ income" /><BarChart data={monthly.map((x) => ({ label: x.label, a: x.income ? Math.max(0, x.net) : 0, b: x.income }))} currency={currency} names={["Saved", "Income"]} height={200} /></Card></Item>
          <Item><Card className="h-full"><CardHeader title="Liquidity" />
            {accounts.filter((a) => a.balance > 0).map((a) => <div key={a.id} className="mb-3"><div className="mb-1 flex justify-between text-[12.5px]"><span className="font-semibold">{a.name}</span><span className="num">{money(a.balance)}</span></div><ProgressPill value={a.balance / (m.liquid || 1)} height={5} tone="ink" /></div>)}
            <div className="mt-4 rounded-2xl bg-card2 p-3 text-[12.5px]">Modeled savings rate <b className="num">{fmtPct(m.savingsRate, 0)}</b>. <Link href="/app/simulations?template=Save%2015%25%20More" className="font-semibold underline">See what 15% more does</Link></div>
          </Card></Item>
        </Stagger>}
      </motion.div>)}
    </div>
  );
}
