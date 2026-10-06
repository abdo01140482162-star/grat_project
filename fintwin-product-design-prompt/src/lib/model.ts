// Shared, pure financial model used on client and server.

export type Currency = "EGP" | "USD" | "EUR" | "GBP" | "SAR" | "AED" | string;

export const EXPENSE_KEYS = [
  "housing", "food", "transportation", "utilities", "healthcare", "education", "debt", "family",
  "entertainment", "shopping", "travel", "subscriptions", "other",
] as const;
export type ExpenseKey = (typeof EXPENSE_KEYS)[number];
export const ESSENTIAL: ExpenseKey[] = ["housing", "food", "transportation", "utilities", "healthcare", "education", "debt", "family"];
export const EXPENSE_LABELS: Record<ExpenseKey, string> = {
  housing: "Housing", food: "Food", transportation: "Transportation", utilities: "Utilities", healthcare: "Healthcare",
  education: "Education", debt: "Other debt", family: "Family support", entertainment: "Entertainment", shopping: "Shopping",
  travel: "Travel", subscriptions: "Subscriptions", other: "Other",
};

export type Assumptions = {
  inflation: number; // % per year
  incomeGrowth: number;
  expenseGrowth: number;
  investReturn: number;
  volatility: number;
  horizonYears: number;
};

export type Asset = { id: string; name: string; type: string; value: number };
export type Liability = { id: string; name: string; type: string; balance: number; payment: number; rate: number; months: number };

export type Twin = {
  profile: { name: string; age: number; country: string; city: string; currency: Currency };
  employment: string;
  income: { monthly: number; additional: number; frequency: string; growth: number; unsure: boolean };
  expenses: Record<ExpenseKey, number>;
  savings: { cash: number; emergency: number; monthly: number; otherLiquid: number };
  assets: Asset[];
  liabilities: Liability[];
  preference: "cautious" | "balanced" | "growth" | "wide";
  assumptions: Assumptions;
  economicPreset: string;
};

export type Account = { id: number; name: string; type: string; balance: number; currency: string; updatedAt: string; createdAt: string };
export type Transaction = { id: number; accountId: number | null; description: string; category: string; kind: string; amount: number; date: string; createdAt: string };
export type Goal = { id: number; name: string; kind: string; target: number; current: number; monthly: number; targetDate: string; probability: number | null; accountId: number | null; createdAt: string };
export type ScenarioChanges = {
  incomeChangePct: number;
  incomeStartMonth: number;
  incomeDurationMonths: number; // 0 = permanent
  expenseChangePct: number;
  expenseChangeAmount: number;
  oneTimeCost: number;
  oneTimeMonth: number;
  savingsBoostPct: number;
  newDebtAmount: number;
  newDebtPayment: number;
  newDebtMonths: number;
  assetPurchase: number;
  econ: Partial<Assumptions>;
};
export type Scenario = { id: number; name: string; category: string; description: string; changes: ScenarioChanges; lastRunAt: string | null; lastSummary: string | null; createdAt: string };
export type SimResult = {
  months: number[];
  bands: { p5: number[]; p15: number[]; p25: number[]; p50: number[]; p75: number[]; p85: number[]; p95: number[]; mean: number[] };
  baselineMedian: number[];
  percentiles: Record<string, number>;
  histogram: { x0: number; x1: number; count: number }[];
  kpis: {
    expectedNetWorth: number; medianNetWorth: number; goalProbability: number | null; emergencySurvival: number;
    shortfallProbability: number; medianShortfall: number; monthlyCashFlow: number; baselineMedian: number; runwayMonths: number;
  };
  risk: { cashFlowStress: number; goalRisk: number | null; emergencyRisk: number; drivers: { label: string; impact: number }[] };
  assumptions: Assumptions;
  changes: ScenarioChanges;
  goal: { name: string; target: number; date: string } | null;
};
export type Simulation = { id: number; scenarioId: number | null; scenarioName: string; goalId: number | null; horizonYears: number; paths: number; status: string; result: SimResult; createdAt: string };
export type Report = { id: number; title: string; type: string; config: Record<string, unknown>; createdAt: string };
export type Notification = { id: number; type: string; title: string; body: string; read: boolean; createdAt: string };
export type UserInfo = { id: number; name: string; email: string; verified: boolean; createdAt: string; settings: Record<string, unknown> };

