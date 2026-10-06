"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type Assumptions, type Scenario, type ScenarioChanges, ASSUMPTION_INFO, emptyChanges, effectiveAssumptions } from "@/lib/model";
import { parseScenarioText } from "@/lib/sim";
import { useStore } from "./store";
import { useSimulation } from "./hooks";
import { FanChart } from "./charts";
import { Badge, Button, ChartSkeleton, Drawer, Field, MoneyInput, Select, Slider, TextInput, Toggle, cx, useToast } from "./ui";

const STEPS = ["Define", "Timeline", "Financial changes", "Economy", "Settings", "Preview"];
const CATS = ["Career", "Life", "Housing", "Transportation", "Economic", "Savings", "Custom"];

export function ScenarioBuilder({ open, onClose, initial, ai }: { open: boolean; onClose: () => void; initial?: Partial<Scenario> | null; ai?: boolean }) {
  const { create, update, twin, currency } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(""); const [category, setCategory] = useState("Custom"); const [description, setDescription] = useState("");
  const [c, setC] = useState<ScenarioChanges>(emptyChanges());
  const [horizon, setHorizon] = useState(10); const [paths, setPaths] = useState(600);
  const [prompt, setPrompt] = useState(""); const [found, setFound] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setStep(ai ? -1 : 0); setFound([]); setPrompt("");
    setName(initial?.name ?? ""); setCategory(initial?.category ?? "Custom"); setDescription(initial?.description ?? "");
    setC({ ...emptyChanges(), ...(initial?.changes ?? {}) }); setHorizon(Math.min(twin.assumptions.horizonYears, 15));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = effectiveAssumptions(twin);
  const set = (p: Partial<ScenarioChanges>) => setC((x) => ({ ...x, ...p }));
  const econ = (k: keyof Assumptions, on: boolean) => setC((x) => { const e = { ...x.econ }; if (on) e[k] = base[k]; else delete e[k]; return { ...x, econ: e }; });
  const preview = useSimulation({ changes: c, paths: 200, horizonYears: horizon, enabled: open && step === 5, debounce: 120 });

  const extract = () => {
    const r = parseScenarioText(prompt);
    setName(r.name); setCategory(r.category); setDescription(prompt); setC(r.changes); setFound(r.found);
  };
  const save = async (run: boolean) => {
    setBusy(true);
    try {
      const body = { name: name.trim() || "Custom scenario", category, description: description || "Custom scenario", changes: c };
      let id = initial?.id;
      if (id) await update("scenarios", id, body); else id = (await create<Scenario>("scenarios", body))[0].id;
      toast(initial?.id ? "Scenario updated" : "Scenario saved to your library");
      onClose();
      if (run) router.push(`/app/simulations?scenario=${id}&paths=${paths}&horizon=${horizon}&autorun=1`);
    } finally { setBusy(false); }
  };
  const Num = (p: { label: string; k: keyof ScenarioChanges; unit?: string; hint?: string }) => <NumField {...p} c={c} set={set} currency={currency} />;

  return (
    <Drawer open={open} onClose={onClose} width={640} title={initial?.id ? `Edit · ${initial.name}` : ai ? "AI Scenario Builder" : "Scenario Builder"}
      footer={step >= 0 ? <div className="flex justify-between gap-2"><Button variant="secondary" onClick={() => setStep(Math.max(ai ? -1 : 0, step - 1))}>Back</Button><div className="flex gap-2">{step < 5 ? <Button onClick={() => setStep(step + 1)}>Continue</Button> : <><Button variant="secondary" loading={busy} onClick={() => save(false)}>Save</Button><Button loading={busy} onClick={() => save(true)}>Save & run simulation</Button></>}</div></div> : undefined}>
      {step >= 0 && <div className="mb-5 flex gap-1.5">{STEPS.map((s, i) => <button key={s} onClick={() => setStep(i)} className="flex-1 text-left"><div className={cx("h-1.5 rounded-full transition-colors duration-500", i <= step ? "bg-accent" : "bg-line2")} /><div className={cx("mt-1.5 hidden text-[10.5px] font-semibold md:block", i === step ? "text-fg" : "text-faint")}>{s}</div></button>)}</div>}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.24 }} className="space-y-4">
          {step === -1 && <>
            <p className="text-[13px] text-muted">Describe a decision in plain language. FinTwin extracts the model changes and shows every one of them — nothing is hidden, and you can edit all of it.</p>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="What happens if I lose my job for six months but keep my current expenses?" className="w-full rounded-[20px] border border-line2 bg-card p-4 text-[14px] outline-none focus:border-accent" aria-label="Describe a scenario" />
            <div className="flex flex-wrap gap-2">{["What happens if I lose my job for six months but keep my current expenses?", "Buy a home worth 2 million in two years", "Get a 25% raise next year", "Save 20% more", "What if inflation hits 30%?"].map((p) => <button key={p} onClick={() => setPrompt(p)} className="rounded-full border border-line bg-card px-3 py-1.5 text-[12px] font-medium hover:bg-card2">{p}</button>)}</div>
            <Button disabled={!prompt.trim()} onClick={extract} icon={<Wand2 className="h-4 w-4" strokeWidth={1.6} />}>Extract parameters</Button>
            {found.length > 0 && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-[22px] bg-card2 p-4">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-bold"><Sparkles className="h-4 w-4 text-accent" />Extracted: {name}<Badge tone="accent">{category}</Badge></div>
              <ul className="space-y-1.5">{found.map((f, i) => <motion.li key={f} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-2 text-[12.5px]"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{f}</motion.li>)}</ul>
              <Button className="mt-4" size="sm" onClick={() => setStep(2)}>Review & edit parameters</Button>
            </motion.div>}
            {prompt && found.length === 0 && <p className="text-[12px] text-muted">Tip: mention income, expenses, a purchase, savings, or the economy. Unrecognized parts are never silently applied.</p>}
          </>}
          {step === 0 && <>
            <Field label="Scenario name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Take a sabbatical" autoFocus /></Field>
            <Field label="Category"><div className="flex flex-wrap gap-2">{CATS.map((x) => <button key={x} onClick={() => setCategory(x)} className={cx("press rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold", category === x ? "border-btn bg-btn text-btnfg" : "border-line bg-card")}>{x}</button>)}</div></Field>
            <Field label="What changes?"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-2xl border border-line2 bg-card p-3 text-[13.5px] outline-none focus:border-accent" /></Field>
          </>}
          {step === 1 && <>
            <Field label={`Starts in month ${c.incomeStartMonth}`} hint="When the income/expense change begins (0 = immediately)."><Slider label="Start month" value={c.incomeStartMonth} onChange={(v) => set({ incomeStartMonth: v })} min={0} max={60} /></Field>
            <Field label={c.incomeDurationMonths ? `Lasts ${c.incomeDurationMonths} months` : "Permanent change"} hint="Applies to income changes. 0 = permanent."><Slider label="Duration" value={c.incomeDurationMonths} onChange={(v) => set({ incomeDurationMonths: v })} min={0} max={60} /></Field>
            <Field label={`One-time event in month ${c.oneTimeMonth}`} hint="When one-time costs, purchases and new loans happen."><Slider label="One-time month" value={c.oneTimeMonth} onChange={(v) => set({ oneTimeMonth: v })} min={0} max={120} /></Field>
          </>}
          {step === 2 && <div className="grid grid-cols-2 gap-3">
            {Num({ label: "Income change", k: "incomeChangePct", unit: "%", hint: "−100 = income stops" })}
            {Num({ label: "Expense change", k: "expenseChangePct", unit: "%" })}
            {Num({ label: "Extra monthly costs", k: "expenseChangeAmount" })}
            {Num({ label: "Save more (share of income)", k: "savingsBoostPct", unit: "%" })}
            {Num({ label: "One-time cost", k: "oneTimeCost" })}
            {Num({ label: "Asset purchased (value)", k: "assetPurchase" })}
            {Num({ label: "New debt amount", k: "newDebtAmount" })}
            {Num({ label: "New debt payment / mo", k: "newDebtPayment" })}
            {Num({ label: "New debt duration", k: "newDebtMonths", unit: "mo" })}
          </div>}
          {step === 3 && <div className="space-y-3">
            <p className="text-[12.5px] text-muted">Override economic assumptions for this scenario only. Others follow your Economic Environment.</p>
            {(["inflation", "incomeGrowth", "expenseGrowth", "investReturn", "volatility"] as (keyof Assumptions)[]).map((k) => {
              const on = c.econ[k] !== undefined; const info = ASSUMPTION_INFO[k];
              return (
                <div key={k} className="rounded-2xl bg-card2 p-4">
                  <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">{info.label}</span><div className="flex items-center gap-3"><span className="num text-[13px] font-bold">{on ? c.econ[k] : base[k]}%</span><Toggle label={`Override ${info.label}`} checked={on} onChange={(v) => econ(k, v)} /></div></div>
                  {on && <div className="mt-3"><Slider label={info.label} value={c.econ[k] as number} onChange={(v) => setC((x) => ({ ...x, econ: { ...x.econ, [k]: v } }))} min={info.min} max={info.max} step={info.step} /></div>}
                </div>
              );
            })}
          </div>}
          {step === 4 && <>
            <Field label={`Horizon · ${horizon} years`}><Slider label="Horizon" value={horizon} onChange={setHorizon} min={1} max={30} /></Field>
            <Field label="Simulation paths" hint="More paths give smoother percentiles but take longer."><Select value={String(paths)} onChange={(v) => setPaths(Number(v))} options={["100", "300", "600", "1000", "5000"].map((v) => ({ value: v, label: `${v} paths${v === "600" ? " (default)" : ""}` }))} /></Field>
          </>}
          {step === 5 && <>
            <div className="text-[13px] text-muted">Baseline (dashed) vs <b className="text-fg">{name || "this scenario"}</b> · quick 200-path preview</div>
            {preview.result ? <FanChart months={preview.result.months} bands={preview.result.bands} baseline={preview.result.baselineMedian} currency={currency} height={240} /> : <ChartSkeleton h={200} />}
            {preview.result && <div className="grid grid-cols-2 gap-3 text-[12.5px]">
              <div className="rounded-2xl bg-card2 p-3"><div className="text-muted">Current plan median</div><div className="num text-[16px] font-bold">{Math.round(preview.result.kpis.baselineMedian).toLocaleString()}</div></div>
              <div className="rounded-2xl bg-accentsoft p-3"><div className="text-muted">Scenario median</div><div className="num text-[16px] font-bold">{Math.round(preview.result.kpis.medianNetWorth).toLocaleString()}</div></div>
            </div>}
          </>}
        </motion.div>
      </AnimatePresence>
    </Drawer>
  );
}

function NumField({ label, k, unit, hint, c, set, currency }: { label: string; k: keyof ScenarioChanges; unit?: string; hint?: string; c: ScenarioChanges; set: (p: Partial<ScenarioChanges>) => void; currency: string }) {
  return <Field label={label} hint={hint}><MoneyInput value={c[k] as number} onChange={(v) => set({ [k]: v } as Partial<ScenarioChanges>)} currency={unit ? "" : currency} suffix={unit} /></Field>;
}
