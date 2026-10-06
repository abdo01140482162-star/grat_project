"use client";
import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useId, useMemo, useState } from "react";
import { fmtMoney } from "@/lib/model";
import { EASE } from "./motion";

const W = 800;
type Pt = [number, number];
function scale(vals: number[], h: number, pad = 0.08) {
  let min = Math.min(...vals), max = Math.max(...vals);
  if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
  if (min === max) { min -= 1; max += 1; }
  const span = max - min; min -= span * pad; max += span * pad;
  return { y: (v: number) => h - ((v - min) / (max - min)) * h, min, max };
}
function smooth(pts: Pt[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}
function area(top: Pt[], bottom: Pt[]) {
  const back = [...bottom].reverse();
  return `${smooth(top)} L${back[0][0]},${back[0][1]} ${smooth(back).slice(1).replace(/^[^C]*/, "")} Z`;
}
function ticks(min: number, max: number, n = 4) { return Array.from({ length: n + 1 }, (_, i) => min + ((max - min) * i) / n); }

function HoverLayer({ count, onIndex, children }: { count: number; onIndex: (i: number | null) => void; children?: ReactNode }) {
  return (
    <div className="absolute inset-0" onMouseLeave={() => onIndex(null)}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left) / r.width) * (count - 1)); onIndex(Math.max(0, Math.min(count - 1, i))); }}>
      {children}
    </div>
  );
}
function ChartTip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: EASE }}
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-2xl bg-[#151310] px-3 py-2 text-[11.5px] text-[#F9F7EF] shadow-lift"
      style={{ left: `${Math.min(88, Math.max(12, x))}%`, top: `calc(${y}% - 12px)` }}>
      {children}
    </motion.div>
  );
}
const Dot = ({ x, y, tone = "var(--accent)" }: { x: number; y: number; tone?: string }) => (
  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="pointer-events-none absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--card)]" style={{ left: `${x}%`, top: `${y}%`, background: tone }} />
);