export const emptyChanges = (): ScenarioChanges => ({
  incomeChangePct: 0, incomeStartMonth: 0, incomeDurationMonths: 0, expenseChangePct: 0, expenseChangeAmount: 0,
  oneTimeCost: 0, oneTimeMonth: 0, savingsBoostPct: 0, newDebtAmount: 0, newDebtPayment: 0, newDebtMonths: 0, assetPurchase: 0, econ: {},
});

export const PRESETS: Record<string, { label: string; description: string; a: Omit<Assumptions, "horizonYears"> }> = {
  normal: { label: "Normal", description: "Steady conditions close to recent averages.", a: { inflation: 12, incomeGrowth: 10, expenseGrowth: 11, investReturn: 14, volatility: 14 } },
  highInflation: { label: "High Inflation", description: "Prices rise faster than incomes for several years.", a: { inflation: 28, incomeGrowth: 15, expenseGrowth: 26, investReturn: 18, volatility: 22 } },
  recession: { label: "Recession", description: "Weaker income growth and lower, more volatile returns.", a: { inflation: 9, incomeGrowth: 3, expenseGrowth: 8, investReturn: 4, volatility: 26 } },
  lowGrowth: { label: "Low Growth", description: "A long, quiet period of modest gains.", a: { inflation: 8, incomeGrowth: 5, expenseGrowth: 7, investReturn: 8, volatility: 12 } },
  strongGrowth: { label: "Strong Growth", description: "Rising incomes and healthy markets.", a: { inflation: 10, incomeGrowth: 15, expenseGrowth: 9, investReturn: 18, volatility: 16 } },
};

export const ASSUMPTION_INFO: Record<keyof Assumptions, { label: string; unit: string; min: number; max: number; step: number; explain: string; why: string; history: string }> = {
  inflation: { label: "Inflation", unit: "%", min: 0, max: 40, step: 0.5, explain: "How fast general prices rise each year.", why: "Erodes the real value of cash and raises the cost of future goals.", history: "Annual headline inflation in Egypt has ranged widely over the last decade, from single digits to above 30%." },
  incomeGrowth: { label: "Income growth", unit: "%", min: -10, max: 40, step: 0.5, explain: "Average yearly change in your income.", why: "Compounds across every future month of saving capacity.", history: "Nominal wage growth tends to trail inflation during price shocks and catch up afterward." },
  expenseGrowth: { label: "Expense growth", unit: "%", min: 0, max: 40, step: 0.5, explain: "Average yearly change in your spending.", why: "If expenses grow faster than income, your monthly surplus shrinks.", history: "Personal expense growth usually tracks inflation plus lifestyle changes." },
  investReturn: { label: "Investment return", unit: "%", min: -5, max: 30, step: 0.5, explain: "Expected nominal yearly return on invested savings.", why: "Determines how much invested savings grow on their own.", history: "Local deposit rates and equity returns have both been high in nominal terms, with large swings." },
  volatility: { label: "Volatility", unit: "%", min: 2, max: 40, step: 1, explain: "How much yearly returns can swing around the average.", why: "Widens the range of possible outcomes — the hatched area on charts.", history: "Diversified portfolios typically show 10–20% annual volatility." },
  horizonYears: { label: "Simulation horizon", unit: "yrs", min: 1, max: 30, step: 1, explain: "How far into the future the model looks.", why: "Longer horizons compound both growth and uncertainty.", history: "Most personal planning horizons sit between 5 and 15 years." },
};

export const PREFERENCE_ADJ: Record<Twin["preference"], { ret: number; vol: number; label: string }> = {
  cautious: { ret: -2, vol: 0, label: "More cautious" },
  balanced: { ret: 0, vol: 0, label: "Balanced" },
  growth: { ret: 2, vol: 2, label: "More growth-oriented" },
  wide: { ret: 0, vol: 8, label: "Wide range of outcomes" },
};

