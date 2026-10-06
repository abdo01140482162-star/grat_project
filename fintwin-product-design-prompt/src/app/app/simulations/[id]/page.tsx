"use client";
import { ArrowLeft, FileText, GitCompare, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/store";
import { SimResults } from "@/components/results";
import { Badge, Button, Card, ConfirmDialog, EmptyState, useToast } from "@/components/ui";
import { fmtDate } from "@/lib/model";

export default function SimulationDetail() {
  const { id } = useParams<{ id: string }>();
  const { simulations, currency, remove } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [del, setDel] = useState(false);
  const s = simulations.find((x) => x.id === Number(id));
  if (!s) return <Card><EmptyState icon={<ArrowLeft className="h-5 w-5" />} title="Simulation not found" action={<Button href="/app/simulations?tab=history">Back to history</Button>} /></Card>;
  return (
    <div>
      <Link href="/app/simulations?tab=history" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} />Simulation history</Link>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><div className="label mb-2">Simulation results</div><h1 className="text-[28px] font-bold tracking-tight">{s.scenarioName}</h1><div className="mt-1 flex items-center gap-2 text-[12.5px] text-muted"><Badge tone="pos">{s.status}</Badge>{fmtDate(s.createdAt)} · {s.paths.toLocaleString()} paths · {s.horizonYears} years</div></div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDel(true)}>Delete</Button>
          <Button variant="secondary" size="sm" href={`/app/compare?ids=${s.id}`} icon={<GitCompare className="h-3.5 w-3.5" />}>Compare</Button>
          <Button size="sm" href={`/app/reports?new=1&sim=${s.id}`} icon={<FileText className="h-3.5 w-3.5" />}>Create report</Button>
        </div>
      </div>
      <SimResults r={s.result} currency={currency} paths={s.paths} name={s.scenarioName} />
      <ConfirmDialog open={del} onClose={() => setDel(false)} title="Delete this simulation?" body="It will be removed from history and comparisons." onConfirm={async () => { await remove("simulations", s.id); toast("Simulation deleted"); router.push("/app/simulations?tab=history"); }} />
    </div>
  );
}
