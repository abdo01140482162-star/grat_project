import {
  type Account, type Assumptions, type Goal, type ScenarioChanges, type SimResult, type Twin,
  EXPENSE_KEYS, ESSENTIAL, PRESETS, effectiveAssumptions, emptyChanges, metrics, monthsBetween, SCENARIO_TEMPLATES,
} from "./model";

export type SimInput = {
  twin: Twin; accounts: Account[]; changes: ScenarioChanges; horizonYears: number; paths: number;
  goal?: Goal | null; seed?: number; assumptions?: Assumptions; extraSavings?: number;
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(r: () => number) {
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

type Ctx = ReturnType<typeof prepare>;

function prepare(input: SimInput) {
  const { twin, accounts, changes } = input;
  const base = input.assumptions ?? effectiveAssumptions(twin);
  const a: Assumptions = { ...base, ...changes.econ, horizonYears: input.horizonYears };
  const m = metrics(twin, accounts);
  const months = input.horizonYears * 12;
  const categoryExp = EXPENSE_KEYS.reduce((s, k) => s + (twin.expenses[k] || 0), 0);
  const essentialCat = ESSENTIAL.reduce((s, k) => s + (twin.expenses[k] || 0), 0);
  const flexibleCat = categoryExp - essentialCat;
  // deterministic debt schedule
  const debtPay = new Float64Array(months + 1);
  const debtBal = new Float64Array(months + 1);
  const loans = twin.liabilities.map((l) => ({ bal: l.balance, pay: l.payment, rate: l.rate / 100 / 12, start: 0 }));
  if (changes.newDebtAmount > 0) loans.push({ bal: changes.newDebtAmount, pay: changes.newDebtPayment, rate: 0, start: changes.oneTimeMonth });
  // fixed rate for new debt derived from payment & months
  const ccDebt = m.creditCards;
  for (const L of loans) {
    let bal = L.bal;
    for (let t = 0; t <= months; t++) {
      if (t < L.start) continue;
      if (t > L.start && bal > 0) {
        const interest = bal * L.rate;
        const p = Math.min(L.pay, bal + interest);
        bal = bal + interest - p;
        debtPay[t] += p;
      }
      debtBal[t] += Math.max(0, bal);
    }
  }
  const goalMonth = input.goal ? Math.min(months, Math.max(1, monthsBetween(new Date(), new Date(input.goal.targetDate)))) : -1;
  const step = input.horizonYears <= 10 ? 1 : 3;
  const samples: number[] = [];
  for (let t = 0; t <= months; t += step) samples.push(t);
  const invest0 = m.investments;
  return { input, a, m, months, categoryExp, essentialCat, flexibleCat, debtPay, debtBal, ccDebt, goalMonth, samples, invest0, otherAssets0: m.otherAssets };
}

function applies(c: ScenarioChanges, t: number) {
  return t >= c.incomeStartMonth && (c.incomeDurationMonths === 0 || t < c.incomeStartMonth + c.incomeDurationMonths);
}

function runPath(ctx: Ctx, r: (() => number) | null, out: Float64Array | null) {
  const { a, m, months, input, debtPay, debtBal } = ctx;
  const c = input.changes;
  let cash = m.liquid, inv = ctx.invest0, other = ctx.otherAssets0, extraDebt = ctx.ccDebt;
  let incF = 1, expF = 1, depleted = false, shortfall = 0, negMonths = 0, goalHit: boolean | null = null;
  let annualInfl = a.inflation, annualInc = a.incomeGrowth;
  const vol = a.volatility / 100 / Math.sqrt(12);
  const mu = a.investReturn / 100 / 12;
  const boost = Math.min((c.savingsBoostPct / 100) * m.income, ctx.categoryExp * 0.5);
  let si = 0;
  for (let t = 0; t <= months; t++) {
    if (t > 0) {
      if ((t - 1) % 12 === 0) {
        annualInfl = a.inflation + (r ? normal(r) * Math.max(1.5, a.inflation * 0.2) : 0);
        annualInc = a.incomeGrowth + (r ? normal(r) * 3 : 0);
      }
      incF *= Math.pow(1 + annualInc / 100, 1 / 12);
      expF *= Math.pow(1 + ((a.expenseGrowth + (annualInfl - a.inflation)) / 100), 1 / 12);
      const inShock = applies(c, t);
      const income = m.income * incF * (inShock ? 1 + c.incomeChangePct / 100 : 1);
      const afterStart = t >= c.incomeStartMonth;
      let exp = ctx.categoryExp * (afterStart ? 1 + c.expenseChangePct / 100 : 1) + (afterStart ? c.expenseChangeAmount : 0);
      exp = exp * expF - boost * expF - (input.extraSavings ?? 0);
      exp = Math.max(exp, ctx.essentialCat * 0.6 * expF) + debtPay[t];
      let surplus = income - exp;
      if (c.oneTimeCost > 0 && t === Math.max(1, c.oneTimeMonth)) surplus -= c.oneTimeCost;
      if (c.assetPurchase > 0 && t === Math.max(1, c.oneTimeMonth)) other += c.assetPurchase;
      if (surplus < 0) negMonths++;
      // returns
      const ret = mu + (r ? normal(r) * vol : 0);
      inv *= 1 + ret;
      cash *= 1 + (a.investReturn * 0.45) / 100 / 12;
      other *= 1 + (a.inflation - 4) / 100 / 12;
      if (extraDebt > 0) extraDebt *= 1 + 0.28 / 12;
      if (surplus >= 0) {
        if (extraDebt > 0) { const p = Math.min(extraDebt, surplus * 0.5); extraDebt -= p; surplus -= p; }
        const target = 6 * (ctx.essentialCat * expF + debtPay[t]);
        if (cash < target) { cash += surplus * 0.6; inv += surplus * 0.4; } else inv += surplus;
      } else {
        let d = -surplus;
        const fromCash = Math.min(Math.max(cash, 0), d); cash -= fromCash; d -= fromCash;
        if (d > 0) { depleted = true; const fromInv = Math.min(Math.max(inv, 0), d); inv -= fromInv; d -= fromInv; }
        if (d > 0) { shortfall += d; extraDebt += d; }
      }
      if (cash <= 1) depleted = true;
      if (t === ctx.goalMonth && input.goal) goalHit = cash + inv >= input.goal.target;
    }
    if (out && si < ctx.samples.length && ctx.samples[si] === t) {
      out[si++] = cash + inv + other - debtBal[t] - extraDebt;
    }
  }
  const final = cash + inv + other - debtBal[months] - extraDebt;
  return { final, depleted, shortfall, negMonths, goalHit };
}

function pct(sorted: Float64Array | number[], p: number) {
  if (sorted.length === 0) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

export function deterministicFinal(input: SimInput) {
  const ctx = prepare(input);
  return runPath(ctx, null, null).final;
}

function drivers(input: SimInput) {
  const base = deterministicFinal(input);
  const a = { ...(input.assumptions ?? effectiveAssumptions(input.twin)), ...input.changes.econ };
  const vary = (label: string, patch: Partial<Assumptions>, twinPatch?: (t: Twin) => Twin) => {
    const t2 = twinPatch ? twinPatch(input.twin) : input.twin;
    const v = deterministicFinal({ ...input, twin: t2, assumptions: { ...a, ...patch }, changes: { ...input.changes, econ: {} } });
    return { label, impact: v - base };
  };
  return [
    vary("Income −10%", {}, (t) => ({ ...t, income: { ...t.income, monthly: t.income.monthly * 0.9, additional: t.income.additional * 0.9 } })),
    vary("Expenses +10%", {}, (t) => ({ ...t, expenses: Object.fromEntries(Object.entries(t.expenses).map(([k, v]) => [k, v * 1.1])) as Twin["expenses"] })),
    vary("Inflation +5 pts", { inflation: a.inflation + 5, expenseGrowth: a.expenseGrowth + 5 }),
    vary("Returns −3 pts", { investReturn: a.investReturn - 3 }),
    vary("Income growth −3 pts", { incomeGrowth: a.incomeGrowth - 3 }),
  ].sort((x, y) => Math.abs(y.impact) - Math.abs(x.impact));
}

export async function runSimulationAsync(input: SimInput, onProgress?: (done: number) => void, chunk = 100, delay = 0): Promise<SimResult> {
  const ctx = prepare(input);
  const r = rng(input.seed ?? 42);
  const S = ctx.samples.length;
  const N = input.paths;
  const grid = new Float64Array(N * S);
  const finals = new Float64Array(N);
  let depleted = 0, shortfallCount = 0, goalHits = 0, negMonths = 0;
  const shortfalls: number[] = [];
  for (let p = 0; p < N; p++) {
    const row = grid.subarray(p * S, (p + 1) * S);
    const res = runPath(ctx, r, row);
    finals[p] = res.final;
    if (res.depleted) depleted++;
    if (res.shortfall > 0) { shortfallCount++; shortfalls.push(res.shortfall); }
    if (res.goalHit) goalHits++;
    negMonths += res.negMonths;
    if (onProgress && (p + 1) % chunk === 0) { onProgress(p + 1); await new Promise((res2) => setTimeout(res2, delay)); }
  }
  onProgress?.(N);
  const bands = { p5: [] as number[], p15: [] as number[], p25: [] as number[], p50: [] as number[], p75: [] as number[], p85: [] as number[], p95: [] as number[], mean: [] as number[] };
  const col = new Float64Array(N);
  for (let s = 0; s < S; s++) {
    let sum = 0;
    for (let p = 0; p < N; p++) { col[p] = grid[p * S + s]; sum += col[p]; }
    col.sort();
    bands.p5.push(pct(col, 0.05)); bands.p15.push(pct(col, 0.15)); bands.p25.push(pct(col, 0.25)); bands.p50.push(pct(col, 0.5));
    bands.p75.push(pct(col, 0.75)); bands.p85.push(pct(col, 0.85)); bands.p95.push(pct(col, 0.95)); bands.mean.push(sum / N);
  }
  // baseline (no scenario) median path, deterministic seed, fewer paths
  const baseCtx = prepare({ ...input, changes: emptyChanges(), extraSavings: 0 });
  const br = rng(input.seed ?? 42);
  const BN = Math.min(200, N);
  const bgrid = new Float64Array(BN * S);
  for (let p = 0; p < BN; p++) runPath(baseCtx, br, bgrid.subarray(p * S, (p + 1) * S));
  const baselineMedian: number[] = [];
  const bcol = new Float64Array(BN);
  for (let s = 0; s < S; s++) { for (let p = 0; p < BN; p++) bcol[p] = bgrid[p * S + s]; bcol.sort(); baselineMedian.push(pct(bcol, 0.5)); }

  const sortedFinals = Float64Array.from(finals).sort();
  const lo = pct(sortedFinals, 0.01), hi = pct(sortedFinals, 0.99);
  const bins = 24, w = (hi - lo) / bins || 1;
  const histogram = Array.from({ length: bins }, (_, i) => ({ x0: lo + i * w, x1: lo + (i + 1) * w, count: 0 }));
  for (const f of finals) { const i = Math.min(bins - 1, Math.max(0, Math.floor((f - lo) / w))); histogram[i].count++; }
  const percentiles: Record<string, number> = {};
  for (const p of [5, 15, 25, 50, 75, 85, 95]) percentiles[String(p)] = pct(sortedFinals, p / 100);
  shortfalls.sort((x, y) => x - y);

  // scenario monthly cash flow at start of change
  const c = input.changes;
  const t0 = Math.max(1, c.incomeStartMonth);
  const m = ctx.m;
  const inc = m.income * (applies(c, t0) ? 1 + c.incomeChangePct / 100 : 1);
  const boost = Math.min((c.savingsBoostPct / 100) * m.income, ctx.categoryExp * 0.5);
  const exp = Math.max(ctx.categoryExp * (1 + c.expenseChangePct / 100) + c.expenseChangeAmount - boost - (input.extraSavings ?? 0), ctx.essentialCat * 0.6) + ctx.debtPay[t0];
  const monthlyCashFlow = inc - exp;
  const runwayMonths = monthlyCashFlow >= 0 ? 999 : m.liquid / -monthlyCashFlow;
  const goalProbability = input.goal ? goalHits / N : null;
  const emergencySurvival = 1 - depleted / N;
  return {
    months: ctx.samples, bands, baselineMedian, percentiles, histogram,
    kpis: {
      expectedNetWorth: bands.mean[S - 1], medianNetWorth: bands.p50[S - 1], goalProbability, emergencySurvival,
      shortfallProbability: shortfallCount / N, medianShortfall: shortfalls.length ? pct(shortfalls, 0.5) : 0,
      monthlyCashFlow, baselineMedian: baselineMedian[S - 1], runwayMonths,
    },
    risk: { cashFlowStress: negMonths / (N * ctx.months), goalRisk: goalProbability === null ? null : 1 - goalProbability, emergencyRisk: 1 - emergencySurvival, drivers: drivers(input) },
    assumptions: ctx.a, changes: input.changes,
    goal: input.goal ? { name: input.goal.name, target: input.goal.target, date: input.goal.targetDate } : null,
  };
}

// ---------- natural language scenario parsing (transparent, rule-based) ----------
const WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, eighteen: 18, twenty: 20 };
function num(s: string) { return WORDS[s.toLowerCase()] ?? parseFloat(s.replace(/,/g, "")); }
function money(text: string): number | null {
  const m = text.match(/(?:egp|usd|\$|eur|£)?\s?(\d[\d,]*(?:\.\d+)?)\s?(k|m|million|thousand)?\b/i);
  if (!m) return null;
  let v = parseFloat(m[1].replace(/,/g, ""));
  const u = (m[2] || "").toLowerCase();
  if (u === "k" || u === "thousand") v *= 1000;
  if (u === "m" || u === "million") v *= 1_000_000;
  return v;
}

export function parseScenarioText(text: string) {
  const t = text.toLowerCase();
  const c = emptyChanges();
  const found: string[] = [];
  let name = "Custom scenario", category = "Custom";
  const dur = t.match(/(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|eighteen)\s+(month|year)s?/);
  const durationMonths = dur ? num(dur[1]) * (dur[2] === "year" ? 12 : 1) : null;
  const startM = t.match(/in\s+(\d+|one|two|three|four|five|six|twelve)\s+(month|year)s?/);
  const start = startM ? num(startM[1]) * (startM[2] === "year" ? 12 : 1) : t.includes("next year") ? 12 : 1;
  const pctM = t.match(/(\d+(?:\.\d+)?)\s?%/);
  const pctV = pctM ? parseFloat(pctM[1]) : null;
  const apply = (n: string) => { const tpl = SCENARIO_TEMPLATES.find((x) => x.name === n); if (tpl) { Object.assign(c, tpl.changes); name = tpl.name; category = tpl.category; } };

  if (/(lose|lost|losing) (my )?(job|income)|laid off|unemploy|no income/.test(t)) {
    name = "Lose My Job"; category = "Career";
    c.incomeChangePct = t.includes("half") ? -50 : -100; c.incomeStartMonth = start; c.incomeDurationMonths = startM ? (durationMonths && durationMonths !== start ? durationMonths : 6) : durationMonths ?? 6;
    found.push(`Income changes by ${c.incomeChangePct}%`, `Starts in month ${c.incomeStartMonth}`, `Lasts ${c.incomeDurationMonths} months`);
  }
  if (/raise|promotion|salary increase/.test(t)) {
    name = "Get a Raise"; category = "Career"; c.incomeChangePct = pctV ?? 15; c.incomeStartMonth = start; found.push(`Income rises ${c.incomeChangePct}%`, `Starts in month ${start}`);
  }
  if (/freelanc/.test(t)) { apply("Start Freelancing"); found.push("Income dips 15% in year one", "Volatility raised to 22%"); }
  if (/(buy|purchase).*(home|house|apartment|flat)/.test(t)) {
    apply("Buy a Home");
    const price = money(t.replace(/\d+\s*(month|year)s?/g, "")) ?? 1500000;
    if (price > 10000) { c.assetPurchase = price; c.oneTimeCost = Math.round(price * 0.3); c.newDebtAmount = price - c.oneTimeCost; c.newDebtPayment = Math.round((c.newDebtAmount / 180) * 2.07); c.newDebtMonths = 180; }
    if (startM) c.oneTimeMonth = start;
    found.push(`Property value ${Math.round(c.assetPurchase).toLocaleString()}`, `Down payment ${Math.round(c.oneTimeCost).toLocaleString()} in month ${c.oneTimeMonth}`, `Mortgage payment ${c.newDebtPayment.toLocaleString()}/mo for ${c.newDebtMonths} months`);
  }
  if (/(buy|purchase).*car/.test(t)) { apply("Buy a Car"); if (startM) c.oneTimeMonth = start; found.push(`Car purchase in month ${c.oneTimeMonth}`, `Loan payment ${c.newDebtPayment.toLocaleString()}/mo`); }
  if (/save\s+(\d+)%?\s*more|save more/.test(t)) { name = "Save More"; category = "Savings"; c.savingsBoostPct = pctV ?? 10; found.push(`Redirect ${c.savingsBoostPct}% of income to savings`); }
  if (/(cut|reduce|lower).*(expense|spending)|spend\s+(\d+%\s+)?less/.test(t)) { name = "Spend Less"; category = "Savings"; c.expenseChangePct = -(pctV ?? 10); found.push(`Expenses change by ${c.expenseChangePct}%`); }
  if (/child|baby/.test(t)) { apply("Have a Child"); found.push("Monthly costs +6,000"); }
  if (/married|wedding/.test(t)) { apply("Get Married"); found.push("Wedding cost 200,000 in month 12", "Household expenses +25%"); }
  if (/inflation/.test(t)) {
    if (category === "Custom") { name = "High Inflation"; category = "Economic"; }
    c.econ = { ...c.econ, inflation: pctV ?? PRESETS.highInflation.a.inflation, expenseGrowth: (pctV ?? PRESETS.highInflation.a.inflation) - 2 };
    found.push(`Inflation set to ${c.econ.inflation}%`);
  }
  if (/recession/.test(t)) { if (category === "Custom") { name = "Recession"; category = "Economic"; } c.econ = { ...c.econ, ...PRESETS.recession.a }; found.push("Recession economic preset"); }
  if (/keep (my )?(current )?expenses|expenses (stay|remain)/.test(t)) found.push("Expenses stay at current level");
  return { name, category, changes: c, found };
}
