import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

const DEFAULT_USER_ID = "ramy_fahmy_fintwin";

// Helper to seed realistic EGP digital twin data if tables are empty
async function ensureSeeded() {
  // Check if default user exists
  const existingUsers = await db.select().from(schema.users).where(eq(schema.users.id, DEFAULT_USER_ID));
  
  if (existingUsers.length > 0) {
    return DEFAULT_USER_ID;
  }

  // Seed User
  await db.insert(schema.users).values({
    id: DEFAULT_USER_ID,
    email: "ramy@fintwin.ai",
    name: "Ramy Fahmy",
    password: "hashed_secure_password_123", // Dummy for seed
    currency: "EGP",
    country: "Egypt",
    city: "Cairo",
    age: 32,
    employment: "Freelancer",
    planningStyle: "Balanced",
    simulationHorizon: 30,
  });

  // Seed Accounts
  const seedAccounts = [
    { id: "acc_1", userId: DEFAULT_USER_ID, name: "CIB Premium Checking", type: "Cash", balance: 48200.0, lastUpdated: new Date() },
    { id: "acc_2", userId: DEFAULT_USER_ID, name: "HSBC High Yield Savings", type: "Savings", balance: 320300.0, lastUpdated: new Date() },
    { id: "acc_3", userId: DEFAULT_USER_ID, name: "Thndr Growth Portfolio", type: "Investment", balance: 70000.0, lastUpdated: new Date() },
    { id: "acc_4", userId: DEFAULT_USER_ID, name: "ValU Credit Card", type: "Credit Card", balance: -10000.0, lastUpdated: new Date() },
  ];
  for (const acc of seedAccounts) {
    await db.insert(schema.accounts).values(acc);
  }

  // Seed Economic Assumptions
  await db.insert(schema.economicAssumptions).values({
    id: "ea_1",
    userId: DEFAULT_USER_ID,
    inflationRate: 12.5, // Realistic Egyptian inflation baseline
    incomeGrowthRate: 8.0,
    expenseGrowthRate: 9.0,
    investmentReturnRate: 15.0,
    volatilityRate: 18.0,
    description: "Standard EGP baseline configuration with high volatility and interest yield context",
  });

  // Seed Goals
  const seedGoals = [
    {
      id: "goal_1",
      userId: DEFAULT_USER_ID,
      name: "Buy a Home (Zamalek Downpayment)",
      targetAmount: 1500000.0,
      currentAmount: 200000.0,
      targetDate: "2029-12",
      monthlyContribution: 8500.0,
      status: "At Risk",
      category: "Buy a Home",
    },
    {
      id: "goal_2",
      userId: DEFAULT_USER_ID,
      name: "Emergency Safety Net (6m)",
      targetAmount: 120000.0,
      currentAmount: 120000.0,
      targetDate: "2026-06",
      monthlyContribution: 0.0,
      status: "Active",
      category: "Emergency Fund",
    },
    {
      id: "goal_3",
      userId: DEFAULT_USER_ID,
      name: "Retirement Pension Reserve",
      targetAmount: 6000000.0,
      currentAmount: 110000.0,
      targetDate: "2054-06",
      monthlyContribution: 3500.0,
      status: "Active",
      category: "Retirement",
    }
  ];
  for (const goal of seedGoals) {
    await db.insert(schema.goals).values(goal);
  }

  // Seed Transactions
  const seedTransactions = [
    { id: "t_1", userId: DEFAULT_USER_ID, accountId: "acc_1", description: "Upwork Freelance Retainer (Design)", amount: 28000.0, category: "Freelance", type: "income", date: new Date(Date.now() - 2 * 24 * 3600 * 1000) },
    { id: "t_2", userId: DEFAULT_USER_ID, accountId: "acc_1", description: "Advisory Consultation Fee", amount: 4000.0, category: "Career", type: "income", date: new Date(Date.now() - 4 * 24 * 3600 * 1000) },
    { id: "t_3", userId: DEFAULT_USER_ID, accountId: "acc_1", description: "Apartment Rent (Zamalek Flat)", amount: -12000.0, category: "Housing", type: "expense", date: new Date(Date.now() - 15 * 24 * 3600 * 1000) },
    { id: "t_4", userId: DEFAULT_USER_ID, accountId: "acc_1", description: "Gourmet Grocery Delivery", amount: -4500.0, category: "Food", type: "expense", date: new Date(Date.now() - 3 * 24 * 3600 * 1000) },
    { id: "t_5", userId: DEFAULT_USER_ID, accountId: "acc_1", description: "Electricity & High-Speed Fiber", amount: -1900.0, category: "Utilities", type: "expense", date: new Date(Date.now() - 8 * 24 * 3600 * 1000) },
    { id: "t_6", userId: DEFAULT_USER_ID, accountId: "acc_1", description: "Netflix & Spotify Premium Bundle", amount: -500.0, category: "Subscriptions", type: "expense", date: new Date(Date.now() - 9 * 24 * 3600 * 1000) },
    { id: "t_7", userId: DEFAULT_USER_ID, accountId: "acc_3", description: "Thndr Mutual Fund Auto-draft", amount: -2500.0, category: "Wealth Building", type: "expense", date: new Date(Date.now() - 1 * 24 * 3600 * 1000) },
  ];
  for (const tx of seedTransactions) {
    await db.insert(schema.transactions).values(tx);
  }

  // Seed Scenarios
  const seedScenarios = [
    {
      id: "scen_1",
      userId: DEFAULT_USER_ID,
      name: "Lose Major Freelance Client",
      category: "Career",
      description: "Lose EGP 15,000 of monthly income for 6 months due to macroeconomic slowdown.",
      incomeChange: -15000.0,
      expenseChange: 0.0,
      assetChange: 0.0,
      liabilityChange: 0.0,
      delayYears: 0,
      durationMonths: 6,
      applyInflation: true,
      isActive: false,
    },
    {
      id: "scen_2",
      userId: DEFAULT_USER_ID,
      name: "Thndr Bull Market Run",
      category: "Savings",
      description: "Market recovery boosting annual investment returns to 23% in the next 5 years.",
      incomeChange: 0.0,
      expenseChange: 0.0,
      assetChange: 0.0,
      liabilityChange: 0.0,
      delayYears: 0,
      durationMonths: 60,
      applyInflation: true,
      customReturnRate: 23.0,
      isActive: false,
    },
    {
      id: "scen_3",
      userId: DEFAULT_USER_ID,
      name: "Acquire New Prime Property",
      category: "Housing",
      description: "Downpayment of EGP 300,000 and mortgage payment of EGP 15,000 monthly for 10 years.",
      incomeChange: 0.0,
      expenseChange: 15000.0,
      assetChange: -300000.0,
      liabilityChange: 900000.0,
      delayYears: 2,
      durationMonths: 120,
      applyInflation: true,
      isActive: false,
    },
    {
      id: "scen_4",
      userId: DEFAULT_USER_ID,
      name: "Severe EM Inflation Shock",
      category: "Economic",
      description: "Inflation spikes to 22% with subsequent living costs increasing by EGP 5,000 per month.",
      incomeChange: 0.0,
      expenseChange: 5000.0,
      assetChange: 0.0,
      liabilityChange: 0.0,
      delayYears: 0,
      durationMonths: 36,
      applyInflation: true,
      isActive: false,
    }
  ];
  for (const scen of seedScenarios) {
    await db.insert(schema.scenarios).values(scen);
  }

  // Seed standard first AI conversation
  await db.insert(schema.aiConversations).values({
    id: "conv_1",
    userId: DEFAULT_USER_ID,
    question: "How resilient is my current plan against inflation in Egypt?",
    answer: "Your digital twin is constructed with a net worth of EGP 428,500 and a baseline inflation of 12.5%. With an emergency fund of EGP 120,000, you have roughly 5.6 months of essential living coverage. However, if inflation rises to 22% (Scenario: EM Inflation Shock), your savings' purchasing power degrades rapidly, reducing your real emergency coverage from 5.6 months to 3.9 months. I recommend locking in yields via high-rate savings certificates or allocating more to inflation-hedged Thndr portfolios.",
    contextJson: { baselineInflation: 12.5, currentNW: 428500, emergencyFund: 120000 },
    createdAt: new Date(),
  });

  return DEFAULT_USER_ID;
}

