"use client";
import { LayoutGroup, motion } from "framer-motion";
import { Check, GitCompare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { useQuery } from "@/components/hooks";
import { LineChart } from "@/components/charts";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, cx } from "@/components/ui";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/model";

export default function ComparePage() {
  const { simulations, currency } = useStore();
  const query = useQuery();
  const [ids, setIds] = useState<number[]>([]);
  const [focus, setFocus] = useState<number | null>(null);
  useEffect(() => {
    const q = query?.get("ids")?.split(",").map(Number).filter(Boolean) ?? [];
    const seen = new Set<string>(); const auto: number[] = [];
    for (const s of simulations) { if (!seen.has(s.scenarioName) && auto.length < 4) { seen.add(s.scenarioName); auto.push(s.id); } }
    const init = [...new Set([...q, ...auto])].slice(0, 4);
    setIds(init); setFocus(init[0] ?? null);
  }, [query, simulations.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = useMemo(() => ids.map((id) => simulations.find((s) => s.id === id)).filter(Boolean) as typeof simulations, [ids, simulations]);
  const toggle = (id: number) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 4 ? s : [...s, id]));
  if (simulations.length === 0) return <div><PageHeader eyebrow="Simulation lab" title="Scenario comparison" /><Card><EmptyState icon={<GitCompare className="h-5 w-5" strokeWidth={1.5} />} title="Nothing to compare yet" body="Run at least two simulations to compare possible futures side by side." action={<Button href="/app/simulations">Run a simulation</Button>} /></Card></div>;
  const yearly = (s: (typeof simulations)[number]) => s.result.bands.p50.filter((_, i) => s.result.months[i] % 12 === 0);
  const minLen = Math.min(...chosen.map((s) => yearly(s).length));
  const riskScore = (s: (typeof simulations)[number]) => (s.result.risk.emergencyRisk + s.result.kpis.shortfallProbability + s.result.risk.cashFlowStress) / 3;
  return (
    <div>
      <PageHeader eyebrow="Simulation lab" title="Scenario comparison" sub="Up to four simulated futures, side by side. Select one to bring it into focus." />
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {simulations.slice(0, 16).map((s) => (
          <button key={s.id} onClick={() => toggle(s.id)} className={cx("press flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition", ids.includes(s.id) ? "border-btn bg-btn text-btnfg" : "border-line bg-card hover:bg-card2")}>
            {ids.includes(s.id) && <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2} />}{s.scenarioName}<span className="text-[11px] opacity-60">{fmtDate(s.createdAt)}</span>
          </button>
        ))}
      </div>
      <LayoutGroup>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {chosen.map((s) => {
            const on = focus === s.id; const k = s.result.kpis; const risk = riskScore(s);
            return (
              <motion.button layout key={s.id} onClick={() => setFocus(s.id)} className={cx("relative overflow-hidden p-5 text-left", on ? "text-solidfg" : "card")} style={{ borderRadius: 22 }} transition={{ type: "spring", stiffness: 400, damping: 32 }}>
                {on && <motion.span layoutId="compare-focus" className="absolute inset-0 rounded-[22px] bg-solid shadow-lift" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <div className="relative">
                  <div className={cx("label !text-[9.5px]", on && "!text-solidmuted")}>{s.horizonYears} yrs · {s.paths} paths</div>
                  <div className="mt-1 text-[16px] font-bold">{s.scenarioName}</div>
                  <div className="mt-4 space-y-2 text-[12.5px]">
                    {[["Net worth (median)", fmtMoney(k.medianNetWorth, currency, { compact: true })], ["Goal probability", k.goalProbability !== null ? fmtPct(k.goalProbability, 0) : "—"], ["Cash shortfall", fmtPct(k.shortfallProbability, 0)], ["Emergency coverage", fmtPct(k.emergencySurvival, 0)]].map(([l, v]) => (
                      <div key={l} className="flex justify-between"><span className={on ? "text-solidmuted" : "text-muted"}>{l}</span><span className={cx("num font-bold", on && l === "Net worth (median)" && "text-accent")}>{v}</span></div>
                    ))}
                    <div className="flex items-center justify-between"><span className={on ? "text-solidmuted" : "text-muted"}>Risk</span><Badge tone={risk < 0.1 ? "pos" : risk < 0.3 ? "warn" : "neg"}>{risk < 0.1 ? "Low" : risk < 0.3 ? "Moderate" : "Elevated"}</Badge></div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>
      {chosen.length > 0 && (
        <Card className="mt-4">
          <CardHeader title="Median net worth over time" sub="Focused scenario in amber · others in ink and gray" />
          <LineChart labels={Array.from({ length: minLen }, (_, i) => (i === 0 ? "Today" : `Y${i}`))} currency={currency}
            series={[...chosen].sort((a, b) => (a.id === focus ? -1 : b.id === focus ? 1 : 0)).map((s, i) => ({ label: s.scenarioName, data: yearly(s).slice(0, minLen), tone: i === 0 ? "accent" as const : i === 1 ? "ink" as const : "muted" as const, style: i > 1 ? "dashed" as const : "solid" as const }))} height={240} />
        </Card>
      )}
    </div>
  );
}
