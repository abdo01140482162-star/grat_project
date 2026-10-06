"use client";
import { motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { Collapse, Item, Stagger } from "@/components/motion";
import { Badge, Button, Card, CardHeader, PageHeader, Slider, cx, useToast } from "@/components/ui";
import { ASSUMPTION_INFO, type Assumptions, PRESETS, emptyChanges, fmtMoney } from "@/lib/model";
import { deterministicFinal } from "@/lib/sim";

const KEYS: (keyof Assumptions)[] = ["inflation", "incomeGrowth", "expenseGrowth", "investReturn", "volatility", "horizonYears"];

export default function EconomyPage() {
  const { twin, accounts, saveTwin, currency } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [draft, setDraft] = useState<Assumptions>(twin.assumptions);
  const [open, setOpen] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(twin.assumptions);
  const impact = useMemo(() => {
    const base = deterministicFinal({ twin, accounts, changes: emptyChanges(), horizonYears: 10, paths: 1, assumptions: draft });
    const out: Partial<Record<keyof Assumptions, number>> = {};
    for (const k of KEYS) { if (k === "horizonYears" || k === "volatility") continue; out[k] = deterministicFinal({ twin, accounts, changes: emptyChanges(), horizonYears: 10, paths: 1, assumptions: { ...draft, [k]: draft[k] + 1 } }) - base; }
    return { base, out };
  }, [draft, twin, accounts]);
  const apply = async (key: string) => {
    const p = PRESETS[key];
    const a = { ...p.a, horizonYears: draft.horizonYears };
    setDraft(a);
    await saveTwin({ ...twin, assumptions: a, economicPreset: key });
    toast(`${p.label} applied to simulations`, { label: "Run", onClick: () => router.push("/app/simulations") });
  };
  const save = async () => { await saveTwin({ ...twin, assumptions: draft, economicPreset: "custom" }); toast("Assumptions saved — simulations will use them"); };

  return (
    <div>
      <PageHeader eyebrow="Economic data" title="Economic Environment" sub="The assumptions that shape every simulation. They're model inputs — not forecasts — and you can change all of them." actions={dirty && <><Button variant="secondary" onClick={() => setDraft(twin.assumptions)}>Reset</Button><Button onClick={save}>Save assumptions</Button></>} />
      <h2 className="mb-3 text-[15px] font-bold tracking-tight">Economic scenario presets</h2>
      <Stagger className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(PRESETS).map(([k, p]) => {
          const on = twin.economicPreset === k;
          return (
            <Item key={k}><div className={cx("relative flex h-full flex-col p-4 lift", on ? "card-solid" : "card")}>
              <div className="flex items-center justify-between"><span className="text-[14px] font-bold">{p.label}</span>{on && <Badge tone="accent">Active</Badge>}</div>
              <p className={cx("mt-1 text-[11.5px]", on ? "text-solidmuted" : "text-muted")}>{p.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
                {[["Inflation", p.a.inflation], ["Income", p.a.incomeGrowth], ["Return", p.a.investReturn], ["Volatility", p.a.volatility]].map(([l, v]) => <div key={l} className="flex justify-between"><span className={on ? "text-solidmuted" : "text-muted"}>{l}</span><span className="num font-semibold">{v}%</span></div>)}
              </div>
              <Button size="sm" variant={on ? "accent" : "secondary"} className="mt-4" onClick={() => apply(k)} icon={on ? <Check className="h-3.5 w-3.5" /> : undefined}>{on ? "Applied" : "Apply to Simulation"}</Button>
            </div></Item>
          );
        })}
      </Stagger>
      <h2 className="mb-3 text-[15px] font-bold tracking-tight">Assumptions <span className="font-medium text-muted">· {twin.economicPreset === "custom" ? "Custom" : PRESETS[twin.economicPreset]?.label}</span></h2>
      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {KEYS.map((k) => {
          const info = ASSUMPTION_INFO[k]; const isOpen = open === k; const imp = impact.out[k];
          return (
            <Item key={k}><Card className="h-full">
              <CardHeader title={info.label} sub={info.explain} info={info.why} action={<Badge tone="neutral" dot={false}>Model input</Badge>} />
              <div className="mb-3 flex items-end gap-1"><motion.span key={draft[k]} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="num text-[40px] font-bold leading-none">{draft[k]}</motion.span><span className="pb-1 text-[16px] font-bold text-muted">{info.unit}</span></div>
              <Slider label={info.label} value={draft[k]} onChange={(v) => setDraft((d) => ({ ...d, [k]: v }))} min={info.min} max={info.max} step={info.step} />
              <div className="mt-1 flex justify-between text-[10.5px] text-faint"><span>{info.min}{info.unit}</span><span>{info.max}{info.unit}</span></div>
              <button onClick={() => setOpen(isOpen ? null : k)} aria-expanded={isOpen} className="mt-3 flex w-full items-center justify-between rounded-xl px-1 py-1 text-[12px] font-semibold text-muted hover:text-fg">Why this matters<ChevronDown className={cx("h-4 w-4 transition-transform", isOpen && "rotate-180")} strokeWidth={1.6} /></button>
              <Collapse open={isOpen}>
                <div className="space-y-2.5 pt-2 text-[12px]">
                  <div><b>Current assumption:</b> <span className="text-muted">{draft[k]}{info.unit} {k === "horizonYears" ? "" : "per year"}</span></div>
                  <div><b>Historical context:</b> <span className="text-muted">{info.history}</span></div>
                  <div><b>Model use:</b> <span className="text-muted">{info.why}</span></div>
                  {imp !== undefined && <div className="rounded-xl bg-card2 p-2.5"><b>Impact on simulation:</b> <span className="text-muted">+1 point changes the 10-year central estimate by </span><b className="num">{fmtMoney(imp, currency, { compact: true, sign: true })}</b></div>}
                  <p className="text-[11px] text-faint">Historical figures describe the past; the model treats this value as an assumption, not a prediction.</p>
                </div>
              </Collapse>
            </Card></Item>
          );
        })}
      </Stagger>
    </div>
  );
}
