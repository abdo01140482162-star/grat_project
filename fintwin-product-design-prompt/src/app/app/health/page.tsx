"use client";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/components/store";
import { CircularProgress, Item, Stagger } from "@/components/motion";
import { Badge, Card, PageHeader } from "@/components/ui";
import { fmtMoney, fmtPct } from "@/lib/model";

export default function HealthPage() {
  const { m, goals, transactions, currency, twin } = useStore();
  const goalP = goals.length ? goals.reduce((s, g) => s + Math.min(1, g.current / g.target), 0) / goals.length : 0;
  const now = new Date(); const k = (o: number) => new Date(now.getFullYear(), now.getMonth() - o, 1).toISOString().slice(0, 7);
  const net = (key: string) => transactions.filter((t) => t.date.startsWith(key) && t.kind !== "transfer").reduce((s, t) => s + t.amount, 0);
  const trendNW = net(k(1));
  const dims = [
    { t: "Cash flow", v: fmtMoney(m.savings, currency, { sign: true }), score: Math.max(0, Math.min(1, 0.5 + m.savingsRate * 2)), trend: m.savings > 0 ? 1 : -1, d: m.savings > 0 ? "You spend less than you earn each month — the engine of every future scenario." : "Spending currently exceeds income; every scenario starts from a deficit.", href: "/app/analytics?tab=cashflow" },
    { t: "Emergency coverage", v: `${m.coverage.toFixed(1)} months`, score: Math.min(1, m.coverage / 6), trend: 0, d: `Liquid savings would cover essential costs for about ${m.coverage.toFixed(1)} months. A common guide is 3–6 months.`, href: "/app/ai?q=How%20long%20could%20my%20savings%20cover%20my%20expenses%3F" },
    { t: "Debt load", v: fmtPct(m.dti, 0), score: Math.max(0, 1 - m.dti / 0.4), trend: twin.liabilities.length ? 1 : 0, d: `Debt payments take ${fmtPct(m.dti, 0)} of income. Below 20% leaves room for saving and shocks.`, href: "/app/analytics?tab=debt" },
    { t: "Savings rate", v: fmtPct(m.savingsRate, 0), score: Math.min(1, Math.max(0, m.savingsRate / 0.3)), trend: m.savingsRate >= 0.2 ? 1 : 0, d: "The share of income left after expenses. It compounds through investment returns in simulations.", href: "/app/analytics?tab=savings" },
    { t: "Goal progress", v: fmtPct(goalP, 0), score: goalP, trend: 1, d: `Average progress across ${goals.length} goal${goals.length === 1 ? "" : "s"}. Simulate a goal to see its estimated probability.`, href: "/app/goals" },
    { t: "Net worth trend", v: fmtMoney(trendNW, currency, { sign: true, compact: true }), score: Math.max(0, Math.min(1, 0.5 + trendNW / Math.max(1, m.income * 2))), trend: trendNW > 0 ? 1 : trendNW < 0 ? -1 : 0, d: "Change in net worth from last month's net cash flow.", href: "/app/analytics" },
  ];
  return (
    <div>
      <PageHeader eyebrow="Intelligence" title="Financial health" sub="Six measurable dimensions — no artificial score. Each shows its current value, direction and what it means." />
      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dims.map((x) => (
          <Item key={x.t}><Link href={x.href} className="card lift block h-full p-5">
            <div className="flex items-start justify-between">
              <div><div className="text-[13px] font-semibold text-muted">{x.t}</div><div className="num mt-1 text-[24px] font-bold">{x.v}</div></div>
              <CircularProgress value={x.score} size={58} stroke={5} tone={x.score > 0.66 ? "var(--fg)" : x.score > 0.33 ? "var(--accent)" : "var(--neg)"}>
                {x.trend > 0 ? <TrendingUp className="h-4 w-4" strokeWidth={1.6} /> : x.trend < 0 ? <TrendingDown className="h-4 w-4 text-neg" strokeWidth={1.6} /> : <Minus className="h-4 w-4 text-muted" strokeWidth={1.6} />}
              </CircularProgress>
            </div>
            <div className="mt-3"><Badge tone={x.score > 0.66 ? "pos" : x.score > 0.33 ? "warn" : "neg"}>{x.score > 0.66 ? "Healthy" : x.score > 0.33 ? "Worth watching" : "Needs attention"}</Badge></div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{x.d}</p>
          </Link></Item>
        ))}
      </Stagger>
      <Card className="mt-4 !bg-glow"><p className="text-[12.5px] text-muted">These dimensions are calculated directly from your Financial Twin and transactions. They describe your current position; they are not a credit score and don&apos;t predict outcomes.</p></Card>
    </div>
  );
}
