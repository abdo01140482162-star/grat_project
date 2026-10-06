"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Baby, Briefcase, Check, ChevronDown, Flame, Home, Layers, Lock, PiggyBank, Play, Sparkles, TrendingDown, TrendingUp, Laptop, Eye, Database, FlaskConical, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { type Account, type SimResult, demoTwin, emptyChanges, fmtMoney, metrics, SCENARIO_TEMPLATES } from "@/lib/model";
import { runSimulationAsync } from "@/lib/sim";
import { FanChart } from "./charts";
import { Collapse, CountUp, EASE, InView, KenBurns, ProgressPill } from "./motion";
import { Button, Logo, cx } from "./ui";
import { useTheme } from "./shell";

const TWIN = demoTwin("Layla");
const ACCS: Account[] = [
  { id: 1, name: "Main Bank", type: "Checking", balance: 38200, currency: "EGP", updatedAt: "", createdAt: "" },
  { id: 2, name: "Emergency Savings", type: "Savings", balance: 47300, currency: "EGP", updatedAt: "", createdAt: "" },
  { id: 3, name: "Credit Card", type: "Credit Card", balance: -8500, currency: "EGP", updatedAt: "", createdAt: "" },
];
const M = metrics(TWIN, ACCS);
const SAVE = { ...emptyChanges(), ...SCENARIO_TEMPLATES.find((t) => t.name === "Save 15% More")!.changes };

function useDemoSims() {
  const [base, setBase] = useState<SimResult | null>(null);
  const [scen, setScen] = useState<SimResult | null>(null);
  useEffect(() => {
    runSimulationAsync({ twin: TWIN, accounts: ACCS, changes: emptyChanges(), horizonYears: 10, paths: 300, seed: 5 }).then(setBase);
    runSimulationAsync({ twin: TWIN, accounts: ACCS, changes: SAVE, horizonYears: 10, paths: 300, seed: 5 }).then(setScen);
  }, []);
  return { base, scen };
}

