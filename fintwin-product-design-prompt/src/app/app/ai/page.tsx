"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Brain, ChevronDown, Database, Eraser, FlaskConical, Sparkles, Clock, SlidersHorizontal, Sigma } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, useStore } from "@/components/store";
import { useQuery } from "@/components/hooks";
import { LineChart, Tornado } from "@/components/charts";
import { Collapse, CountUp, ProgressPill } from "@/components/motion";
import { Badge, Button, Card, ErrorState, Skel, cx } from "@/components/ui";
import type { AIPayload } from "@/lib/ai";
import { fmtMoney, fmtPct } from "@/lib/model";

type Msg = { id: number | string; role: "user" | "assistant"; content: string; payload?: AIPayload | null; createdAt?: string };
const SUGGESTED = ["How long could my savings cover my expenses?", "What changed in my finances this month?", "What happens if I lose my income?", "Can I reach my home goal?", "What if I save 15% more?", "Which assumption affects my future the most?"];
const PIPE = ["Understanding your question", "Reading your Financial Twin", "Running the relevant simulation", "Preparing an explanation"];

export default function AIPage() {
  const { m, currency, goals, scenarios, user, refreshNotifications } = useStore();
  const query = useQuery();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false); const [pipe, setPipe] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);
  const aiOff = user.settings.aiEnabled === false;

  useEffect(() => { api<{ messages: Msg[] }>("/api/ai").then((r) => setMsgs(r.messages)).catch(() => setMsgs([])); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, pending]);
  useEffect(() => { const q = query?.get("q"); if (q && msgs && !asked.current) { asked.current = true; ask(q); } }, [query, msgs]); // eslint-disable-line react-hooks/exhaustive-deps

  const ask = async (q: string) => {
    if (!q.trim() || pending) return;
    setInput(""); setError(null); setPending(true); setPipe(0);
    setMsgs((s) => [...(s ?? []), { id: `u${Date.now()}`, role: "user", content: q }]);
    const timer = setInterval(() => setPipe((p) => Math.min(PIPE.length - 1, p + 1)), 450);
    try {
      const r = await api<{ user: Msg; assistant: Msg }>("/api/ai", "POST", { question: q });
      setMsgs((s) => [...(s ?? []).slice(0, -1), r.user, r.assistant]);
    } catch (e) { setError((e as Error).message); setMsgs((s) => (s ?? []).slice(0, -1)); setInput(q); }
    finally { clearInterval(timer); setPending(false); refreshNotifications(); }
  };
  const clear = async () => { await api("/api/ai", "DELETE"); setMsgs([]); };
  const home = goals.find((g) => /home/i.test(g.kind)) ?? goals[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex min-h-[calc(100vh-180px)] flex-col">
        <div className="mb-4 flex items-end justify-between">
          <div><div className="label mb-2">Intelligence</div><h1 className="text-[26px] font-bold tracking-tight md:text-[30px]">AI Financial Intelligence</h1><p className="mt-1 text-[13px] text-muted">Answers grounded in your Twin, goals and simulations — with every input visible.</p></div>
          {msgs && msgs.length > 0 && <Button size="sm" variant="ghost" icon={<Eraser className="h-3.5 w-3.5" />} onClick={clear}>Clear</Button>}
        </div>
        <div className="flex-1 space-y-5">
          {msgs === null && <div className="space-y-4"><Skel className="ml-auto h-10 w-2/3 !rounded-full" /><div className="card space-y-3 p-5"><Skel className="h-3 w-3/4" /><Skel className="h-3 w-1/2" /><div className="grid grid-cols-3 gap-2"><Skel className="h-16" /><Skel className="h-16" /><Skel className="h-16" /></div></div></div>}
          {msgs && msgs.length === 0 && !pending && (
            <Card className="!p-7">
              <div className="mb-1 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accentfg"><Sparkles className="h-4 w-4" /></span><span className="text-[16px] font-bold">Ask about your financial future</span></div>
              <p className="mb-5 text-[13px] text-muted">I read your Twin, run simulations when needed, and explain results in plain language. I don&apos;t give investment advice or predict the future.</p>
              <div className="flex flex-wrap gap-2">{SUGGESTED.map((q, i) => <motion.button key={q} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => ask(q)} className="press rounded-full border border-line bg-card px-3.5 py-2 text-[12.5px] font-semibold transition hover:bg-btn hover:text-btnfg">{q}</motion.button>)}</div>
            </Card>
          )}
          <AnimatePresence initial={false}>
            {msgs?.map((msg) => msg.role === "user" ? (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end"><div className="max-w-[80%] rounded-[22px] rounded-br-md bg-btn px-4 py-2.5 text-[13.5px] font-medium text-btnfg">{msg.content}</div></motion.div>
            ) : <Answer key={msg.id} msg={msg} currency={currency} onAsk={ask} />)}
          </AnimatePresence>
          {pending && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
              <div className="space-y-2">{PIPE.map((p, i) => <div key={p} className={cx("flex items-center gap-2.5 text-[12.5px] transition-opacity", i <= pipe ? "opacity-100" : "opacity-30")}><span className={cx("h-2 w-2 rounded-full", i < pipe ? "bg-fg" : i === pipe ? "animate-pulse bg-accent" : "bg-line2")} />{p}</div>)}</div>
              <div className="mt-4 grid grid-cols-3 gap-2"><Skel className="h-14" /><Skel className="h-14" /><Skel className="h-14" /></div>
            </motion.div>
          )}
          {error && <ErrorState title="AI analysis is temporarily unavailable." what={error} why="The analysis engine couldn't finish this request." next="Your question is back in the box — try sending it again." />}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="sticky bottom-24 mt-5 lg:bottom-4">
          <div className="flex items-center gap-2 rounded-full border border-line2 bg-canvas p-1.5 pl-5 shadow-lift focus-within:border-accent">
            <Brain className="h-4 w-4 text-muted" strokeWidth={1.5} />
            <input value={input} onChange={(e) => setInput(e.target.value)} disabled={aiOff} placeholder={aiOff ? "AI is turned off in Settings" : "Ask about your money, goals or a decision…"} className="h-10 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint" aria-label="Ask AI" />
            <button type="submit" disabled={!input.trim() || pending || aiOff} aria-label="Send" className="press grid h-10 w-10 place-items-center rounded-full bg-btn text-btnfg transition disabled:opacity-30"><ArrowUp className="h-4 w-4" strokeWidth={2} /></button>
          </div>
          {msgs && msgs.length > 0 && <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">{SUGGESTED.slice(0, 4).map((q) => <button type="button" key={q} onClick={() => ask(q)} className="shrink-0 rounded-full border border-line bg-card px-3 py-1 text-[11.5px] font-semibold text-muted hover:text-fg">{q}</button>)}</div>}
        </form>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        <div className="card-solid p-5">
          <div className="mb-4 flex items-center justify-between"><span className="text-[13px] font-bold">Financial context</span><Badge tone="ink">Live</Badge></div>
          <div className="text-[11.5px] text-solidmuted">Net worth</div>
          <CountUp value={m.netWorth} format={(v) => fmtMoney(v, currency)} className="text-[26px] font-bold" />
          <div className="mt-4 space-y-2.5 text-[12.5px]">
            {[["Income", fmtMoney(m.income, currency)], ["Expenses", fmtMoney(m.expenses, currency)], ["Savings", `${fmtMoney(m.savings, currency)} · ${fmtPct(m.savingsRate, 0)}`]].map(([l, v]) => <div key={l} className="flex justify-between"><span className="text-solidmuted">{l}</span><span className="num font-semibold">{v}</span></div>)}
          </div>
          <div className="mt-4"><div className="mb-1.5 flex justify-between text-[12px]"><span className="text-solidmuted">Emergency coverage</span><span className="num font-bold text-accent">{m.coverage.toFixed(1)} mo</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${Math.min(1, m.coverage / 6) * 100}%` }} transition={{ duration: 0.8 }} /></div></div>
        </div>
        {home && <Link href={`/app/goals/${home.id}`} className="card lift block p-4"><div className="text-[11.5px] text-muted">Current goal</div><div className="text-[14px] font-bold">{home.name}</div><ProgressPill className="mt-2" value={home.current / home.target} height={5} /><div className="num mt-1.5 text-[11.5px] text-muted">{fmtMoney(home.current, currency, { compact: true })} of {fmtMoney(home.target, currency, { compact: true })}{home.probability !== null && ` · ${fmtPct(home.probability, 0)} simulated`}</div></Link>}
        <div className="card p-4"><div className="text-[11.5px] text-muted">Active scenarios</div><div className="mt-1.5 flex flex-wrap gap-1.5">{scenarios.slice(0, 5).map((s) => <Link key={s.id} href={`/app/simulations?scenario=${s.id}`} className="rounded-full bg-card2 px-2.5 py-1 text-[11.5px] font-semibold hover:bg-accentsoft">{s.name}</Link>)}{scenarios.length === 0 && <span className="text-[12px] text-muted">None yet</span>}</div></div>
        <p className="px-2 text-[11px] leading-relaxed text-faint">FinTwin AI explains model outputs. It distinguishes your data, your assumptions and simulation results, and never states outcomes as certain.</p>
      </aside>
    </div>
  );
}

function Answer({ msg, currency, onAsk }: { msg: Msg; currency: string; onAsk: (q: string) => void }) {
  const [ctx, setCtx] = useState(false);
  const p = msg.payload;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card p-5">
      <div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-accentfg"><Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} /></span><span className="text-[12.5px] font-bold">FinTwin</span>{p && <Badge tone="neutral" dot={false}>{p.intent === "scenario" || p.intent === "goal" ? "Simulation" : p.intent === "sensitivity" ? "Sensitivity" : "Twin data"}</Badge>}</div>
      <p className="text-[14px] leading-relaxed">{msg.content}</p>
      {p && <>
        {p.kpis.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{p.kpis.map((k, i) => <motion.div key={k.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className={cx("rounded-2xl p-3", i === 0 ? "bg-solid text-solidfg" : "bg-card2")}><div className={cx("text-[11px]", i === 0 ? "text-solidmuted" : "text-muted")}>{k.label}</div><div className={cx("num mt-0.5 text-[17px] font-bold", i === 0 && "text-accent")}>{k.value}</div>{k.note && <div className={cx("text-[10.5px]", i === 0 ? "text-solidmuted" : "text-faint")}>{k.note}</div>}</motion.div>)}</div>}
        {p.chart && <div className="mt-4 rounded-2xl bg-card2 p-4"><div className="mb-2 text-[12px] font-semibold text-muted">{p.chart.label}</div><LineChart height={140} currency={currency} labels={p.chart.series.map((_, i) => (p.chart!.unit === "months" ? `M${i}` : i === 0 ? "Today" : `Y${i}`))} series={[{ label: "Scenario", data: p.chart.series, tone: "accent", fill: !p.chart.baseline }, ...(p.chart.baseline ? [{ label: "Current plan", data: p.chart.baseline, tone: "muted" as const, style: "dashed" as const }] : [])]} /></div>}
        {p.bars && p.bars.length > 0 && <div className="mt-4 rounded-2xl bg-card2 p-4"><Tornado items={p.bars.map((b) => ({ label: b.label, impact: p.intent === "sensitivity" ? b.value * 1000 : b.value }))} currency={currency} format={p.intent === "sensitivity" ? undefined : (v) => `${v > 0 ? "+" : ""}${v}%`} /></div>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setCtx((v) => !v)} icon={<ChevronDown className={cx("h-3.5 w-3.5 transition-transform", ctx && "rotate-180")} />}>View model context</Button>
          {p.actions.map((a) => <Button key={a.label} size="sm" href={a.href}>{a.label}</Button>)}
        </div>
        <Collapse open={ctx}>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {[{ i: <Database className="h-3.5 w-3.5" />, t: "Data used", d: p.context.data }, { i: <SlidersHorizontal className="h-3.5 w-3.5" />, t: "Assumptions", d: p.context.assumptions }, { i: <FlaskConical className="h-3.5 w-3.5" />, t: "Simulation", d: [p.context.simulation ?? "No simulation needed — direct calculation"] }, { i: <Sigma className="h-3.5 w-3.5" />, t: "Result", d: [p.context.result] }].map((x) => (
              <div key={x.t} className="rounded-2xl border border-line bg-card2 p-3"><div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold">{x.i}{x.t}</div><ul className="space-y-0.5 text-[11.5px] text-muted">{x.d.map((d) => <li key={d}>{d}</li>)}</ul></div>
            ))}
            <div className="flex items-center gap-1.5 text-[11px] text-faint md:col-span-2"><Clock className="h-3 w-3" />Generated {new Date(p.context.timestamp).toLocaleString("en-GB")}</div>
          </div>
        </Collapse>
        {p.followups.length > 0 && <div className="mt-4 border-t border-line pt-3"><div className="mb-2 text-[11.5px] font-semibold text-muted">Explore next</div><div className="flex flex-wrap gap-2">{p.followups.map((f) => <button key={f} onClick={() => onAsk(f)} className="rounded-full bg-card2 px-3 py-1.5 text-[12px] font-semibold hover:bg-accentsoft">{f}</button>)}</div></div>}
      </>}
    </motion.div>
  );
}
