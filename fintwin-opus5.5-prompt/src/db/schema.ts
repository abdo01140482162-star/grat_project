import { pgTable, text, timestamp, doublePrecision, integer, jsonb, boolean } from "drizzle-orm/pg-core";

// 1. Users & Profiles
export const users = pgTable("users", {
  id: text("id").primaryKey(), // We can use UUID or custom string IDs
  email: text("email").notNull(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  currency: text("currency").default("EGP").notNull(),
  country: text("country").default("Egypt").notNull(),
  city: text("city").default("Cairo").notNull(),
  age: integer("age").default(30).notNull(),
  employment: text("employment").default("Employed").notNull(),
  planningStyle: text("planning_style").default("Balanced").notNull(), // Cautious, Balanced, Growth, Wide
  simulationHorizon: integer("simulation_horizon").default(30).notNull(), // in years
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Financial Accounts
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // Savings, Investment, Cash, Credit Card, Property
  balance: doublePrecision("balance").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// 3. Transactions
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(), // negative for expense, positive for income
  category: text("category").notNull(), // Housing, Food, Utilities, Transport, Career, Freelance, Subscriptions, Shopping, Wealth Building
  type: text("type").notNull(), // income, expense, transfer
  date: timestamp("date").defaultNow().notNull(),
});

// 4. Financial Goals
export const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  targetAmount: doublePrecision("target_amount").notNull(),
  currentAmount: doublePrecision("current_amount").notNull(),
  targetDate: text("target_date").notNull(), // e.g. "2028-12"
  monthlyContribution: doublePrecision("monthly_contribution").notNull(),
  status: text("status").default("Active").notNull(), // Active, Achieved, At Risk
  category: text("category").notNull(), // Emergency Fund, Buy a Home, Buy a Car, Retirement, Custom
});

// 5. Scenarios (Simulation Laboratory)
export const scenarios = pgTable("scenarios", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // Career, Life, Housing, Economic, Savings, Custom
  description: text("description").notNull(),
  // Impact properties
  incomeChange: doublePrecision("income_change").default(0).notNull(), // Monthly delta
  expenseChange: doublePrecision("expense_change").default(0).notNull(), // Monthly delta
  assetChange: doublePrecision("asset_change").default(0).notNull(), // One-time asset delta
  liabilityChange: doublePrecision("liability_change").default(0).notNull(), // One-time debt delta
  delayYears: integer("delay_years").default(0).notNull(), // Start offset
  durationMonths: integer("duration_months").default(120).notNull(), // Simulation duration impact
  applyInflation: boolean("apply_inflation").default(true).notNull(),
  customReturnRate: doublePrecision("custom_return_rate"), // Null means use baseline
  isActive: boolean("is_active").default(false).notNull(),
});

// 6. Simulations History
export const simulations = pgTable("simulations", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  scenarioId: text("scenario_id").references(() => scenarios.id, { onDelete: "cascade" }),
  runDate: timestamp("run_date").defaultNow().notNull(),
  pathsCount: integer("paths_count").default(600).notNull(),
  expectedNetWorth: doublePrecision("expected_net_worth").notNull(),
  goalProbability: doublePrecision("goal_probability").notNull(),
  emergencyFundSurvival: doublePrecision("emergency_fund_survival").notNull(), // months
  cashShortfallOccurrences: integer("cash_shortfall_occurrences").notNull(), // percentage of paths
  resultsJson: jsonb("results_json").notNull(), // details of simulation percentiles over time
});

// 7. Economic Assumptions
export const economicAssumptions = pgTable("economic_assumptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  inflationRate: doublePrecision("inflation_rate").default(8.5).notNull(), // % annual
  incomeGrowthRate: doublePrecision("income_growth_rate").default(5.0).notNull(), // % annual
  expenseGrowthRate: doublePrecision("expense_growth_rate").default(6.0).notNull(), // % annual
  investmentReturnRate: doublePrecision("investment_return_rate").default(12.0).notNull(), // % annual
  volatilityRate: doublePrecision("volatility_rate").default(15.0).notNull(), // % annual market volatility
  description: text("description").default("Standard emerging market configuration").notNull(),
});

// 8. Financial Reports
export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // Snapshot, Twin, Scenario, Goal
  createdAt: timestamp("created_at").defaultNow().notNull(),
  contentJson: jsonb("content_json").notNull(),
});

// 9. AI Intelligence Conversations
export const aiConversations = pgTable("ai_conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  contextJson: jsonb("context_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