export function defaultTwin(): Twin {
  return {
    profile: { name: "", age: 30, country: "Egypt", city: "Cairo", currency: "EGP" },
    employment: "Employed",
    income: { monthly: 0, additional: 0, frequency: "Monthly", growth: 10, unsure: false },
    expenses: Object.fromEntries(EXPENSE_KEYS.map((k) => [k, 0])) as Record<ExpenseKey, number>,
    savings: { cash: 0, emergency: 0, monthly: 0, otherLiquid: 0 },
    assets: [], liabilities: [], preference: "balanced",
    assumptions: { ...PRESETS.normal.a, horizonYears: 10 }, economicPreset: "normal",
  };
}

export function metrics(twin: Twin, accounts: Account[]) {
  const income = (twin.income.monthly || 0) + (twin.income.additional || 0);
  const debtPayments = twin.liabilities.reduce((s, l) => s + (l.payment || 0), 0);
  const categoryExpenses = EXPENSE_KEYS.reduce((s, k) => s + (twin.expenses[k] || 0), 0);
  const expenses = categoryExpenses + debtPayments;
  const essential = ESSENTIAL.reduce((s, k) => s + (twin.expenses[k] || 0), 0) + debtPayments;
  const flexible = expenses - essential;
  const savings = income - expenses;
  const savingsRate = income > 0 ? savings / income : 0;
  const liquid = accounts.filter((a) => a.type !== "Credit Card" && a.type !== "Investment").reduce((s, a) => s + Math.max(0, a.balance), 0);
  const investedAccounts = accounts.filter((a) => a.type === "Investment").reduce((s, a) => s + a.balance, 0);
  const creditCards = accounts.filter((a) => a.type === "Credit Card").reduce((s, a) => s + Math.min(0, a.balance), 0);
  const investments = twin.assets.filter((a) => a.type === "Investments").reduce((s, a) => s + a.value, 0) + investedAccounts;
  const otherAssets = twin.assets.filter((a) => a.type !== "Investments").reduce((s, a) => s + a.value, 0);
  const totalDebt = twin.liabilities.reduce((s, l) => s + (l.balance || 0), 0) - creditCards;
  const totalAssets = liquid + investments + otherAssets;
  const netWorth = totalAssets - totalDebt;
  const coverage = essential > 0 ? liquid / essential : 0;
  const dti = income > 0 ? debtPayments / income : 0;
  return { income, expenses, essential, flexible, savings, savingsRate, liquid, investments, otherAssets, totalAssets, totalDebt, netWorth, coverage, debtPayments, dti, creditCards: -creditCards };
}
export type Metrics = ReturnType<typeof metrics>;

export function effectiveAssumptions(twin: Twin): Assumptions {
  const adj = PREFERENCE_ADJ[twin.preference] ?? PREFERENCE_ADJ.balanced;
  return { ...twin.assumptions, investReturn: twin.assumptions.investReturn + adj.ret, volatility: twin.assumptions.volatility + adj.vol };
}

export function fmtMoney(v: number, cur: string = "EGP", opts: { compact?: boolean; sign?: boolean } = {}) {
  const abs = Math.abs(v);
  let body: string;
  if (opts.compact && abs >= 1_000_000) body = (abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2) + "M";
  else if (opts.compact && abs >= 10_000) body = Math.round(abs / 1000) + "K";
  else body = Math.round(abs).toLocaleString("en-US");
  const sign = v < 0 ? "−" : opts.sign && v > 0 ? "+" : "";
  return `${sign}${cur} ${body}`;
}
export const fmtPct = (v: number, d = 1, sign = false) => `${sign && v > 0 ? "+" : ""}${(v * 100).toFixed(d)}%`;
export const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const monthsBetween = (from: Date, to: Date) => Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
export const uid = () => Math.random().toString(36).slice(2, 10);