/* ---------- Fan chart: future distribution ---------- */
export function FanChart({ months, bands, baseline, height = 280, currency = "EGP", compact = false, showLegend = true }: {
  months: number[]; bands: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[]; mean?: number[] }; baseline?: number[]; height?: number; currency?: string; compact?: boolean; showLegend?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const [hi, setHi] = useState<number | null>(null);
  const H = 300;
  const all = [...bands.p5, ...bands.p95, ...(baseline ?? [])];
  const s = scale(all, H);
  const x = (i: number) => (i / Math.max(1, months.length - 1)) * W;
  const pts = (arr: number[]): Pt[] => arr.map((v, i) => [x(i), s.y(v)]);
  const outer = area(pts(bands.p95), pts(bands.p5));
  const inner = area(pts(bands.p75), pts(bands.p25));
  const yrs = months[months.length - 1] / 12;
  return (
    <div>
      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label={`Projected net worth range over ${yrs} years. Median ends at ${fmtMoney(bands.p50[bands.p50.length - 1], currency)}.`}>
          <defs>
            <pattern id={`h${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--hatch)" strokeWidth="1.6" /></pattern>
            <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.32" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0.12" /></linearGradient>
          </defs>
          {!compact && ticks(s.min, s.max).map((t, i) => <line key={i} x1={0} x2={W} y1={s.y(t)} y2={s.y(t)} stroke="var(--line)" vectorEffect="non-scaling-stroke" />)}
          <motion.g initial={{ opacity: 0, scaleY: 0.6 }} animate={{ opacity: 1, scaleY: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.35 }} style={{ transformOrigin: `0px ${s.y(bands.p50[0])}px` }}>
            <path d={outer} fill={`url(#h${id})`} />
            <path d={inner} fill={`url(#g${id})`} />
          </motion.g>
          {baseline && <motion.path d={smooth(pts(baseline))} fill="none" stroke="var(--faint)" strokeWidth="1.5" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} />}
          {bands.mean && !compact && <path d={smooth(pts(bands.mean))} fill="none" stroke="var(--fg)" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />}
          <motion.path d={smooth(pts(bands.p50))} fill="none" stroke="var(--fg)" strokeWidth="2.2" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, ease: EASE }} />
        </svg>
        {!compact && <div className="pointer-events-none absolute inset-y-0 left-0 flex flex-col justify-between py-0 text-[10px] text-faint num">{ticks(s.min, s.max).reverse().map((t, i) => <span key={i} className="-translate-y-1/2 first:translate-y-0 last:-translate-y-full">{fmtMoney(t, "", { compact: true }).trim()}</span>)}</div>}
        <HoverLayer count={months.length} onIndex={setHi} />
        <AnimatePresence>
          {hi !== null && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-line2" style={{ left: `${(x(hi) / W) * 100}%` }} />
              <Dot x={(x(hi) / W) * 100} y={(s.y(bands.p50[hi]) / H) * 100} tone="var(--fg)" />
              <ChartTip x={(x(hi) / W) * 100} y={(s.y(bands.p95[hi]) / H) * 100}>
                <div className="mb-1 font-semibold">{months[hi] === 0 ? "Today" : months[hi] % 12 === 0 ? `Year ${months[hi] / 12}` : `Month ${months[hi]}`}</div>
                <div className="num grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
                  <span className="opacity-60">95th</span><span>{fmtMoney(bands.p95[hi], currency, { compact: true })}</span>
                  <span className="text-[#F3C142]">Median</span><span className="font-semibold text-[#F3C142]">{fmtMoney(bands.p50[hi], currency, { compact: true })}</span>
                  <span className="opacity-60">5th</span><span>{fmtMoney(bands.p5[hi], currency, { compact: true })}</span>
                  {baseline && <><span className="opacity-60">Current plan</span><span>{fmtMoney(baseline[hi], currency, { compact: true })}</span></>}
                </div>
              </ChartTip>
            </>
          )}
        </AnimatePresence>
      </div>
      {showLegend && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-fg" />Median</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-accent/40" />25th–75th</span>
          <span className="flex items-center gap-1.5"><span className="hatch h-2.5 w-4 rounded-sm border border-line2" />5th–95th (uncertainty)</span>
          {bands.mean && !compact && <span className="flex items-center gap-1.5"><span className="w-4 border-t border-dotted border-fg" />Expected (mean)</span>}
          {baseline && <span className="flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-faint" />Current plan</span>}
          <span className="ml-auto label !text-[9.5px]">{months.length > 1 ? `Today → ${yrs} yrs` : ""}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Line chart ---------- */
export function LineChart({ series, labels, height = 200, currency = "EGP", format }: {
  series: { label: string; data: number[]; style?: "solid" | "dashed"; tone?: "ink" | "accent" | "muted"; fill?: boolean }[]; labels: string[]; height?: number; currency?: string; format?: (v: number) => string;
}) {
  const [hi, setHi] = useState<number | null>(null);
  const id = useId().replace(/:/g, "");
  const H = 200;
  const s = scale(series.flatMap((x) => x.data), H);
  const n = labels.length;
  const x = (i: number) => (i / Math.max(1, n - 1)) * W;
  const tone = (t?: string) => (t === "accent" ? "var(--accent)" : t === "muted" ? "var(--faint)" : "var(--fg)");
  const f = format ?? ((v: number) => fmtMoney(v, currency, { compact: true }));
  return (
    <div>
      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label={series.map((sr) => `${sr.label}: latest ${f(sr.data[sr.data.length - 1])}`).join(". ")}>
          <defs><linearGradient id={`lf${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
          {ticks(s.min, s.max, 3).map((t, i) => <line key={i} x1={0} x2={W} y1={s.y(t)} y2={s.y(t)} stroke="var(--line)" vectorEffect="non-scaling-stroke" />)}
          {series.map((sr, k) => {
            const p = sr.data.map((v, i) => [x(i), s.y(v)] as Pt);
            return (
              <g key={k} opacity={hi !== null ? 1 : 1}>
                {sr.fill && <motion.path d={`${smooth(p)} L${W},${H} L0,${H} Z`} fill={`url(#lf${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }} />}
                <motion.path d={smooth(p)} fill="none" stroke={tone(sr.tone)} strokeWidth={sr.tone === "muted" ? 1.5 : 2.2} strokeDasharray={sr.style === "dashed" ? "5 5" : undefined} vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: EASE, delay: k * 0.1 }} />
              </g>
            );
          })}
        </svg>
        <HoverLayer count={n} onIndex={setHi} />
        <AnimatePresence>
          {hi !== null && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-line2" style={{ left: `${(x(hi) / W) * 100}%` }} />
              {series.map((sr, k) => <Dot key={k} x={(x(hi) / W) * 100} y={(s.y(sr.data[hi]) / H) * 100} tone={tone(sr.tone)} />)}
              <ChartTip x={(x(hi) / W) * 100} y={(Math.min(...series.map((sr) => s.y(sr.data[hi]))) / H) * 100}>
                <div className="mb-1 font-semibold">{labels[hi]}</div>
                {series.map((sr, k) => <div key={k} className="num flex justify-between gap-4"><span className={k === 0 ? "text-[#F3C142]" : "opacity-60"}>{sr.label}</span><span>{f(sr.data[hi])}</span></div>)}
              </ChartTip>
            </>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] text-faint">{labels.filter((_, i) => n <= 8 || i % Math.ceil(n / 6) === 0 || i === n - 1).map((l, i) => <span key={i}>{l}</span>)}</div>
    </div>
  );
}

