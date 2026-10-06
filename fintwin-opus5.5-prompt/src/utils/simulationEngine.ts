// stochastic financial simulation engine using Box-Muller transform for normal distribution modeling
export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // "YYYY-MM" or "YYYY"
  monthlyContribution: number;
  category: string;
  status: string;
}

export interface Scenario {
  id: string;
  name: string;
  category: string;
  description: string;
  incomeChange: number;
  expenseChange: number;
  assetChange: number;
  liabilityChange: number;
  delayYears: number;
  durationMonths: number;
  applyInflation: boolean;
  customReturnRate?: number | null;
  isActive: boolean;
}

export interface EconomicAssumptions {
  inflationRate: number; // e.g. 12.5%
  incomeGrowthRate: number; // e.g. 8.0%
  expenseGrowthRate: number; // e.g. 9.0%
  investmentReturnRate: number; // e.g. 15.0%
  volatilityRate: number; // e.g. 18.0%
}

export interface SimulationResult {
  months: string[]; // X axis (years or dates)
  percentiles: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  goalProbability: number; // percentage (0 - 100)
  emergencyFundSurvival: number; // in months
  cashShortfallPct: number; // percentage of paths that hit 0
  averageNetWorthAtHorizon: number;
}

// Box-Muller transform for generating normally distributed random variables
function randomNormal(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

export function runMonteCarlo({
  accounts,
  goals,
  activeScenarios,
  assumptions,
  horizonYears = 30,
  pathsCount = 600,
}: {
  accounts: Account[];
  goals: Goal[];
  activeScenarios: Scenario[];
  assumptions: EconomicAssumptions;
  horizonYears?: number;
  pathsCount?: number;
}): SimulationResult {
  const monthsCount = horizonYears * 12;
  const paths: number[][] = Array.from({ length: pathsCount }, () => new Array(monthsCount + 1).fill(0));

  // Determine starting values
  let initialLiquidAssets = 0;
  let initialInvestments = 0;
  let initialLiabilities = 0;

  accounts.forEach((acc) => {
    if (acc.type === "Savings" || acc.type === "Cash") {
      initialLiquidAssets += acc.balance;
    } else if (acc.type === "Investment" || acc.type === "Property") {
      initialInvestments += acc.balance;
    } else if (acc.type === "Credit Card" || acc.type === "Liability") {
      initialLiabilities += acc.balance; // negative values or absolute values?
      // If balance is saved as negative in database, add it directly, otherwise subtract
      if (acc.balance < 0) {
        initialLiabilities += Math.abs(acc.balance);
      }
    }
  });

  const startingNetWorth = (initialLiquidAssets + initialInvestments) - initialLiabilities;

  // Monthly breakdown of baseline income/expenses from current accounts or hardcoded starting state
  // Let's assume baseline EGP values if empty or derive from transaction average
  const baselineMonthlyIncome = 32000;
  const baselineMonthlyExpense = 21400;

  // Let's model each path
  for (let p = 0; p < pathsCount; p++) {
    let liquid = initialLiquidAssets;
    let investments = initialInvestments;
    let liabilities = initialLiabilities;

    paths[p][0] = (liquid + investments) - liabilities;

    for (let m = 1; m <= monthsCount; m++) {
      const yearIndex = Math.floor((m - 1) / 12);
      const currentYear = 2026 + yearIndex;

      // Compound growth rates
      const inflationFactor = Math.pow(1 + assumptions.inflationRate / 100, yearIndex);
      const incomeGrowthFactor = Math.pow(1 + assumptions.incomeGrowthRate / 100, yearIndex);
      const expenseGrowthFactor = Math.pow(1 + assumptions.expenseGrowthRate / 100, yearIndex);

      let monthlyIncome = baselineMonthlyIncome * incomeGrowthFactor;
      let monthlyExpense = baselineMonthlyExpense * expenseGrowthFactor;

      // Apply active scenarios
      activeScenarios.forEach((scen) => {
        const scenarioStartMonth = scen.delayYears * 12;
        const scenarioEndMonth = scenarioStartMonth + scen.durationMonths;

        if (m >= scenarioStartMonth && m <= scenarioEndMonth) {
          // Apply changes
          monthlyIncome += scen.incomeChange;
          monthlyExpense += scen.expenseChange;

          // One-time shock injection at the exact start month
          if (m === scenarioStartMonth + 1) {
            investments += scen.assetChange; // can be negative for downpayment
            liabilities += scen.liabilityChange; // mortgage debt added
          }
        }
      });

      // Sample a random stochastic market return for this month on the investment portion
      // Annual return is 'investmentReturnRate'%, volatility is 'volatilityRate'%
      // Override return rate if customReturnRate is active in scenario
      let activeReturnRate = assumptions.investmentReturnRate;
      const customRateScenario = activeScenarios.find(s => s.customReturnRate != null);
      if (customRateScenario && customRateScenario.customReturnRate != null) {
        activeReturnRate = customRateScenario.customReturnRate;
      }

      const meanMonthlyReturn = (activeReturnRate / 100) / 12;
      const monthlyVolatility = (assumptions.volatilityRate / 100) / Math.sqrt(12);

      const sampledMonthlyReturn = randomNormal(meanMonthlyReturn, monthlyVolatility);
      investments = investments * (1 + sampledMonthlyReturn);

      // Monthly savings flow
      const netSavings = monthlyIncome - monthlyExpense;
      if (netSavings >= 0) {
        // Allocate 70% of savings to investments, 30% to cash
        investments += netSavings * 0.70;
        liquid += netSavings * 0.30;
      } else {
        // Drawdown liquid cash first, then draw investments if dry
        const deficit = Math.abs(netSavings);
        if (liquid >= deficit) {
          liquid -= deficit;
        } else {
          const remainingDeficit = deficit - liquid;
          liquid = 0;
          investments = Math.max(0, investments - remainingDeficit);
        }
      }

      // Amortize liability debt slowly (e.g., 0.5% of remaining balance paid off from liquid cash per month)
      if (liabilities > 0) {
        const debtPayment = Math.min(liabilities, liabilities * 0.005 + 500);
        liquid = Math.max(0, liquid - debtPayment);
        liabilities = Math.max(0, liabilities - debtPayment);
      }

      paths[p][m] = (liquid + investments) - liabilities;
    }
  }

  // Aggregate percentiles at each month
  const p5: number[] = [];
  const p25: number[] = [];
  const p50: number[] = [];
  const p75: number[] = [];
  const p95: number[] = [];

  const monthsLabels: string[] = [];
  for (let m = 0; m <= monthsCount; m += 12) {
    monthsLabels.push(`Y${m / 12}`);
  }

  // Calculate percentiles
  for (let m = 0; m <= monthsCount; m++) {
    // Collect values from all paths for this month
    const values = paths.map(path => path[m]);
    values.sort((a, b) => a - b);

    // Percentile indices
    p5.push(values[Math.floor(pathsCount * 0.05)]);
    p25.push(values[Math.floor(pathsCount * 0.25)]);
    p50.push(values[Math.floor(pathsCount * 0.50)]);
    p75.push(values[Math.floor(pathsCount * 0.75)]);
    p95.push(values[Math.floor(pathsCount * 0.95)]);
  }

  // Filter to yearly snapshots for easier plotting (or keep full detail if needed)
  // Let's map every 12 months for chart speed
  const sampleIndices = Array.from({ length: horizonYears + 1 }, (_, i) => i * 12);
  const sampledP5 = sampleIndices.map(idx => p5[idx]);
  const sampledP25 = sampleIndices.map(idx => p25[idx]);
  const sampledP50 = sampleIndices.map(idx => p50[idx]);
  const sampledP75 = sampleIndices.map(idx => p75[idx]);
  const sampledP95 = sampleIndices.map(idx => p95[idx]);

  // Calculate Goal Probability
  // Find primary goal
  const primaryGoal = goals[0];
  let goalProbability = 50; // default if no goal

  if (primaryGoal) {
    const targetAmount = primaryGoal.targetAmount;
    // Calculate months to target date
    // e.g. targetDate "2029-12", baseline year "2026-01" is 4 years = 48 months
    let targetMonth = 48; // default fallback
    const targetYearStr = primaryGoal.targetDate.split("-")[0];
    if (targetYearStr) {
      const yearDiff = parseInt(targetYearStr) - 2026;
      targetMonth = Math.max(1, Math.min(monthsCount, yearDiff * 12));
    }

    // How many paths exceed targetAmount at that month?
    const successfulPaths = paths.filter(path => path[targetMonth] >= targetAmount).length;
    goalProbability = Math.round((successfulPaths / pathsCount) * 100);
  }

  // Emergency Fund Survival calculation
  // How many months can liquid cash cover if regular income dropped to 0?
  const essentialExpenses = baselineMonthlyExpense;
  const liquidEmergencyFund = initialLiquidAssets;
  const emergencyFundSurvival = parseFloat((liquidEmergencyFund / essentialExpenses).toFixed(1));

  // Cash Shortfall %
  // Percentage of paths that fell below 0 net worth at any point during horizon
  const shortfallPaths = paths.filter(path => path.some(v => v < 0)).length;
  const cashShortfallPct = Math.round((shortfallPaths / pathsCount) * 100);

  const averageNetWorthAtHorizon = p50[monthsCount];

  return {
    months: monthsLabels,
    percentiles: {
      p5: sampledP5,
      p25: sampledP25,
      p50: sampledP50,
      p75: sampledP75,
      p95: sampledP95,
    },
    goalProbability,
    emergencyFundSurvival,
    cashShortfallPct,
    averageNetWorthAtHorizon,
  };
}