// GET all digital twin data for our current user session
export async function GET() {
  try {
    const userId = await ensureSeeded();

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    const userAccounts = await db.select().from(schema.accounts).where(eq(schema.accounts.userId, userId));
    const userTransactions = await db.select().from(schema.transactions).where(eq(schema.transactions.userId, userId)).orderBy(desc(schema.transactions.date));
    const userGoals = await db.select().from(schema.goals).where(eq(schema.goals.userId, userId));
    const userScenarios = await db.select().from(schema.scenarios).where(eq(schema.scenarios.userId, userId));
    const [userAssumptions] = await db.select().from(schema.economicAssumptions).where(eq(schema.economicAssumptions.userId, userId));
    const userSimulations = await db.select().from(schema.simulations).where(eq(schema.simulations.userId, userId)).orderBy(desc(schema.simulations.runDate));
    const userReports = await db.select().from(schema.reports).where(eq(schema.reports.userId, userId)).orderBy(desc(schema.reports.createdAt));
    const userAiConversations = await db.select().from(schema.aiConversations).where(eq(schema.aiConversations.userId, userId)).orderBy(desc(schema.aiConversations.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        user,
        accounts: userAccounts,
        transactions: userTransactions,
        goals: userGoals,
        scenarios: userScenarios,
        assumptions: userAssumptions || {
          id: "ea_1",
          userId,
          inflationRate: 12.5,
          incomeGrowthRate: 8.0,
          expenseGrowthRate: 9.0,
          investmentReturnRate: 15.0,
          volatilityRate: 18.0,
          description: "Standard EGP baseline configuration"
        },
        simulations: userSimulations,
        reports: userReports,
        aiConversations: userAiConversations,
      }
    });
  } catch (error: any) {
    console.error("GET twin data failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST mutation router
export async function POST(request: Request) {
  try {
    const userId = await ensureSeeded();
    const payload = await request.json();
    const { action, table, data, id } = payload;

    if (action === "reset") {
      // Clean DB for the default user
      await db.delete(schema.aiConversations).where(eq(schema.aiConversations.userId, userId));
      await db.delete(schema.reports).where(eq(schema.reports.userId, userId));
      await db.delete(schema.simulations).where(eq(schema.simulations.userId, userId));
      await db.delete(schema.scenarios).where(eq(schema.scenarios.userId, userId));
      await db.delete(schema.transactions).where(eq(schema.transactions.userId, userId));
      await db.delete(schema.goals).where(eq(schema.goals.userId, userId));
      await db.delete(schema.accounts).where(eq(schema.accounts.userId, userId));
      await db.delete(schema.economicAssumptions).where(eq(schema.economicAssumptions.userId, userId));
      await db.delete(schema.users).where(eq(schema.users.id, userId));

      await ensureSeeded();
      return NextResponse.json({ success: true, message: "Database reset to baseline state successfully!" });
    }

    if (!table) {
      return NextResponse.json({ success: false, error: "Table name is required" }, { status: 400 });
    }

    // 1. ACCOUNTS MUTATIONS
    if (table === "accounts") {
      if (action === "upsert") {
        const record = {
          id: id || "acc_" + Math.random().toString(36).substring(2, 11),
          userId,
          name: data.name,
          type: data.type,
          balance: parseFloat(data.balance) || 0,
          lastUpdated: new Date()
        };
        await db.insert(schema.accounts).values(record).onConflictDoUpdate({
          target: schema.accounts.id,
          set: {
            name: record.name,
            type: record.type,
            balance: record.balance,
            lastUpdated: new Date()
          }
        });
        return NextResponse.json({ success: true, record });
      } else if (action === "delete") {
        await db.delete(schema.accounts).where(and(eq(schema.accounts.id, id), eq(schema.accounts.userId, userId)));
        return NextResponse.json({ success: true, deleted: id });
      }
    }

    // 2. TRANSACTIONS MUTATIONS
    if (table === "transactions") {
      if (action === "upsert") {
        const record = {
          id: id || "t_" + Math.random().toString(36).substring(2, 11),
          userId,
          accountId: data.accountId || null,
          description: data.description,
          amount: parseFloat(data.amount) || 0,
          category: data.category,
          type: data.type, // income, expense, transfer
          date: data.date ? new Date(data.date) : new Date()
        };
        await db.insert(schema.transactions).values(record).onConflictDoUpdate({
          target: schema.transactions.id,
          set: {
            accountId: record.accountId,
            description: record.description,
            amount: record.amount,
            category: record.category,
            type: record.type,
            date: record.date
          }
        });

        // Optionally adjust connected account balance if requested
        if (data.adjustBalance && record.accountId) {
          const [acc] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, record.accountId));
          if (acc) {
            await db.update(schema.accounts)
              .set({ balance: acc.balance + record.amount })
              .where(eq(schema.accounts.id, record.accountId));
          }
        }

        return NextResponse.json({ success: true, record });
      } else if (action === "delete") {
        await db.delete(schema.transactions).where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, userId)));
        return NextResponse.json({ success: true, deleted: id });
      } else if (action === "import") {
        const importedRows = [];
        for (const row of data.rows) {
          const item = {
            id: "t_" + Math.random().toString(36).substring(2, 11),
            userId,
            accountId: data.accountId || null,
            description: row.description || "Imported transaction",
            amount: parseFloat(row.amount) || 0,
            category: row.category || "General",
            type: row.amount >= 0 ? "income" : "expense",
            date: row.date ? new Date(row.date) : new Date()
          };
          await db.insert(schema.transactions).values(item);
          importedRows.push(item);
        }
        return NextResponse.json({ success: true, count: importedRows.length, rows: importedRows });
      }
    }

    // 3. GOALS MUTATIONS
    if (table === "goals") {
      if (action === "upsert") {
        const record = {
          id: id || "goal_" + Math.random().toString(36).substring(2, 11),
          userId,
          name: data.name,
          targetAmount: parseFloat(data.targetAmount) || 0,
          currentAmount: parseFloat(data.currentAmount) || 0,
          targetDate: data.targetDate || "2030-01",
          monthlyContribution: parseFloat(data.monthlyContribution) || 0,
          category: data.category || "Custom",
          status: data.status || "Active"
        };
        await db.insert(schema.goals).values(record).onConflictDoUpdate({
          target: schema.goals.id,
          set: record
        });
        return NextResponse.json({ success: true, record });
      } else if (action === "delete") {
        await db.delete(schema.goals).where(and(eq(schema.goals.id, id), eq(schema.goals.userId, userId)));
        return NextResponse.json({ success: true, deleted: id });
      }
    }

    // 4. SCENARIOS MUTATIONS
    if (table === "scenarios") {
      if (action === "upsert") {
        const record = {
          id: id || "scen_" + Math.random().toString(36).substring(2, 11),
          userId,
          name: data.name,
          category: data.category,
          description: data.description,
          incomeChange: parseFloat(data.incomeChange) || 0,
          expenseChange: parseFloat(data.expenseChange) || 0,
          assetChange: parseFloat(data.assetChange) || 0,
          liabilityChange: parseFloat(data.liabilityChange) || 0,
          delayYears: parseInt(data.delayYears) || 0,
          durationMonths: parseInt(data.durationMonths) || 120,
          applyInflation: data.applyInflation !== false,
          customReturnRate: data.customReturnRate ? parseFloat(data.customReturnRate) : null,
          isActive: !!data.isActive,
        };
        await db.insert(schema.scenarios).values(record).onConflictDoUpdate({
          target: schema.scenarios.id,
          set: record
        });
        return NextResponse.json({ success: true, record });
      } else if (action === "delete") {
        await db.delete(schema.scenarios).where(and(eq(schema.scenarios.id, id), eq(schema.scenarios.userId, userId)));
        return NextResponse.json({ success: true, deleted: id });
      } else if (action === "toggleActive") {
        // Toggle active scenario
        const [scen] = await db.select().from(schema.scenarios).where(and(eq(schema.scenarios.id, id), eq(schema.scenarios.userId, userId)));
        if (scen) {
          const nextActive = !scen.isActive;
          await db.update(schema.scenarios).set({ isActive: nextActive }).where(eq(schema.scenarios.id, id));
          return NextResponse.json({ success: true, isActive: nextActive });
        }
      }
    }

    // 5. ASSUMPTIONS MUTATIONS
    if (table === "assumptions") {
      if (action === "upsert") {
        const record = {
          id: id || "ea_1",
          userId,
          inflationRate: parseFloat(data.inflationRate) ?? 12.5,
          incomeGrowthRate: parseFloat(data.incomeGrowthRate) ?? 5.0,
          expenseGrowthRate: parseFloat(data.expenseGrowthRate) ?? 6.0,
          investmentReturnRate: parseFloat(data.investmentReturnRate) ?? 12.0,
          volatilityRate: parseFloat(data.volatilityRate) ?? 15.0,
          description: data.description || "Custom digital twin parameters"
        };
        await db.insert(schema.economicAssumptions).values(record).onConflictDoUpdate({
          target: schema.economicAssumptions.id,
          set: record
        });
        return NextResponse.json({ success: true, record });
      }
    }

    // 6. USER PROFILE MUTATIONS
    if (table === "users") {
      if (action === "update") {
        await db.update(schema.users).set({
          name: data.name,
          email: data.email,
          currency: data.currency,
          country: data.country,
          city: data.city,
          age: parseInt(data.age) || 30,
          employment: data.employment,
          planningStyle: data.planningStyle,
          simulationHorizon: parseInt(data.simulationHorizon) || 30
        }).where(eq(schema.users.id, userId));
        return NextResponse.json({ success: true, message: "Profile updated successfully!" });
      }
    }

    // 7. REPORTS MUTATIONS
    if (table === "reports") {
      if (action === "create") {
        const record = {
          id: "rep_" + Math.random().toString(36).substring(2, 11),
          userId,
          name: data.name || "Financial Simulation Report",
          type: data.type || "Snapshot",
          createdAt: new Date(),
          contentJson: data.contentJson || {}
        };
        await db.insert(schema.reports).values(record);
        return NextResponse.json({ success: true, record });
      } else if (action === "delete") {
        await db.delete(schema.reports).where(and(eq(schema.reports.id, id), eq(schema.reports.userId, userId)));
        return NextResponse.json({ success: true, deleted: id });
      }
    }

    // 8. AI CONVERSATIONS MUTATIONS
    if (table === "ai_conversations") {
      if (action === "create") {
        const record = {
          id: "conv_" + Math.random().toString(36).substring(2, 11),
          userId,
          question: data.question,
          answer: data.answer,
          contextJson: data.contextJson || {},
          createdAt: new Date()
        };
        await db.insert(schema.aiConversations).values(record);
        return NextResponse.json({ success: true, record });
      }
    }

    // 9. SIMULATIONS MUTATIONS
    if (table === "simulations") {
      if (action === "create") {
        const record = {
          id: "sim_" + Math.random().toString(36).substring(2, 11),
          userId,
          scenarioId: data.scenarioId || null,
          runDate: new Date(),
          pathsCount: parseInt(data.pathsCount) || 600,
          expectedNetWorth: parseFloat(data.expectedNetWorth) || 0,
          goalProbability: parseFloat(data.goalProbability) || 0,
          emergencyFundSurvival: parseFloat(data.emergencyFundSurvival) || 0,
          cashShortfallOccurrences: parseInt(data.cashShortfallOccurrences) || 0,
          resultsJson: data.resultsJson || {}
        };
        await db.insert(schema.simulations).values(record);
        return NextResponse.json({ success: true, record });
      }
    }

    return NextResponse.json({ success: false, error: `Unsupported table or action: ${table} ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("POST twin handler failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
