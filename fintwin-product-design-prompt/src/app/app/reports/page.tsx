"use client";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { useQuery } from "@/components/hooks";
import { ReportCard } from "@/components/domain";
import { Item, Stagger } from "@/components/motion";
import { Button, Card, Checkbox, Drawer, EmptyState, Field, PageHeader, Select, TextInput, cx, useToast } from "@/components/ui";
import { type Report, fmtDate } from "@/lib/model";

const REPORT_TYPES = [
  { t: "Financial Snapshot", d: "Where you stand today — net worth, cash flow and coverage." },
  { t: "Financial Twin", d: "Your full model: income, expenses, assets, debts and assumptions." },
  { t: "Scenario", d: "One scenario's simulated outcomes against your current plan." },
  { t: "Goal", d: "Goal progress, required saving and simulated probability." },
  { t: "Annual Financial Report", d: "The year in review plus the range of futures ahead." },
  { t: "Simulation Summary", d: "Distribution, percentiles and risk for a saved simulation." },
];
const SECTIONS = ["Executive Summary", "Financial Snapshot", "Charts", "Goals", "Scenario Results", "Assumptions", "AI Explanation", "Disclaimer"];
const STEPS = ["Type", "Date range", "Sections", "Scenario", "Goals", "Notes", "Preview"];

export default function ReportsPage() {
  const { reports } = useStore();
  const query = useQuery();
  const [open, setOpen] = useState(false); const [type, setType] = useState(REPORT_TYPES[0].t); const [sim, setSim] = useState<string>("");
  useEffect(() => { if (query?.get("new")) { setOpen(true); if (query.get("sim")) { setSim(query.get("sim")!); setType("Simulation Summary"); } } }, [query]);
  return (
    <div>
      <PageHeader eyebrow="Reports" title="Reports" sub="Turn your financial model into a clear, shareable document." actions={<Button icon={<Plus className="h-4 w-4" strokeWidth={1.8} />} onClick={() => setOpen(true)}>New report</Button>} />
      <Stagger className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((r) => (
          <Item key={r.t}><button onClick={() => { setType(r.t); setOpen(true); }} className="card lift group flex h-full w-full flex-col p-5 text-left">
            <span className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-card2 transition-colors group-hover:bg-accent group-hover:text-accentfg"><FileText className="h-4 w-4" strokeWidth={1.5} /></span>
            <span className="text-[15px] font-bold">{r.t}</span><span className="mt-1 text-[12.5px] text-muted">{r.d}</span>
          </button></Item>
        ))}
      </Stagger>
      <h2 className="mb-3 text-[15px] font-bold tracking-tight">Your reports</h2>
      {reports.length === 0 ? <Card><EmptyState icon={<FileText className="h-5 w-5" strokeWidth={1.5} />} title="No reports yet" body="Turn your financial model into a report." action={<Button onClick={() => setOpen(true)}>Create a report</Button>} /></Card> :
        <div className="grid gap-3 md:grid-cols-2">{reports.map((r) => <ReportCard key={r.id} title={r.title} type={r.type} date={r.createdAt} href={`/app/reports/${r.id}`} />)}</div>}
      <Builder open={open} onClose={() => setOpen(false)} type={type} setType={setType} sim={sim} setSim={setSim} />
    </div>
  );
}

function Builder({ open, onClose, type, setType, sim, setSim }: { open: boolean; onClose: () => void; type: string; setType: (t: string) => void; sim: string; setSim: (s: string) => void }) {
  const { simulations, goals, create } = useStore();
  const router = useRouter(); const toast = useToast();
  const [step, setStep] = useState(0);
  const y = new Date().getFullYear();
  const [from, setFrom] = useState(`${y}-01-01`); const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [sections, setSections] = useState<string[]>(SECTIONS);
  const [goalIds, setGoalIds] = useState<number[]>(goals.map((g) => g.id));
  const [notes, setNotes] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setStep(0); if (!sim && simulations[0]) setSim(String(simulations[0].id)); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const finish = async () => {
    setBusy(true);
    try {
      const [r] = await create<Report>("reports", { title: `${type} · ${fmtDate(new Date())}`, type, config: { from, to, sections, simulationId: sim ? Number(sim) : null, goalIds, notes } });
      toast("Report created"); onClose(); router.push(`/app/reports/${r.id}`);
    } finally { setBusy(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} width={560} title="Report builder" footer={<div className="flex justify-between"><Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>{step < 6 ? <Button onClick={() => setStep(step + 1)}>Continue</Button> : <Button loading={busy} onClick={finish}>Create report</Button>}</div>}>
      <div className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto">{STEPS.map((s, i) => <button key={s} onClick={() => setStep(i)} className={cx("relative shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors", i === step ? "text-btnfg" : i < step ? "text-fg" : "text-faint")}>{i === step && <motion.span layoutId="rb-pill" className="absolute inset-0 rounded-full bg-btn" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}<span className="relative">{i + 1}. {s}</span></button>)}</div>
      <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.22 }} className="space-y-3">
        {step === 0 && REPORT_TYPES.map((r) => <button key={r.t} onClick={() => setType(r.t)} className={cx("press w-full rounded-2xl border p-4 text-left transition", type === r.t ? "border-btn bg-btn text-btnfg" : "border-line bg-card hover:bg-card2")}><div className="text-[13.5px] font-bold">{r.t}</div><div className={cx("text-[12px]", type === r.t ? "text-btnfg/70" : "text-muted")}>{r.d}</div></button>)}
        {step === 1 && <div className="grid grid-cols-2 gap-3"><Field label="From"><TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To"><TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>}
        {step === 2 && <div className="space-y-3">{SECTIONS.map((s) => <div key={s}><Checkbox checked={sections.includes(s)} onChange={() => setSections(toggle(sections, s))} label={s} /></div>)}</div>}
        {step === 3 && <Field label="Simulation to include" hint="Reports use saved simulation results so every number is traceable."><Select value={sim} onChange={setSim} options={[{ value: "", label: "None" }, ...simulations.map((s) => ({ value: String(s.id), label: `${s.scenarioName} · ${fmtDate(s.createdAt)}` }))]} /></Field>}
        {step === 4 && (goals.length ? goals.map((g) => <div key={g.id}><Checkbox checked={goalIds.includes(g.id)} onChange={() => setGoalIds(toggle(goalIds, g.id))} label={g.name} /></div>) : <p className="text-[13px] text-muted">No goals to include.</p>)}
        {step === 5 && <Field label="Notes" hint="Shown in the report's executive summary."><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="w-full rounded-2xl border border-line2 bg-card p-3 text-[13.5px] outline-none focus:border-accent" /></Field>}
        {step === 6 && <div className="rounded-[22px] border border-line bg-card p-5"><div className="label mb-2">Preview</div><div className="text-[18px] font-bold">{type}</div><div className="mt-1 text-[12.5px] text-muted">{fmtDate(from)} – {fmtDate(to)}</div><div className="mt-3 flex flex-wrap gap-1.5">{sections.map((s) => <span key={s} className="rounded-full bg-card2 px-2.5 py-1 text-[11px] font-semibold">{s}</span>)}</div><div className="mt-3 text-[12px] text-muted">{sim ? `Simulation: ${simulations.find((s) => String(s.id) === sim)?.scenarioName}` : "No simulation"} · {goalIds.length} goals</div></div>}
      </motion.div></AnimatePresence>
    </Drawer>
  );
}
