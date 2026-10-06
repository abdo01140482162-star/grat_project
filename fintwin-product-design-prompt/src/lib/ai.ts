import { type Account, type Goal, type Transaction, type Twin, emptyChanges, effectiveAssumptions, fmtMoney, fmtPct, metrics, SCENARIO_TEMPLATES, monthsBetween } from "./model";
import { parseScenarioText, runSimulationAsync } from "./sim";

export type AIPayload = {
  intent: string;
  text: string;
  kpis: { label: string; value: string; note?: string }[];
  chart?: { label: string; series: number[]; baseline?: number[]; unit?: string };
  bars?: { label: string; value: number }[];
  context: { data: string[]; assumptions: string[]; simulation: string | null; result: string; timestamp: string };
  actions: { label: string; href: string }[];
  followups: string[];
};

type Input = { question: string; twin: Twin; accounts: Account[]; goals: Goal[]; transactions: Transaction[] };

export async function analyze({ question, twin, accounts, goals, transactions }: Input): Promise<AIPayload> {
  const q = question.toLowerCase();
  const cur = twin.profile.currency || "EGP";
  const m = metrics(twin, accounts);
  const a = effectiveAssumptions(twin);
  const money = (v: number) => fmtMoney(v, cur);
  const assumptionList = [`Inflation ${a.inflation}%`, `Income growth ${a.incomeGrowth}%`, `Expense growth ${a.expenseGrowth}%`, `Return ${a.investReturn}% ± ${a.volatility}%`];
  const baseData = [`Monthly income ${money(m.income)}`, `Monthly expenses ${money(m.expenses)}`, `Liquid savings ${money(m.liquid)} across ${accounts.length} accounts`];
  const ts = new Date().toISOString();
  const homeGoal = goals.find((g) => /home|house|apartment/i.test(g.name + g.kind)) ?? goals[0];
  const sim = async (name: string, changes = emptyChanges(), goal?: Goal | null, paths = 400) =>
    runSimulationAsync({ twin, accounts, changes, horizonYears: Math.min(a.horizonYears, 10), paths, goal: goal ?? null, seed: 7 });
  const yearly = (arr: number[], months: number[]) => arr.filter((_, i) => months[i] % 12 === 0);

  // 1 — coverage
  if (/cover|runway|emergency|how long/.test(q) && !/lose|job/.test(q)) {
    const totalRunway = m.expenses > 0 ? m.liquid / m.expenses : 0;
    const series = Array.from({ length: 13 }, (_, i) => Math.max(0, m.liquid - m.essential * i));
    return {
      intent: "coverage",
      text: `Your liquid savings of ${money(m.liquid)} would cover approximately ${m.coverage.toFixed(1)} months of essential expenses under the current model, or ${totalRunway.toFixed(1)} months if all spending continued unchanged.`,
      kpis: [
        { label: "Essential coverage", value: `${m.coverage.toFixed(1)} mo`, note: "Liquid ÷ essential spending" },
        { label: "Full-spend runway", value: `${totalRunway.toFixed(1)} mo` },
        { label: "Essential / month", value: money(m.essential) },
      ],
      chart: { label: "Liquid savings if income stopped (essentials only)", series, unit: "months" },
      context: { data: [...baseData, `Essential spending ${money(m.essential)} incl. debt payments ${money(m.debtPayments)}`], assumptions: ["No income during the period", "Flexible spending paused", "No investment withdrawals"], simulation: null, result: `${m.coverage.toFixed(2)} = ${Math.round(m.liquid)} ÷ ${Math.round(m.essential)}`, timestamp: ts },
      actions: [{ label: "Stress test this", href: "/app/scenarios?template=Lose%20My%20Job" }, { label: "Open Financial Twin", href: "/app/twin" }],
      followups: ["What happens if I lose my income?", "What if I save 15% more?"],
    };
  }
  // 2 — monthly change
  if (/changed|this month|spending change|last month/.test(q)) {
    const now = new Date();
    const key = (d: string) => d.slice(0, 7);
    const thisKey = now.toISOString().slice(0, 7);
    const day = now.getDate();
    const byMonth = new Map<string, Map<string, number>>();
    for (const t of transactions) {
      if (t.kind !== "expense" || Number(t.date.slice(8, 10)) > day) continue; // same day-range in every month
      const mk = key(t.date);
      if (!byMonth.has(mk)) byMonth.set(mk, new Map());
      const mm = byMonth.get(mk)!;
      mm.set(t.category, (mm.get(t.category) ?? 0) - t.amount);
    }
    const prevKeys = [...byMonth.keys()].filter((k) => k < thisKey).sort().slice(-3);
    const cats = new Set<string>();
    byMonth.forEach((mm) => mm.forEach((_, c) => cats.add(c)));
    const changes = [...cats].map((c) => {
      const avg = prevKeys.length ? prevKeys.reduce((s, k) => s + (byMonth.get(k)?.get(c) ?? 0), 0) / prevKeys.length : 0;
      const sofar = byMonth.get(thisKey)?.get(c) ?? 0;
      return { c, avg, sofar, delta: avg > 0 ? (sofar - avg) / avg : 0 };
    }).filter((x) => x.avg > 0 && Math.abs(x.delta) > 0.01).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
    const top = changes.slice(0, 3);
    const totalNow = [...(byMonth.get(thisKey)?.values() ?? [])].reduce((s, v) => s + v, 0);
    return {
      intent: "monthChange",
      text: transactions.length === 0 ? "There are no transactions yet, so I can't compare months. Add or import transactions to unlock this view." :
        `So far this month you've spent ${money(totalNow)}. Compared with your ${prevKeys.length}-month average at the same point in the month, ${top.map((t) => `${t.c} is ${t.delta >= 0 ? "up" : "down"} ${Math.abs(t.delta * 100).toFixed(0)}%`).join(", ") || "spending is close to normal"}.`,
      kpis: [{ label: "Spent this month", value: money(totalNow) }, ...top.slice(0, 2).map((t) => ({ label: t.c, value: fmtPct(t.delta, 0, true), note: `vs ${money(t.avg)} avg by day ${day}` }))],
      bars: top.map((t) => ({ label: t.c, value: Math.round(t.delta * 100) })),
      context: { data: [`${transactions.length} transactions`, `Months compared: ${prevKeys.join(", ") || "none"}`], assumptions: [`Compares days 1–${day} of this month with days 1–${day} of previous months`], simulation: null, result: `${changes.length} categories compared`, timestamp: ts },
      actions: [{ label: "Review transactions", href: "/app/transactions" }, { label: "Open spending analytics", href: "/app/analytics?tab=spending" }],
      followups: ["How long could my savings cover my expenses?", "What if I save 15% more?"],
    };
  }
  // 3 — sensitivity
  if (/assumption|matter|sensitiv|affect/.test(q)) {
    const r = await sim("Current plan", emptyChanges(), null, 200);
    const d = r.risk.drivers;
    return {
      intent: "sensitivity",
      text: `Under the current model, ${d[0].label.toLowerCase()} moves your estimated ${a.horizonYears > 10 ? 10 : a.horizonYears}-year net worth the most (${fmtMoney(d[0].impact, cur, { compact: true, sign: true })}), followed by ${d[1].label.toLowerCase()}. These are model sensitivities, not predictions.`,
      kpis: d.slice(0, 3).map((x) => ({ label: x.label, value: fmtMoney(x.impact, cur, { compact: true, sign: true }) })),
      bars: d.map((x) => ({ label: x.label, value: Math.round(x.impact / 1000) })),
      context: { data: baseData, assumptions: assumptionList, simulation: "Deterministic sensitivity runs, one variable at a time", result: `Baseline median ${fmtMoney(r.kpis.medianNetWorth, cur, { compact: true })}`, timestamp: ts },
      actions: [{ label: "Open sensitivity analysis", href: "/app/simulations?tab=sensitivity" }, { label: "Edit assumptions", href: "/app/economy" }],
      followups: ["What happens in high inflation?", "Can I reach my home goal?"],
    };
  }
  // 4 — scenarios (job loss, save more, explicit) and goals
  let name = "Current plan", changes = emptyChanges();
  const parsed = parseScenarioText(question);
  const isGoal = /reach|goal|afford|on track/.test(q);
  if (/lose|job|income stop|laid off/.test(q)) { const t = SCENARIO_TEMPLATES.find((x) => x.name === "Lose My Job")!; name = t.name; changes = { ...emptyChanges(), ...t.changes, ...(parsed.found.length ? parsed.changes : {}) }; }
  else if (parsed.found.length) { name = parsed.name; changes = parsed.changes; }
  if (name !== "Current plan" || isGoal) {
    const goal = isGoal || /save|home|house/.test(q) ? homeGoal : homeGoal;
    const [base, r] = await Promise.all([sim("Current plan", emptyChanges(), goal), name === "Current plan" ? Promise.resolve(null) : sim(name, changes, goal)]);
    const res = r ?? base;
    const k = res.kpis;
    const monthsLeft = goal ? Math.max(1, monthsBetween(new Date(), new Date(goal.targetDate))) : 0;
    const required = goal ? Math.max(0, (goal.target - goal.current) / monthsLeft) : 0;
    const yrs = res.months[res.months.length - 1] / 12;
    let text: string;
    if (name === "Current plan" && goal) {
      text = `Under the selected simulation assumptions, your estimated probability of reaching "${goal.name}" (${money(goal.target)} by ${new Date(goal.targetDate).getFullYear()}) is ${fmtPct(k.goalProbability ?? 0, 0)}. Without investment growth, it would take about ${money(required)} per month.`;
    } else {
      const diff = k.medianNetWorth - base.kpis.medianNetWorth;
      text = `With "${name}", the simulation estimates a median ${yrs}-year net worth of ${fmtMoney(k.medianNetWorth, cur, { compact: true })} — ${fmtMoney(diff, cur, { compact: true, sign: true })} versus your current plan.` +
        (k.emergencySurvival < 0.999 ? ` Your cash buffer stays intact in ${fmtPct(k.emergencySurvival, 0)} of simulated futures.` : " Your cash buffer stays intact in nearly all simulated futures.") +
        (goal && k.goalProbability != null ? ` Goal probability for ${goal.name} moves from ${fmtPct(base.kpis.goalProbability ?? 0, 0)} to ${fmtPct(k.goalProbability, 0)}.` : "");
    }
    return {
      intent: name === "Current plan" ? "goal" : "scenario",
      text,
      kpis: [
        { label: "Median net worth", value: fmtMoney(k.medianNetWorth, cur, { compact: true }), note: `${yrs}-year horizon` },
        ...(k.goalProbability != null ? [{ label: "Goal probability", value: fmtPct(k.goalProbability, 0), note: goal?.name }] : []),
        { label: "Cash buffer survival", value: fmtPct(k.emergencySurvival, 0) },
        ...(name !== "Current plan" && k.runwayMonths < 999 ? [{ label: "Runway", value: `${k.runwayMonths.toFixed(1)} mo` }] : []),
      ],
      chart: { label: name === "Current plan" ? "Median net worth (yearly)" : `${name} vs current plan (median)`, series: yearly(res.bands.p50, res.months), baseline: name === "Current plan" ? undefined : yearly(base.bands.p50, base.months), unit: "years" },
      context: {
        data: [...baseData, ...(goal ? [`Goal ${goal.name}: ${money(goal.current)} of ${money(goal.target)}`] : [])],
        assumptions: [...assumptionList, ...parsed.found],
        simulation: `Monte Carlo · ${400} paths · ${yrs} years · seed 7`,
        result: `p50 ${fmtMoney(k.medianNetWorth, cur, { compact: true })} · p5 ${fmtMoney(res.percentiles["5"], cur, { compact: true })} · p95 ${fmtMoney(res.percentiles["95"], cur, { compact: true })}`,
        timestamp: ts,
      },
      actions: [
        { label: "Open in Simulation Lab", href: `/app/simulations?template=${encodeURIComponent(name === "Current plan" ? "Save 15% More" : name)}` },
        ...(goal ? [{ label: "Open goal", href: `/app/goals/${goal.id}` }] : []),
      ],
      followups: name === "Lose My Job" ? ["How long could my savings cover my expenses?", "What if I save 15% more?"] : ["Which assumption affects my future the most?", "What happens if I lose my income?"],
    };
  }
  // fallback — snapshot
  return {
    intent: "snapshot",
    text: `Here's where your Twin stands: net worth of ${money(m.netWorth)}, a monthly surplus of ${money(m.savings)} (${fmtPct(m.savingsRate, 0)} of income), and ${m.coverage.toFixed(1)} months of essential coverage. Ask about a decision — like losing income, buying a home, or saving more — and I'll simulate it.`,
    kpis: [{ label: "Net worth", value: money(m.netWorth) }, { label: "Savings rate", value: fmtPct(m.savingsRate, 0) }, { label: "Coverage", value: `${m.coverage.toFixed(1)} mo` }],
    context: { data: baseData, assumptions: assumptionList, simulation: null, result: "Current-state snapshot", timestamp: ts },
    actions: [{ label: "Open Financial Twin", href: "/app/twin" }],
    followups: ["What happens if I lose my income?", "Can I reach my home goal?", "Which assumption affects my future the most?"],
  };
}
