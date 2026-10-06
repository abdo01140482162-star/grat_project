"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FileText, Home, Layers, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type Account, type SimResult, demoTwin, emptyChanges, fmtMoney, metrics, SCENARIO_TEMPLATES } from "@/lib/model";
import { runSimulationAsync } from "@/lib/sim";
import { FanChart } from "@/components/charts";
import { CountUp, EASE, ProgressPill } from "@/components/motion";
import { Button, Logo, cx } from "@/components/ui";
import { api } from "@/components/store";

const TWIN = demoTwin("Layla");
const ACCS: Account[] = [{ id: 1, name: "Main Bank", type: "Checking", balance: 38200, currency: "EGP", updatedAt: "", createdAt: "" }, { id: 2, name: "Emergency", type: "Savings", balance: 47300, currency: "EGP", updatedAt: "", createdAt: "" }, { id: 3, name: "Card", type: "Credit Card", balance: -8500, currency: "EGP", updatedAt: "", createdAt: "" }];
const M = metrics(TWIN, ACCS);
const GOAL = { id: 1, name: "Buy a Home", kind: "Buy a Home", target: 1500000, current: 210000, monthly: 6500, targetDate: `${new Date().getFullYear() + 7}-06-01`, probability: null, accountId: null, createdAt: "" };
const DUR = 35;
// camera keyframes: [start second, scale, x, y]
const CAM: [number, number, number, number][] = [[0, 1, 0, 0], [7, 1.35, 260, 120], [11, 1.4, -250, 120], [15, 1.35, 260, -90], [20, 1.3, -60, -120], [24, 1.15, 0, -60], [28, 1.4, -250, -110], [32, 1, 0, 0]];
const CAPTIONS: [number, string][] = [[0, ""], [2, "Your financial life, today"], [7, "A living Financial Twin"], [11, "Choose what you're building toward"], [15, "Change one thing"], [20, "Run 600 possible futures"], [24, "See the full range of outcomes"], [28, "Understand why"], [32, "Share it as a report"]];