export const SCENARIO_TEMPLATES: { name: string; category: string; description: string; changes: Partial<ScenarioChanges> }[] = [
  { name: "Lose My Job", category: "Career", description: "Income stops for six months while expenses continue.", changes: { incomeChangePct: -100, incomeStartMonth: 1, incomeDurationMonths: 6 } },
  { name: "Get a Raise", category: "Career", description: "A 20% raise starting in three months.", changes: { incomeChangePct: 20, incomeStartMonth: 3 } },
  { name: "Change Career", category: "Career", description: "A 30% income dip for a year while retraining, then recovery.", changes: { incomeChangePct: -30, incomeStartMonth: 2, incomeDurationMonths: 12, oneTimeCost: 25000, oneTimeMonth: 2 } },
  { name: "Start Freelancing", category: "Career", description: "Income becomes more variable and dips 15% in year one.", changes: { incomeChangePct: -15, incomeStartMonth: 1, incomeDurationMonths: 12, econ: { volatility: 22 } } },
  { name: "Start a Business", category: "Career", description: "Invest EGP 150K and reduce income for 18 months.", changes: { oneTimeCost: 150000, oneTimeMonth: 3, incomeChangePct: -40, incomeStartMonth: 3, incomeDurationMonths: 18 } },
  { name: "Get Married", category: "Life", description: "Wedding costs and a moderate rise in household expenses.", changes: { oneTimeCost: 200000, oneTimeMonth: 12, expenseChangePct: 25 } },
  { name: "Have a Child", category: "Life", description: "Monthly costs rise by about EGP 6,000.", changes: { expenseChangeAmount: 6000, incomeStartMonth: 9 } },
  { name: "Move City", category: "Life", description: "Relocation costs and 10% higher living expenses.", changes: { oneTimeCost: 40000, oneTimeMonth: 4, expenseChangePct: 10 } },
  { name: "Buy a Home", category: "Housing", description: "EGP 450K down payment and a 15-year mortgage.", changes: { oneTimeCost: 450000, oneTimeMonth: 24, assetPurchase: 1500000, newDebtAmount: 1050000, newDebtPayment: 14500, newDebtMonths: 180 } },
  { name: "Keep Renting", category: "Housing", description: "Rent rises 15% faster than other prices.", changes: { expenseChangeAmount: 1050 } },
  { name: "Buy a Car", category: "Transportation", description: "EGP 150K down with a 5-year car loan.", changes: { oneTimeCost: 150000, oneTimeMonth: 6, assetPurchase: 650000, newDebtAmount: 500000, newDebtPayment: 12000, newDebtMonths: 60 } },
  { name: "Transport Cost Increase", category: "Transportation", description: "Fuel and transit costs rise 40%.", changes: { expenseChangeAmount: 720 } },
  { name: "High Inflation", category: "Economic", description: "Apply the high-inflation economic environment.", changes: { econ: { ...PRESETS.highInflation.a } } },
  { name: "Recession", category: "Economic", description: "Weak income growth and volatile markets.", changes: { econ: { ...PRESETS.recession.a } } },
  { name: "Lower Returns", category: "Economic", description: "Investment returns 5 points below assumption.", changes: { econ: { investReturn: 9 } } },
  { name: "Save 15% More", category: "Savings", description: "Redirect 15% of income from flexible spending to savings.", changes: { savingsBoostPct: 15 } },
  { name: "Spend Less", category: "Savings", description: "Cut flexible spending by 20%.", changes: { expenseChangePct: -8 } },
];

export function categoryOf(name: string) {
  return SCENARIO_TEMPLATES.find((t) => t.name === name)?.category ?? "Custom";
}

export function demoTwin(name: string): Twin {
  const t = defaultTwin();
  t.profile = { name, age: 31, country: "Egypt", city: "Cairo", currency: "EGP" };
  t.employment = "Employed";
  t.income = { monthly: 28000, additional: 4000, frequency: "Monthly", growth: 10, unsure: false };
  t.expenses = { housing: 7000, food: 4200, transportation: 1800, utilities: 1100, healthcare: 600, education: 0, debt: 0, family: 1500, entertainment: 1000, shopping: 1200, travel: 600, subscriptions: 400, other: 400 };
  t.savings = { cash: 38200, emergency: 47300, monthly: 10600, otherLiquid: 0 };
  t.assets = [
    { id: uid(), name: "Index portfolio", type: "Investments", value: 95000 },
    { id: uid(), name: "Hyundai Elantra", type: "Vehicle", value: 330000 },
  ];
  t.liabilities = [{ id: uid(), name: "Car loan", type: "Car loan", balance: 73500, payment: 1600, rate: 0, months: 46 }];
  return t;
}