/* ---------- Bars (grouped, e.g. income vs expenses) ---------- */
export function BarChart({ data, height = 180, currency = "EGP", keys = ["a", "b"], names = ["Income", "Expenses"], onSelect }: {
  data: { label: string; a: number; b?: number }[]; height?: number; currency?: string; keys?: ("a" | "b")[]; names?: string[]; onSelect?: (label: string) => void;
}) {
  const [hi, setHi] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [Math.abs(d.a), Math.abs(d.b ?? 0)]));
  return (
    <div className="relative">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <button key={d.label} type="button" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} onFocus={() => setHi(i)} onBlur={() => setHi(null)} onClick={() => onSelect?.(d.label)}
            className="group relative flex h-full flex-1 items-end justify-center gap-1 rounded-xl" aria-label={`${d.label}: ${names[0]} ${fmtMoney(d.a, currency)}${d.b !== undefined ? `, ${names[1]} ${fmtMoney(d.b, currency)}` : ""}`}>
            {keys.map((k, ki) => {
              const v = Math.abs(k === "a" ? d.a : d.b ?? 0);
              return <motion.span key={k} className={`w-full max-w-[22px] rounded-t-[8px] rounded-b-[3px] transition-opacity ${ki === 0 ? "bg-fg" : "hatch border border-line2 bg-accent/50"} ${hi !== null && hi !== i ? "opacity-35" : ""}`}
                initial={{ height: 0 }} animate={{ height: `${(v / max) * 100}%` }} transition={{ duration: 0.7, ease: EASE, delay: i * 0.04 }} />;
            })}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-[10.5px] text-faint">{data.map((d) => <span key={d.label} className="flex-1 truncate text-center">{d.label}</span>)}</div>
      <AnimatePresence>
        {hi !== null && (
          <ChartTip x={((hi + 0.5) / data.length) * 100} y={10}>
            <div className="mb-0.5 font-semibold">{data[hi].label}</div>
            <div className="num flex justify-between gap-4"><span className="text-[#F3C142]">{names[0]}</span><span>{fmtMoney(data[hi].a, currency)}</span></div>
            {data[hi].b !== undefined && <div className="num flex justify-between gap-4"><span className="opacity-60">{names[1]}</span><span>{fmtMoney(data[hi].b!, currency)}</span></div>}
          </ChartTip>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Histogram with percentiles ---------- */
export function Histogram({ bins, percentiles, currency = "EGP", height = 180 }: { bins: { x0: number; x1: number; count: number }[]; percentiles: Record<string, number>; currency?: string; height?: number }) {
  const [hi, setHi] = useState<number | null>(null);
  const max = Math.max(1, ...bins.map((b) => b.count));
  const lo = bins[0]?.x0 ?? 0, top = bins[bins.length - 1]?.x1 ?? 1;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (top - lo)) * 100));
  const total = bins.reduce((s, b) => s + b.count, 0);
  return (
    <div>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end gap-[3px]">
          {bins.map((b, i) => {
            const isMid = percentiles["50"] >= b.x0 && percentiles["50"] < b.x1;
            const inIQR = b.x1 > percentiles["25"] && b.x0 < percentiles["75"];
            return (
              <div key={i} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
                <motion.div className={`w-full rounded-t-md ${isMid ? "bg-accent" : inIQR ? "bg-fg/80" : "hatch bg-card2 border border-line2"} ${hi !== null && hi !== i ? "opacity-40" : ""} transition-opacity`}
                  initial={{ height: 0 }} animate={{ height: `${(b.count / max) * 100}%` }} transition={{ duration: 0.6, ease: EASE, delay: i * 0.02 }} />
              </div>
            );
          })}
        </div>
        <AnimatePresence>
          {hi !== null && (
            <ChartTip x={((hi + 0.5) / bins.length) * 100} y={100 - (bins[hi].count / max) * 100}>
              <div className="num">{fmtMoney(bins[hi].x0, currency, { compact: true })} – {fmtMoney(bins[hi].x1, currency, { compact: true })}</div>
              <div className="num font-semibold text-[#F3C142]">{((bins[hi].count / total) * 100).toFixed(1)}% of futures</div>
            </ChartTip>
          )}
        </AnimatePresence>
      </div>
      <div className="relative mt-3 h-10 border-t border-line">
        {["5", "15", "25", "50", "75", "85", "95"].map((p) => (
          <div key={p} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${pos(percentiles[p])}%` }}>
            <div className={`mx-auto h-2 w-px ${p === "50" ? "bg-accent" : "bg-line2"}`} />
            <div className={`text-[10px] font-semibold ${p === "50" ? "text-fg" : "text-faint"}`}>{p}th</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Tornado (sensitivity) ---------- */
export function Tornado({ items, currency = "EGP", format }: { items: { label: string; impact: number }[]; currency?: string; format?: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.impact)));
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.label} className="grid grid-cols-[120px_1fr_80px] items-center gap-3 text-[12.5px] md:grid-cols-[150px_1fr_90px]">
          <span className="truncate font-semibold">{it.label}</span>
          <div className="relative h-6">
            <div className="absolute inset-y-0 left-1/2 w-px bg-line2" />
            <motion.div className={`absolute top-1 h-4 rounded-full ${it.impact >= 0 ? "left-1/2 bg-accent" : "right-1/2 bg-fg"}`}
              initial={{ width: 0 }} animate={{ width: `${(Math.abs(it.impact) / max) * 50}%` }} transition={{ duration: 0.6, ease: EASE, delay: i * 0.05 }} />
          </div>
          <span className="num text-right text-muted">{format ? format(it.impact) : fmtMoney(it.impact, currency, { compact: true, sign: true })}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Sparkline ---------- */
export function Sparkline({ data, height = 36, tone = "var(--fg)", className = "" }: { data: number[]; height?: number; tone?: string; className?: string }) {
  const s = useMemo(() => scale(data, 40, 0.1), [data]);
  if (data.length < 2) return null;
  const p = data.map((v, i) => [(i / (data.length - 1)) * 120, s.y(v)] as Pt);
  return (
    <svg viewBox="0 0 120 40" preserveAspectRatio="none" className={className} style={{ height, width: "100%" }} aria-hidden>
      <motion.path d={smooth(p)} fill="none" stroke={tone} strokeWidth="1.8" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: EASE }} />
    </svg>
  );
}
