import { ChartSkeleton, KpiSkeleton, RowsSkeleton, Skel } from "@/components/ui";

export default function Loading() {
  return (
    <div>
      <div className="space-y-5" aria-busy="true" aria-label="Loading your Financial Twin">
        <Skel className="h-3 w-28" /><Skel className="h-8 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <KpiSkeleton key={i} />)}</div>
        <div className="grid gap-4 lg:grid-cols-3"><div className="lg:col-span-2"><ChartSkeleton /></div><RowsSkeleton rows={5} /></div>
      </div>
    </div>
  );
}