export default function DemoPage() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [t, setT] = useState(0); const [playing, setPlaying] = useState(true);
  const [sim, setSim] = useState<SimResult | null>(null);
  const last = useRef<number | null>(null);
  useEffect(() => { runSimulationAsync({ twin: TWIN, accounts: ACCS, changes: { ...emptyChanges(), ...SCENARIO_TEMPLATES.find((x) => x.name === "Save 15% More")!.changes }, horizonYears: 7, paths: 600, goal: GOAL, seed: 3 }).then(setSim); }, []);
  useEffect(() => {
    if (!playing) { last.current = null; return; }
    let raf = 0;
    const tick = (now: number) => { if (last.current !== null) setT((x) => Math.min(DUR + 3, x + (now - last.current!) / 1000)); last.current = now; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [playing]);
  const cam = [...CAM].reverse().find((c) => t >= c[0])!;
  const caption = [...CAPTIONS].reverse().find((c) => t >= c[0])![1];
  const at = (s: number) => t >= s;
  const simPct = Math.max(0, Math.min(1, (t - 20.5) / 3));
  const tryDemo = async () => { try { const r = await api<{ next: string }>("/api/auth/demo", "POST"); router.push(r.next); } catch { router.push("/signup"); } };
  const ended = t >= DUR;

  return (
    <div className="glow-bg relative h-screen overflow-hidden">
      <div className="absolute left-5 top-5 z-30"><Link href="/"><Logo /></Link></div>
      <div className="absolute right-5 top-5 z-30 flex gap-2">
        <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
        <button onClick={() => { setT(0); setPlaying(true); }} aria-label="Replay" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card"><RotateCcw className="h-4 w-4" /></button>
        <Button variant="secondary" onClick={() => setT(DUR)}>Skip</Button>
      </div>

      {/* intro logo */}
      <AnimatePresence>{t < 2 && <motion.div key="intro" className="absolute inset-0 z-20 grid place-items-center" exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6 }}><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: EASE }}><Logo size={56} animated /></motion.div></motion.div>}</AnimatePresence>

      {/* product canvas with camera */}
      <div className="absolute inset-0 grid place-items-center">
        <motion.div animate={reduced ? { scale: 0.9 } : { scale: cam[1] * 0.9, x: cam[2], y: cam[3] }} transition={{ duration: 3.4, ease: [0.45, 0, 0.2, 1] }} className={cx("w-[1080px] max-w-[96vw] transition-opacity duration-700", at(2) ? "opacity-100" : "opacity-0")}>
          <div className="grid grid-cols-4 gap-3">
            {[{ l: "Net worth", v: M.netWorth, solid: true }, { l: "Income", v: M.income }, { l: "Expenses", v: M.expenses }, { l: "Monthly savings", v: M.savings + (at(17) ? 3240 : 0) }].map((k, i) => (
              <motion.div key={k.l} initial={{ opacity: 0, y: 14 }} animate={at(2.2 + i * 0.15) ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, ease: EASE }} className={cx("p-5", k.solid ? "card-solid" : "card")}>
                <div className={cx("text-[12px]", k.solid ? "text-solidmuted" : "text-muted")}>{k.l}</div>
                <div className="mt-2 text-[26px] font-bold">{at(4) ? <CountUp value={k.v} duration={2200} format={(v) => fmtMoney(v)} /> : "EGP 0"}</div>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={at(3) ? { opacity: 1, y: 0 } : {}} className={cx("card p-5 transition-shadow", at(7) && t < 11 && "ring-2 ring-accent")}>
              <div className="mb-3 flex items-center gap-2 text-[13px] font-bold"><Layers className="h-4 w-4" />Financial Twin</div>
              {[["Income", M.income], ["Expenses", M.expenses], ["Liquid", M.liquid], ["Assets", M.totalAssets], ["Debt", M.totalDebt]].map(([l, v], i) => <motion.div key={l as string} initial={{ opacity: 0, x: -6 }} animate={at(7.3 + i * 0.25) ? { opacity: 1, x: 0 } : {}} className="flex justify-between py-1 text-[12.5px]"><span className="text-muted">{l}</span><span className="num font-semibold">{fmtMoney(v as number)}</span></motion.div>)}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={at(3.2) ? { opacity: 1, y: 0 } : {}} className={cx("p-5 transition-colors duration-500", at(11) ? "card-solid" : "card")}>
              <div className="mb-3 flex items-center gap-2 text-[13px] font-bold"><Home className="h-4 w-4" />Buy a Home</div>
              <div className="num text-[22px] font-bold">{at(11.5) ? <CountUp value={GOAL.current} duration={1200} format={(v) => fmtMoney(v)} /> : "EGP 0"}</div>
              <div className={cx("text-[11.5px]", at(11) ? "text-solidmuted" : "text-muted")}>of {fmtMoney(GOAL.target)}</div>
              <ProgressPill className="mt-3" value={at(12) ? GOAL.current / GOAL.target : 0} />
              <div className={cx("mt-3 text-[12px]", at(11) ? "text-solidmuted" : "text-muted")}>Probability {at(24) && sim ? <b className="num text-accent">{Math.round((sim.kpis.goalProbability ?? 0) * 100)}%</b> : "—"}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={at(3.4) ? { opacity: 1, y: 0 } : {}} className={cx("card p-5", at(15) && t < 20 && "ring-2 ring-accent")}>
              <div className="label mb-1">Scenario</div>
              <div className="text-[16px] font-bold">{at(15.5) ? "Save 15% More" : "—"}</div>
              {at(16) && <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-1 text-[12px] text-muted"><li>· Redirect 15% of income</li><li>· Flexible spending reduced</li><li>· Monthly surplus <b className="text-fg">+EGP 3,240</b></li></motion.ul>}
              {at(18.5) && <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 inline-flex rounded-full bg-btn px-3 py-1.5 text-[12px] font-semibold text-btnfg">▶ Run simulation</motion.div>}
            </motion.div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={at(3.6) ? { opacity: 1, y: 0 } : {}} className="card col-span-2 p-5">
              <div className="mb-2 flex items-center justify-between text-[13px] font-bold"><span>Future distribution</span>{at(20) && <span className="num text-[12px] text-muted">{Math.round(simPct * 600)} / 600 futures</span>}</div>
              {at(20) && t < 24 && <div className="py-10"><ProgressPill value={simPct} height={10} /><div className="mt-3 text-center text-[12.5px] text-muted">{simPct < 0.3 ? "Generating possible paths" : simPct < 0.8 ? "Running 600 futures" : "Calculating percentiles"}</div></div>}
              {at(24) && sim ? <FanChart months={sim.months} bands={sim.bands} baseline={sim.baselineMedian} height={190} showLegend={false} /> : !at(20) && <div className="hatch h-[190px] rounded-2xl opacity-40" />}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={at(3.8) ? { opacity: 1, y: 0 } : {}} className={cx("card p-5", at(28) && t < 32 && "ring-2 ring-accent")}>
              <div className="mb-2 flex items-center gap-2 text-[13px] font-bold"><span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-accentfg"><Sparkles className="h-3 w-3" /></span>AI insight</div>
              {at(28.3) && sim ? <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[12.5px] leading-relaxed">Saving 15% more raises the estimated median net worth to <b className="num">{fmtMoney(sim.kpis.medianNetWorth, "EGP", { compact: true })}</b> in 7 years — <b className="num">{fmtMoney(sim.kpis.medianNetWorth - sim.kpis.baselineMedian, "EGP", { compact: true, sign: true })}</b> vs your current plan, under the selected assumptions.</motion.p> : <div className="space-y-2"><div className="shimmer h-3 rounded" /><div className="shimmer h-3 w-2/3 rounded" /></div>}
              {at(32) && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 rounded-2xl bg-card2 p-2.5 text-[12px] font-semibold"><FileText className="h-4 w-4" />Scenario report · ready</motion.div>}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* caption + toast */}
      <div className="pointer-events-none absolute inset-x-0 bottom-10 z-20 flex justify-center">
        <AnimatePresence mode="wait">{caption && !ended && <motion.div key={caption} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.4 }} className="rounded-full bg-[#151310] px-5 py-2.5 text-[14px] font-semibold text-[#F9F7EF] shadow-lift"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#F3C142]" />{caption}</motion.div>}</AnimatePresence>
      </div>
      <AnimatePresence>{at(33) && !ended && <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="absolute bottom-10 left-6 z-20 flex items-center gap-3 rounded-full bg-[#151310] px-4 py-2.5 text-[13px] text-[#F9F7EF] shadow-lift"><span className="h-2 w-2 rounded-full bg-[#F3C142]" />Your report is ready.</motion.div>}</AnimatePresence>

      {/* end card */}
      <AnimatePresence>{ended && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="absolute inset-0 z-40 grid place-items-center bg-bg/85 backdrop-blur-md">
          <div className="px-5 text-center">
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7, ease: EASE }} className="text-[36px] font-extrabold tracking-tight md:text-[54px]">See your financial future<br />before it happens.</motion.h1>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={tryDemo} icon={<Play className="h-4 w-4" />}>Explore the live demo Twin</Button>
              <Button size="lg" variant="secondary" href="/signup" icon={<ArrowRight className="h-4 w-4" />}>Build My Financial Twin</Button>
            </motion.div>
            <button onClick={() => setT(0)} className="mt-6 text-[12.5px] font-semibold text-muted hover:text-fg">Replay showcase</button>
          </div>
        </motion.div>
      )}</AnimatePresence>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-line"><div className="h-full bg-accent" style={{ width: `${Math.min(1, t / DUR) * 100}%` }} /></div>
    </div>
  );
}
