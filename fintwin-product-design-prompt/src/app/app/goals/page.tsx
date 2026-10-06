"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Target } from "lucide-react";
import { useStore } from "@/components/store";
import { GoalCard, goalStatus, useComposer } from "@/components/domain";
import { Item, Stagger } from "@/components/motion";
import { Button, Card, EmptyState, MetricCard, PageHeader } from "@/components/ui";
import { fmtMoney, fmtPct } from "@/lib/model";

export default function GoalsPage() {
  const { goals, currency, fresh } = useStore();
  const compose = useComposer();
  const total = goals.reduce((s, g) => s + g.target, 0);
  const saved = goals.reduce((s, g) => s + g.current, 0);
  const attention = goals.filter((g) => goalStatus(g).tone !== "pos").length;
  return (
    <div>
      <PageHeader eyebrow="Financial life" title="Goals" sub="What you're building toward. Every goal can be stress-tested through scenarios." actions={<Button icon={<Plus className="h-4 w-4" strokeWidth={1.8} />} onClick={() => compose("goal")}>Add goal</Button>} />
      <Stagger className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Item><MetricCard solid label="Active goals" value={goals.length} format={(v) => String(Math.round(v))} /></Item>
        <Item><MetricCard label="Total target" value={total} format={(v) => fmtMoney(v, currency, { compact: true })} /></Item>
        <Item><MetricCard label="Total progress" value={total ? saved / total : 0} format={(v) => fmtPct(v, 1)} sub={fmtMoney(saved, currency, { compact: true }) + " saved"} /></Item>
        <Item><MetricCard label="Needing attention" value={attention} format={(v) => String(Math.round(v))} deltaTone={attention ? "warn" : "pos"} delta={attention ? "review" : "all on track"} /></Item>
      </Stagger>
      {goals.length === 0 ? <Card><EmptyState icon={<Target className="h-5 w-5" strokeWidth={1.5} />} title="No goals yet" body="Give your future something to measure." action={<Button onClick={() => compose("goal")}>Create a goal</Button>} /></Card> : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>{goals.map((g, i) => (
            <motion.div key={g.id} layout layoutId={`goal-${g.id}`} initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.06 } }} exit={{ opacity: 0, scale: 0.97 }}>
              <GoalCard goal={g} currency={currency} fresh={fresh.has(`goals:${g.id}`)} />
            </motion.div>
          ))}</AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