export function Landing({ signedIn }: { signedIn: boolean }) {
  const { base, scen } = useDemoSims();
  const { theme, toggle } = useTheme();
  const [phase, setPhase] = useState(0); // 0 metrics, 1 scenario chip, 2 future expands
  useEffect(() => { const a = setTimeout(() => setPhase(1), 2600), b = setTimeout(() => setPhase(2), 3500); return () => { clearTimeout(a); clearTimeout(b); }; }, []);
  const shown = phase >= 2 && scen ? scen : base;
  const fade = (d: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: EASE, delay: d } });

  return (
    <div className="glow-bg min-h-screen overflow-x-hidden">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="sticky top-0 z-40 border-b border-line bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5">
          <Link href="/"><Logo animated /></Link>
          <nav className="hidden flex-1 items-center gap-6 text-[13px] font-semibold text-muted md:flex">
            {[["#product", "Product"], ["#how", "How it works"], ["#scenarios", "Scenarios"], ["#trust", "Trust"], ["#faq", "FAQ"]].map(([h, l]) => <a key={h} href={h} className="hover:text-fg">{l}</a>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggle} aria-label="Toggle theme" className="grid h-9 w-9 place-items-center rounded-full hover:bg-card2">{theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}</button>
            {signedIn ? <Button size="sm" href="/app">Open FinTwin</Button> : <><Link href="/login" className="hidden px-3 text-[13px] font-semibold sm:block">Log in</Link><Button size="sm" href="/signup">Get started</Button></>}
          </div>
        </div>
      </motion.header>

      {/* HERO */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <motion.div {...fade(0.1)} className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-[12px] font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Living Financial Digital Twin & Scenario Laboratory</motion.div>
          <motion.h1 {...fade(0.2)} className="text-[42px] font-extrabold leading-[1.02] tracking-[-0.035em] md:text-[56px]">See your financial future <span className="relative whitespace-nowrap">before it happens<motion.span className="absolute -bottom-1 left-0 h-[6px] rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 1, duration: 0.8, ease: EASE }} /></span>.</motion.h1>
          <motion.p {...fade(0.32)} className="mt-6 max-w-[520px] text-[16px] leading-relaxed text-muted">Build a living model of your financial life, test possible scenarios, and understand the range of futures your decisions could create.</motion.p>
          <div className="mt-8 flex flex-wrap gap-3">
            <motion.div {...fade(0.42)}><Button size="lg" href={signedIn ? "/app" : "/signup"} icon={<Layers className="h-4 w-4" strokeWidth={1.6} />}>Build My Financial Twin</Button></motion.div>
            <motion.div {...fade(0.48)}><Button size="lg" variant="secondary" href="/demo" icon={<Play className="h-4 w-4" strokeWidth={1.6} />}>Explore a Simulation</Button></motion.div>
          </div>
          <motion.div {...fade(0.6)} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-muted">{["Monte Carlo simulation", "Transparent assumptions", "Educational, not advice"].map((x) => <span key={x} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-fg" strokeWidth={2} />{x}</span>)}</motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.5 }} className="relative">
          <div className="hatch absolute -inset-4 rounded-[36px] opacity-40" />
          <div className="relative rounded-[30px] border border-line bg-canvas p-4 shadow-lift md:p-5">
            <div className="mb-3 flex items-center justify-between px-1"><div className="flex items-center gap-2 text-[12px] font-semibold text-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-pos" />Layla&apos;s Financial Twin</div><span className="text-[11px] text-faint">Live model</span></div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="card-solid col-span-2 p-4 md:col-span-1"><div className="text-[11.5px] text-solidmuted">Net worth</div><CountUp value={M.netWorth} duration={1800} format={(v) => fmtMoney(v)} className="mt-1 block text-[26px] font-bold" /><div className="mt-1 text-[11px] text-solidmuted">assets − debts</div></div>
              <div className="card p-4"><div className="text-[11.5px] text-muted">Monthly cash flow</div><CountUp value={M.savings + (phase >= 2 ? 3240 : 0)} duration={1400} format={(v) => fmtMoney(v, "EGP", { sign: true })} className="mt-1 block text-[20px] font-bold text-pos" /><div className="mt-1 text-[11px] text-muted">surplus / month</div></div>
              <div className="card p-4"><div className="text-[11.5px] text-muted">Savings</div><CountUp value={M.liquid} duration={1600} format={(v) => fmtMoney(v)} className="mt-1 block text-[18px] font-bold" /><div className="mt-1 text-[11px] text-muted">{M.coverage.toFixed(1)} months covered</div></div>
              <div className="card col-span-2 p-4 md:col-span-1"><div className="flex justify-between text-[11.5px] text-muted"><span>Goal · Buy a Home</span><span className="num">{phase >= 2 ? "58%" : "41%"}</span></div><ProgressPill className="mt-3" value={phase >= 2 ? 0.58 : 0.41} height={7} /><div className="mt-1.5 text-[11px] text-muted">estimated probability</div></div>
            </div>
            <div className="card mt-2.5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12.5px] font-bold">Possible futures · 10 years</span>
                <AnimatePresence>{phase >= 1 && <motion.span initial={{ opacity: 0, scale: 0.8, x: 10 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ type: "spring", stiffness: 400, damping: 26 }} className="inline-flex items-center gap-1.5 rounded-full bg-btn px-3 py-1 text-[11px] font-semibold text-btnfg"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Scenario: Save 15% More</motion.span>}</AnimatePresence>
              </div>
              {shown ? <motion.div key={phase >= 2 && scen ? "s" : "b"} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}><FanChart months={shown.months} bands={shown.bands} baseline={phase >= 2 ? base?.bands.p50 : undefined} height={150} compact showLegend={false} /></motion.div> : <div className="h-[150px]" />}
              {shown && <div className="mt-2 flex justify-between text-[11px] text-muted"><span>Today</span><span>Median <b className="num text-fg">{fmtMoney(shown.kpis.medianNetWorth, "EGP", { compact: true })}</b></span><span>Year 10</span></div>}
            </div>
          </div>
        </motion.div>
      </section>

      {/* WHAT */}
      <section id="product" className="mx-auto max-w-[1200px] px-5 py-16">
        <InView><div className="label mb-3">What is FinTwin?</div><h2 className="max-w-3xl text-[32px] font-bold leading-tight tracking-tight md:text-[40px]">A digital twin of your financial life — one you can safely experiment on.</h2></InView>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[{ i: <Layers className="h-5 w-5" />, t: "A living model", d: "Income, spending, accounts, assets, debts and goals — connected into one structure that updates as your life does." }, { i: <FlaskConical className="h-5 w-5" />, t: "A scenario laboratory", d: "Change one thing — a job, a home, a habit, the economy — and see how your future shifts." }, { i: <Sparkles className="h-5 w-5" />, t: "Grounded explanations", d: "AI that reads your model and explains results, showing exactly which data and assumptions it used." }].map((x, i) => (
            <InView key={x.t} delay={i * 0.08}><div className="card lift h-full p-6"><span className="mb-5 grid h-11 w-11 place-items-center rounded-full bg-accent text-accentfg">{x.i}</span><h3 className="text-[17px] font-bold">{x.t}</h3><p className="mt-2 text-[13.5px] leading-relaxed text-muted">{x.d}</p></div></InView>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-[1200px] px-5 py-16">
        <div className="grid gap-4 md:grid-cols-2">
          <InView><div className="card h-full p-8"><div className="label mb-4">Traditional finance tools</div><h3 className="text-[24px] font-bold tracking-tight">Show what happened.</h3><div className="mt-6 space-y-2">{["Last month's spending", "Account balances", "Category budgets"].map((x) => <div key={x} className="flex items-center gap-3 rounded-2xl bg-card2 px-4 py-3 text-[13px] text-muted"><TrendingDown className="h-4 w-4" strokeWidth={1.5} />{x}</div>)}</div></div></InView>
          <InView delay={0.1}><div className="card-solid h-full p-8"><div className="label mb-4 !text-solidmuted">FinTwin</div><h3 className="text-[24px] font-bold tracking-tight">Explores what could happen next.</h3><div className="mt-6 space-y-2">{["Range of possible futures", "Goal probability under each scenario", "Which assumptions matter most"].map((x) => <div key={x} className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-[13px]"><TrendingUp className="h-4 w-4 text-accent" strokeWidth={1.5} />{x}</div>)}</div></div></InView>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-[1200px] px-5 py-16">
        <InView><div className="label mb-3">How it works</div><h2 className="text-[32px] font-bold tracking-tight md:text-[40px]">Three steps from today to tomorrow.</h2></InView>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[{ n: "01", t: "Build your Twin", d: "A guided, ten-minute setup creates your starting model. Everything stays editable." }, { n: "02", t: "Change a scenario", d: "Pick from the library or describe a decision in plain language." }, { n: "03", t: "Simulate possible futures", d: "Run hundreds of futures and explore the full distribution — not a single guess." }].map((s, i) => (
            <InView key={s.n} delay={i * 0.1}><div className="card relative h-full overflow-hidden p-6"><span className="num text-[54px] font-extrabold leading-none text-accent">{s.n}</span><h3 className="mt-6 text-[18px] font-bold">{s.t}</h3><p className="mt-2 text-[13.5px] text-muted">{s.d}</p></div></InView>
          ))}
        </div>
      </section>

      {/* SCENARIOS */}
      <section id="scenarios" className="mx-auto max-w-[1200px] px-5 py-16">
        <InView><div className="label mb-3">Scenario gallery</div><h2 className="text-[32px] font-bold tracking-tight md:text-[40px]">Test a decision before you make it.</h2></InView>
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[{ t: "Lose My Job", i: <Briefcase />, d: "6 months without income" }, { t: "Get a Raise", i: <TrendingUp />, d: "+20% from month 3" }, { t: "Buy a Home", i: <Home />, d: "Down payment + mortgage" }, { t: "Increase Savings", i: <PiggyBank />, d: "Save 15% more" }, { t: "Start Freelancing", i: <Laptop />, d: "Variable income" }, { t: "Have a Child", i: <Baby />, d: "+EGP 6,000 / month" }, { t: "Recession", i: <TrendingDown />, d: "Weak growth, volatile returns" }, { t: "High Inflation", i: <Flame />, d: "Prices outpace income" }].map((s, i) => (
            <InView key={s.t} delay={(i % 4) * 0.06}><Link href="/demo" className="card lift group block h-full p-5"><span className="mb-6 grid h-10 w-10 place-items-center rounded-full bg-card2 transition-colors group-hover:bg-accent group-hover:text-accentfg [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.5]">{s.i}</span><div className="text-[15px] font-bold">{s.t}</div><div className="mt-1 text-[12px] text-muted">{s.d}</div></Link></InView>
          ))}
        </div>
      </section>

      {/* UNCERTAINTY */}
      <section className="mx-auto max-w-[1200px] px-5 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
          <InView><div className="label mb-3">Uncertainty, made visible</div><h2 className="text-[32px] font-bold leading-tight tracking-tight md:text-[40px]">The future is a distribution, not a line.</h2><p className="mt-4 text-[15px] leading-relaxed text-muted">Every simulation draws different returns, inflation and income growth. The hatched area shows where 90% of simulated futures land; the solid line is the median. FinTwin never pretends to know which future you&apos;ll get.</p></InView>
          <InView delay={0.1}><div className="card p-6">{base ? <FanChart months={base.months} bands={base.bands} height={260} /> : <div className="h-[290px]" />}</div></InView>
        </div>
      </section>

      {/* AI */}
      <section className="mx-auto max-w-[1200px] px-5 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
          <InView><div className="card space-y-4 p-6">
            <div className="ml-auto w-fit rounded-[22px] rounded-br-md bg-btn px-4 py-2.5 text-[13.5px] font-medium text-btnfg">What happens if I lose my income?</div>
            <div className="rounded-[22px] bg-card2 p-5">
              <div className="mb-2 flex items-center gap-2 text-[12.5px] font-bold"><span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-accentfg"><Sparkles className="h-3 w-3" /></span>FinTwin</div>
              <p className="text-[13.5px] leading-relaxed">With six months without income, your cash buffer of EGP 85,500 covers about <b>4.0 months</b> of current spending. The simulation estimates your 10-year median net worth falls by roughly <b>EGP 190K</b> versus your current plan, under the selected assumptions.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">{[["Runway", "4.0 mo"], ["Buffer survival", "38%"], ["Median Δ", "−190K"]].map(([l, v], i) => <div key={l} className={cx("rounded-xl p-2.5", i === 0 ? "bg-solid text-solidfg" : "bg-card")}><div className={cx("text-[10.5px]", i === 0 ? "text-solidmuted" : "text-muted")}>{l}</div><div className={cx("num text-[15px] font-bold", i === 0 && "text-accent")}>{v}</div></div>)}</div>
              <div className="mt-3 flex gap-2 text-[11.5px] font-semibold"><span className="rounded-full border border-line bg-card px-3 py-1">View model context</span><span className="rounded-full bg-btn px-3 py-1 text-btnfg">Stress test this</span></div>
            </div>
          </div></InView>
          <InView delay={0.1}><div className="label mb-3">AI explanation</div><h2 className="text-[32px] font-bold leading-tight tracking-tight md:text-[40px]">Answers that show their work.</h2><p className="mt-4 text-[15px] leading-relaxed text-muted">The AI reads your Twin, runs the relevant simulation, and explains the result in plain language — with the data, assumptions and percentiles one click away.</p></InView>
        </div>
      </section>

      {/* TRUST */}
      <section id="trust" className="mx-auto max-w-[1200px] px-5 py-16">
        <InView><div className="label mb-3">Trust & transparency</div><h2 className="max-w-3xl text-[32px] font-bold leading-tight tracking-tight md:text-[40px]">Every number traces back to its inputs.</h2></InView>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[{ i: <Database />, t: "Your data", d: "Current balances and cash flow are labeled as facts." }, { i: <Eye />, t: "Your assumptions", d: "Inflation, growth and returns are visible and editable." }, { i: <FlaskConical />, t: "Simulation outputs", d: "Percentiles and probabilities, never certainties." }, { i: <Lock />, t: "Privacy", d: "Your model is private to you. No selling, no ads." }].map((x, i) => (
            <InView key={x.t} delay={i * 0.06}><div className="card h-full p-5"><span className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-card2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.5]">{x.i}</span><div className="text-[15px] font-bold">{x.t}</div><p className="mt-1 text-[12.5px] text-muted">{x.d}</p></div></InView>
          ))}
        </div>
      </section>

      <FAQ />

      {/* FINAL CTA */}
      <section className="mx-auto max-w-[1200px] px-5 py-20">
        <InView><div className="card-solid relative overflow-hidden p-10 text-center md:p-16">
          <div className="hatch absolute inset-0 opacity-20" />
          <KenBurns scale={1.04} duration={6} className="relative"><h2 className="text-[34px] font-bold tracking-tight md:text-[48px]">Build Your Financial Twin</h2><p className="mx-auto mt-3 max-w-lg text-[15px] text-solidmuted">Understand your financial life today. Change one thing. Simulate what could happen next.</p></KenBurns>
          <div className="relative mt-8 flex justify-center gap-3"><Button size="lg" variant="accent" href={signedIn ? "/app" : "/signup"} icon={<ArrowRight className="h-4 w-4" />}>Get started</Button><Button size="lg" variant="secondary" href="/demo">Watch the demo</Button></div>
        </div></InView>
      </section>
      <footer className="border-t border-line py-10"><div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-4 px-5 text-[12px] text-muted md:flex-row"><Logo size={22} /><span>FinTwin is an educational modeling tool. It does not provide financial advice or predict the future.</span></div></footer>
    </div>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    ["Does FinTwin predict my future?", "No. It simulates many possible futures under assumptions you can see and change, and shows the range. Every output is an estimate, not a forecast."],
    ["Is this financial advice?", "No. FinTwin is an educational modeling tool. It helps you understand trade-offs; decisions remain yours."],
    ["What is a Monte Carlo simulation?", "A method that runs your plan hundreds or thousands of times, each with different random returns, inflation and income growth, then summarizes the results as percentiles."],
    ["Do I need to connect my bank?", "No. You can enter numbers manually, import a CSV, or start from the demo Twin."],
    ["How is my data protected?", "Your model is stored privately to your account. You can export or permanently delete everything at any time from Settings."],
  ];
  return (
    <section id="faq" className="mx-auto max-w-[860px] px-5 py-16">
      <InView><div className="label mb-3 text-center">FAQ</div><h2 className="mb-8 text-center text-[32px] font-bold tracking-tight">Questions, answered.</h2></InView>
      <div className="space-y-2">{items.map(([q, a], i) => (
        <div key={q} className="card !rounded-[20px]">
          <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between p-5 text-left text-[14.5px] font-bold">{q}<ChevronDown className={cx("h-4 w-4 transition-transform duration-300", open === i && "rotate-180")} strokeWidth={1.6} /></button>
          <Collapse open={open === i}><p className="px-5 pb-5 text-[13.5px] leading-relaxed text-muted">{a}</p></Collapse>
        </div>
      ))}</div>
    </section>
  );
}
