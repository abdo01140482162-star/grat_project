"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/store";
import { describeChanges } from "@/components/results";
import { FanChart } from "@/components/charts";
import { ProgressPill } from "@/components/motion";
import { goalStatus } from "@/components/domain";
import { Button, Card, ConfirmDialog, EmptyState, Logo, useToast } from "@/components/ui";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/model";

type Fmt = "PDF" | "CSV" | "Excel";
const PHASES = ["Preparing", "Generating", "Ready"];

export default function ReportPreview() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { reports, simulations, goals, m, currency, twin, user, remove } = useStore();
  const toast = useToast();
  const [phase, setPhase] = useState<Record<Fmt, number>>({ PDF: -1, CSV: -1, Excel: -1 });
  const [del, setDel] = useState(false);
  const r = reports.find((x) => x.id === Number(id));
  if (!r) return <Card><EmptyState icon={<ArrowLeft className="h-5 w-5" />} title="Report not found" action={<Button href="/app/reports">Back to reports</Button>} /></Card>;
  const cfg = r.config as { from?: string; to?: string; sections?: string[]; simulationId?: number | null; goalIds?: number[]; notes?: string };
  const has = (s: string) => (cfg.sections ?? []).includes(s);
  const sim = simulations.find((s) => s.id === cfg.simulationId);
  const gl = goals.filter((g) => (cfg.goalIds ?? []).includes(g.id));
  const money = (v: number) => fmtMoney(v, currency);

  const rows = (): string[][] => [
    ["Section", "Metric", "Value"],
    ["Snapshot", "Net worth", String(Math.round(m.netWorth))], ["Snapshot", "Monthly income", String(Math.round(m.income))], ["Snapshot", "Monthly expenses", String(Math.round(m.expenses))],
    ["Snapshot", "Monthly savings", String(Math.round(m.savings))], ["Snapshot", "Emergency coverage (months)", m.coverage.toFixed(2)],
    ...gl.map((g) => ["Goal", g.name, `${Math.round(g.current)} / ${Math.round(g.target)} by ${g.targetDate}`]),
    ...(sim ? [["Simulation", "Scenario", sim.scenarioName], ["Simulation", "Median net worth", String(Math.round(sim.result.kpis.medianNetWorth))], ...Object.entries(sim.result.percentiles).map(([p, v]) => ["Simulation", `P${p}`, String(Math.round(v))])] : []),
    ["Assumptions", "Inflation %", String(twin.assumptions.inflation)], ["Assumptions", "Investment return %", String(twin.assumptions.investReturn)],
  ];
  const download = (name: string, content: string, type: string) => { const b = new Blob([content], { type }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
  const exportAs = async (f: Fmt) => {
    for (let i = 0; i < 3; i++) { setPhase((p) => ({ ...p, [f]: i })); await new Promise((res) => setTimeout(res, 550)); }
    const slug = r.title.replace(/[^\w]+/g, "-").toLowerCase();
    if (f === "CSV") download(`${slug}.csv`, rows().map((x) => x.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
    if (f === "Excel") download(`${slug}.xls`, `<table>${rows().map((x) => `<tr>${x.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`, "application/vnd.ms-excel");
    toast("Your report is ready.");
    if (f === "PDF") setTimeout(() => window.print(), 200);
    setTimeout(() => setPhase((p) => ({ ...p, [f]: -1 })), 1400);
  };
  const H = ({ n, t }: { n: string; t: string }) => <div className="mb-4 flex items-baseline gap-3 border-b border-line pb-2"><span className="label">{n}</span><h2 className="text-[18px] font-bold tracking-tight">{t}</h2></div>;
  let n = 0; const num = () => String(++n).padStart(2, "0");

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/reports" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} />Reports</Link>
        <div className="flex flex-wrap gap-2">
          {(["PDF", "CSV", "Excel"] as Fmt[]).map((f) => (
            <Button key={f} size="sm" variant={f === "PDF" ? "primary" : "secondary"} onClick={() => phase[f] < 0 && exportAs(f)} className="min-w-[124px]" icon={phase[f] === 2 ? <Check className="h-3.5 w-3.5 text-accent" /> : phase[f] < 0 ? <Download className="h-3.5 w-3.5" /> : <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />}>
              <AnimatePresence mode="wait"><motion.span key={phase[f]} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>{phase[f] < 0 ? `Export ${f}` : PHASES[phase[f]]}</motion.span></AnimatePresence>
            </Button>
          ))}
          <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDel(true)}>Delete</Button>
        </div>
      </div>
      <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="print-area mx-auto max-w-[860px] rounded-[28px] border border-line bg-card p-8 shadow-lift md:p-14">
        <header className="mb-10 flex items-start justify-between">
          <div><Logo size={26} /><div className="label mt-8">{r.type}</div><h1 className="mt-2 text-[34px] font-bold leading-tight tracking-tight">{twin.profile.name || user.name}&apos;s financial report</h1><p className="mt-2 text-[13px] text-muted">{cfg.from ? fmtDate(cfg.from) : ""} – {cfg.to ? fmtDate(cfg.to) : ""} · generated {fmtDate(r.createdAt)} · {currency}</p></div>
          <div className="hidden h-24 w-24 rounded-full bg-accent md:block" />
        </header>
        <div className="space-y-10">
          {has("Executive Summary") && <section><H n={num()} t="Executive summary" /><p className="text-[14px] leading-relaxed">Your net worth stands at <b>{money(m.netWorth)}</b>, with a monthly surplus of <b>{money(m.savings)}</b> ({fmtPct(m.savingsRate, 0)} of income) and about <b>{m.coverage.toFixed(1)} months</b> of essential expenses covered by liquid savings.{sim && <> In the “{sim.scenarioName}” simulation, the estimated median net worth after {sim.horizonYears} years is <b>{fmtMoney(sim.result.kpis.medianNetWorth, currency, { compact: true })}</b> under the selected assumptions.</>}</p>{cfg.notes && <p className="mt-3 rounded-2xl bg-card2 p-4 text-[13px] italic text-muted">“{cfg.notes}”</p>}</section>}
          {has("Financial Snapshot") && <section><H n={num()} t="Financial snapshot" /><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["Net worth", money(m.netWorth)], ["Income / mo", money(m.income)], ["Expenses / mo", money(m.expenses)], ["Coverage", `${m.coverage.toFixed(1)} mo`], ["Assets", money(m.totalAssets)], ["Debt", money(m.totalDebt)], ["Savings rate", fmtPct(m.savingsRate, 0)], ["Debt / income", fmtPct(m.dti, 0)]].map(([l, v], i) => <div key={l} className={i === 0 ? "rounded-2xl bg-solid p-4 text-solidfg" : "rounded-2xl bg-card2 p-4"}><div className={`text-[11px] ${i === 0 ? "text-solidmuted" : "text-muted"}`}>{l}</div><div className="num mt-1 text-[16px] font-bold">{v}</div></div>)}</div></section>}
          {has("Charts") && sim && <section><H n={num()} t="Range of possible futures" /><FanChart months={sim.result.months} bands={sim.result.bands} baseline={sim.result.baselineMedian} currency={currency} height={240} /></section>}
          {has("Goals") && gl.length > 0 && <section><H n={num()} t="Goals" /><div className="space-y-4">{gl.map((g) => { const s = goalStatus(g); return <div key={g.id}><div className="mb-1.5 flex justify-between text-[13px]"><span className="font-bold">{g.name}</span><span className="num text-muted">{money(g.current)} / {money(g.target)} · {fmtDate(g.targetDate)}</span></div><ProgressPill value={s.p} height={6} /><div className="mt-1 text-[11.5px] text-muted">{s.label} · requires {money(s.required)}/mo{g.probability !== null && ` · simulated probability ${fmtPct(g.probability, 0)}`}</div></div>; })}</div></section>}
          {has("Scenario Results") && sim && <section><H n={num()} t={`Scenario results · ${sim.scenarioName}`} /><div className="grid gap-3 md:grid-cols-2"><ul className="space-y-1.5 text-[13px]">{describeChanges(sim.result).map((d) => <li key={d}>· {d}</li>)}</ul><table className="w-full text-[12.5px]"><tbody>{["5", "25", "50", "75", "95"].map((p) => <tr key={p} className="border-b border-line"><td className="py-1.5 text-muted">{p}th percentile</td><td className="num py-1.5 text-right font-semibold">{money(sim.result.percentiles[p])}</td></tr>)}<tr><td className="py-1.5 text-muted">Emergency survival</td><td className="num py-1.5 text-right font-semibold">{fmtPct(sim.result.kpis.emergencySurvival, 0)}</td></tr></tbody></table></div></section>}
          {has("Assumptions") && <section><H n={num()} t="Assumptions" /><div className="grid grid-cols-3 gap-3 text-[13px] md:grid-cols-6">{Object.entries(sim?.result.assumptions ?? twin.assumptions).map(([k, v]) => <div key={k} className="rounded-2xl bg-card2 p-3"><div className="text-[10.5px] capitalize text-muted">{k.replace(/([A-Z])/g, " $1")}</div><div className="num font-bold">{v}{k === "horizonYears" ? " yrs" : "%"}</div></div>)}</div></section>}
          {has("AI Explanation") && <section><H n={num()} t="Explanation" /><p className="text-[13.5px] leading-relaxed text-muted">{sim ? `The model ran ${sim.paths} simulated futures, each drawing different investment returns, inflation and income growth. The biggest driver of the outcome was ${sim.result.risk.drivers[0]?.label.toLowerCase()}. ${sim.result.kpis.shortfallProbability > 0.05 ? `About ${fmtPct(sim.result.kpis.shortfallProbability, 0)} of futures required borrowing to cover a gap.` : "Very few futures required borrowing."}` : "Run and attach a simulation to include a model-based explanation."} This explanation was generated from the numbers in this report only.</p></section>}
          {has("Disclaimer") && <section className="rounded-2xl border border-line p-5 text-[11.5px] leading-relaxed text-muted"><b className="text-fg">Disclaimer.</b> FinTwin is an educational modeling tool. Simulation outputs are estimates based on your inputs and selected assumptions; they are not predictions, guarantees, or financial advice. Current data, user assumptions, simulation outputs and explanations are labeled separately throughout.</section>}
        </div>
      </motion.article>
      <ConfirmDialog open={del} onClose={() => setDel(false)} title="Delete this report?" body="This can't be undone." onConfirm={async () => { await remove("reports", r.id); router.push("/app/reports"); }} />
    </div>
  );
}
