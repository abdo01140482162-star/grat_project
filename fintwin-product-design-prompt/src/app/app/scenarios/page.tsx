"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Boxes, Plus, Sparkles, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { useQuery } from "@/components/hooks";
import { ScenarioCard } from "@/components/domain";
import { ScenarioBuilder } from "@/components/builder";
import { Button, Card, ConfirmDialog, EmptyState, PageHeader, Pill, useToast } from "@/components/ui";
import { type Scenario, SCENARIO_TEMPLATES, emptyChanges } from "@/lib/model";

const CATS = ["All", "Career", "Life", "Housing", "Transportation", "Economic", "Savings", "Custom"];

export default function ScenariosPage() {
  const { scenarios, create, remove } = useStore();
  const router = useRouter();
  const toast = useToast();
  const query = useQuery();
  const [cat, setCat] = useState("All");
  const [builder, setBuilder] = useState<{ open: boolean; initial?: Partial<Scenario> | null; ai?: boolean }>({ open: false });
  const [del, setDel] = useState<Scenario | null>(null);
  useEffect(() => {
    if (query?.get("new")) setBuilder({ open: true });
    if (query?.get("ai")) setBuilder({ open: true, ai: true });
    const t = query?.get("template"); if (t) { const tpl = SCENARIO_TEMPLATES.find((x) => x.name === t); if (tpl) setBuilder({ open: true, initial: { ...tpl, changes: { ...emptyChanges(), ...tpl.changes } } }); }
  }, [query]);
  const list = useMemo(() => scenarios.filter((s) => cat === "All" || s.category === cat), [scenarios, cat]);
  const templates = SCENARIO_TEMPLATES.filter((t) => cat === "All" || t.category === cat);
  const addTemplate = async (t: (typeof SCENARIO_TEMPLATES)[number]) => { await create("scenarios", { name: t.name, category: t.category, description: t.description, changes: { ...emptyChanges(), ...t.changes } }); toast(`“${t.name}” added to your scenarios`); };

  return (
    <div>
      <PageHeader eyebrow="Simulation lab" title="Scenario Studio" sub="Test a decision before you make it. Each scenario is a transparent set of changes to your Twin." actions={<><Button variant="secondary" icon={<Sparkles className="h-4 w-4" strokeWidth={1.6} />} onClick={() => setBuilder({ open: true, ai: true })}>Describe with AI</Button><Button icon={<Plus className="h-4 w-4" strokeWidth={1.8} />} onClick={() => setBuilder({ open: true })}>New scenario</Button></>} />
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">{CATS.map((c) => <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Pill>)}</div>
      <h2 className="mb-3 text-[15px] font-bold tracking-tight">Your scenarios <span className="font-medium text-muted">· {list.length}</span></h2>
      {list.length === 0 ? <Card className="mb-8"><EmptyState icon={<Boxes className="h-5 w-5" strokeWidth={1.5} />} title="No scenarios here yet" body="Test a decision before you make it. Start from a template below or build your own." action={<Button onClick={() => setBuilder({ open: true })}>Create scenario</Button>} /></Card> : (
        <motion.div layout className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>{list.map((s, i) => (
            <motion.div key={s.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }} exit={{ opacity: 0, scale: 0.96 }}>
              <ScenarioCard s={s} onRun={() => router.push(`/app/simulations?scenario=${s.id}`)} onEdit={() => setBuilder({ open: true, initial: s })}
                onDuplicate={async () => { await create("scenarios", { name: `${s.name} (copy)`, category: s.category, description: s.description, changes: s.changes }); toast("Scenario duplicated"); }} onDelete={() => setDel(s)} />
            </motion.div>
          ))}</AnimatePresence>
        </motion.div>
      )}
      <h2 className="mb-3 text-[15px] font-bold tracking-tight">Scenario library</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {templates.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card lift group flex flex-col p-4">
            <span className="label !text-[9.5px]">{t.category}</span>
            <div className="mt-1 text-[14px] font-bold">{t.name}</div>
            <p className="mt-1 flex-1 text-[12px] text-muted">{t.description}</p>
            <div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" onClick={() => addTemplate(t)}>Add</Button><Button size="sm" variant="ghost" onClick={() => router.push(`/app/simulations?template=${encodeURIComponent(t.name)}`)} icon={<ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}>Simulate</Button></div>
          </motion.div>
        ))}
      </div>
      <ScenarioBuilder open={builder.open} onClose={() => setBuilder({ open: false })} initial={builder.initial} ai={builder.ai} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={`Delete “${del?.name}”?`} body="Past simulation results stay in your history." onConfirm={async () => { if (del) { await remove("scenarios", del.id); toast("Scenario deleted"); } setDel(null); }} />
    </div>
  );
}
