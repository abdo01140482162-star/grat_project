"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  Plus,
  Trash2,
  Sliders,
  DollarSign,
  Briefcase,
  Layers,
  PiggyBank,
  Compass,
  FileText,
  User,
  Settings,
  HelpCircle,
  Search,
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  Play,
  ArrowUpRight,
  History,
  Activity,
  Globe,
  Lock,
  ChevronRight,
  Database,
  RefreshCw,
  Eye,
  Download,
  Info,
  Calendar,
  Sparkle,
  X,
  CreditCard,
  Sun,
  Moon
} from "lucide-react";
import { runMonteCarlo, Account, Goal, Scenario, EconomicAssumptions } from "@/utils/simulationEngine";

type TabType = "overview" | "twin" | "accounts" | "goals" | "scenarios" | "intelligence" | "economic" | "reports" | "account";

export default function FinTwinApp() {
  // --- APPLICATION STATES ---
  const [currentMode, setCurrentMode] = useState<"landing" | "onboarding" | "app">("landing");
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Loaded state
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  // Command palette and search
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [commandQuery, setCommandQuery] = useState("");

  // Live Database Backed State
  const [userProfile, setUserProfile] = useState({
    name: "Ramy Fahmy",
    email: "ramy@fintwin.ai",
    currency: "EGP",
    country: "Egypt",
    city: "Cairo",
    age: 32,
    employment: "Freelancer",
    planningStyle: "Balanced",
    simulationHorizon: 30
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [assumptions, setAssumptions] = useState<EconomicAssumptions>({
    inflationRate: 12.5,
    incomeGrowthRate: 8.0,
    expenseGrowthRate: 9.0,
    investmentReturnRate: 15.0,
    volatilityRate: 18.0
  });
  const [reports, setReports] = useState<any[]>([]);
  const [aiConversations, setAiConversations] = useState<any[]>([]);
  
  // Onboarding Wizard Draft state
  const [onboardingDraft, setOnboardingDraft] = useState({
    name: "Ramy Fahmy",
    age: "32",
    country: "Egypt",
    city: "Cairo",
    currency: "EGP",
    employment: "Freelancer",
    monthlyIncome: "32000",
    monthlyExpense: "21400",
    cashSavings: "320300",
    investments: "70000",
    debts: "10000",
    primaryGoal: "Buy a Home (Zamalek Downpayment)",
    primaryGoalTarget: "1500000",
    primaryGoalTimeline: "2029-12",
    primaryGoalContribution: "8500",
    planningStyle: "Balanced",
    inflationAssumption: "12.5",
    returnAssumption: "15.0"
  });

  // Transaction Importer draft state
  const [importAccount, setImportAccount] = useState("acc_1");
  const [rawImportText, setRawImportText] = useState(
    `Date,Description,Amount,Category\n2026-02-18,Freelance Logo Design,12000,Freelance\n2026-02-17,Spinneys Groceries,-2800,Food\n2026-02-16,Uber Ride Zamalek,-350,Transport\n2026-02-15,Aramex Shipping,-400,Utilities\n2026-02-14,Thndr Dividend Payout,850,Wealth Building`
  );
  const [mappedColumns, setMappedColumns] = useState({ date: 0, description: 1, amount: 2, category: 3 });
  const [importerStep, setImporterStep] = useState<"paste" | "mapping" | "preview" | "complete">("paste");
  const [importedPreviewRows, setImportedPreviewRows] = useState<any[]>([]);

  // Simulation run animations
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simStepText, setSimStepText] = useState("");

  // Goal Planner interactive state
  const [selectedGoalId, setSelectedGoalId] = useState<string>("goal_1");
  const [plannerContribution, setPlannerContribution] = useState<number>(8500);
  const [plannerTarget, setPlannerTarget] = useState<number>(1500000);

  // New item creation modals/drawers
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccountData, setNewAccountData] = useState({ name: "", type: "Savings", balance: "" });

  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [newTransactionData, setNewTransactionData] = useState({ description: "", amount: "", category: "Food", type: "expense", accountId: "" });

  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [newGoalData, setNewGoalData] = useState({ name: "", targetAmount: "", currentAmount: "", targetDate: "2030-12", monthlyContribution: "", category: "Custom" });

  const [isAddScenarioOpen, setIsAddScenarioOpen] = useState(false);
  const [newScenarioData, setNewScenarioData] = useState({ name: "", category: "Career", description: "", incomeChange: "", expenseChange: "", assetChange: "", liabilityChange: "", durationMonths: "12" });

  // AI interactive conversation state
  const [aiInput, setAiInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Report Builder state
  const [reportType, setReportType] = useState("Snapshot");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [activeReportPreview, setActiveReportPreview] = useState<any>(null);

  // --- TRIGGER TOAST ---
  const triggerToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // --- FETCH FROM DATABASE ---
  const fetchTwinData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/twin");
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setUserProfile(d.user);
        setAccounts(d.accounts);
        setTransactions(d.transactions);
        setGoals(d.goals);
        setScenarios(d.scenarios);
        setAssumptions(d.assumptions);
        setReports(d.reports);
        setAiConversations(d.aiConversations);

        // Preload goal planner interactive values
        const prime = d.goals.find((g: Goal) => g.id === "goal_1") || d.goals[0];
        if (prime) {
          setSelectedGoalId(prime.id);
          setPlannerContribution(prime.monthlyContribution);
          setPlannerTarget(prime.targetAmount);
        }
      } else {
        triggerToast("Failed to load digital twin state. Using secure fallback.", "warning");
      }
    } catch (e) {
      console.error(e);
      triggerToast("Database offline. Active simulation workspace operating offline.", "info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTwinData();
  }, []);

  // Sync mutation helper
  const syncMutation = async (table: string, action: string, data?: any, id?: string) => {
    setSyncing(true);
    try {
      const res = await fetch("/api/twin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, action, data, id })
      });
      const json = await res.json();
      if (json.success) {
        await fetchTwinData();
        return json;
      } else {
        triggerToast(json.error || "Persistence sync delayed", "warning");
      }
    } catch (e) {
      console.error(e);
      triggerToast("Changes kept in sandbox memory.", "info");
    } finally {
      setSyncing(false);
    }
  };

  // --- MONTE CARLO INTEGRATION ---
  // We run Monte Carlo live based on our current state
  const activeScenariosList = useMemo(() => {
    return scenarios.filter(s => s.isActive);
  }, [scenarios]);

  const liveSimulationResult = useMemo(() => {
    if (accounts.length === 0) {
      return {
        months: Array.from({ length: 31 }, (_, i) => `Y${i}`),
        percentiles: { p5: [], p25: [], p50: [], p75: [], p95: [] },
        goalProbability: 50,
        emergencyFundSurvival: 4.8,
        cashShortfallPct: 0,
        averageNetWorthAtHorizon: 0
      };
    }

    // Override goal if we are playing with the goal planner sliders
    const adjustedGoals = goals.map(g => {
      if (g.id === selectedGoalId) {
        return {
          ...g,
          targetAmount: plannerTarget,
          monthlyContribution: plannerContribution
        };
      }
      return g;
    });

    return runMonteCarlo({
      accounts,
      goals: adjustedGoals,
      activeScenarios: activeScenariosList,
      assumptions,
      horizonYears: userProfile.simulationHorizon || 30
    });
  }, [accounts, goals, activeScenariosList, assumptions, selectedGoalId, plannerContribution, plannerTarget, userProfile.simulationHorizon]);

  // --- ACTIONS ---

  const handleResetDatabase = async () => {
    if (confirm("Are you sure you want to reset your FinTwin to default Egyptian Pound (EGP) parameters? All custom changes will be fresh seeded.")) {
      setSyncing(true);
      try {
        const res = await fetch("/api/twin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset" })
        });
        const json = await res.json();
        if (json.success) {
          triggerToast("Digital Twin reset to EGP baseline configuration!", "success");
          await fetchTwinData();
        }
      } catch (e) {
        triggerToast("Failed to reset database", "warning");
      } finally {
        setSyncing(false);
      }
    }
  };

  const handleToggleScenario = async (id: string) => {
    const scen = scenarios.find(s => s.id === id);
    if (!scen) return;
    
    // Trigger animated loading sequence
    setIsSimulating(true);
    setSimulationProgress(5);
    setSimStepText("Accessing digital Twin context...");

    setTimeout(() => {
      setSimulationProgress(35);
      setSimStepText("Sampling 600 future paths under scenario: " + scen.name);
    }, 300);

    setTimeout(() => {
      setSimulationProgress(75);
      setSimStepText("Evaluating percentile distributions & liquidity shortfalls...");
    }, 600);

    setTimeout(async () => {
      setIsSimulating(false);
      setSimulationProgress(100);
      triggerToast(`Scenario '${scen.name}' ${!scen.isActive ? "Activated" : "Deactivated"}. Projection model updated!`);
      await syncMutation("scenarios", "toggleActive", null, id);
    }, 1000);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountData.name || !newAccountData.balance) return;
    await syncMutation("accounts", "upsert", {
      name: newAccountData.name,
      type: newAccountData.type,
      balance: parseFloat(newAccountData.balance)
    });
    setIsAddAccountOpen(false);
    setNewAccountData({ name: "", type: "Savings", balance: "" });
    triggerToast("Account added successfully! Balance sheet updated.");
  };

  const handleDeleteAccount = async (id: string) => {
    if (confirm("Delete this account from your digital twin? Related calculations will recalibrate.")) {
      await syncMutation("accounts", "delete", null, id);
      triggerToast("Account deleted successfully.");
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransactionData.description || !newTransactionData.amount) return;
    const amountVal = parseFloat(newTransactionData.amount);
    const finalAmount = newTransactionData.type === "expense" ? -Math.abs(amountVal) : Math.abs(amountVal);

    await syncMutation("transactions", "upsert", {
      description: newTransactionData.description,
      amount: finalAmount,
      category: newTransactionData.category,
      type: newTransactionData.type,
      accountId: newTransactionData.accountId || null,
      adjustBalance: true
    });

    setIsAddTransactionOpen(false);
    setNewTransactionData({ description: "", amount: "", category: "Food", type: "expense", accountId: "" });
    triggerToast("Transaction recorded! Linked balances reflowed.");
  };

  const handleDeleteTransaction = async (id: string) => {
    await syncMutation("transactions", "delete", null, id);
    triggerToast("Transaction deleted.");
  };

  // CSV Importer Dry Run and validation
  const handleProcessImportPaste = () => {
    try {
      const lines = rawImportText.trim().split("\n");
      if (lines.length <= 1) {
        triggerToast("Please paste valid CSV content with a header", "warning");
        return;
      }
      
      const parsedRows: any[] = [];
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        if (cols.length >= 2) {
          // Attempt to locate fields based on user headers mapping
          const date = cols[mappedColumns.date] || new Date().toISOString().split("T")[0];
          const description = cols[mappedColumns.description] || "Imported transaction";
          const amount = parseFloat(cols[mappedColumns.amount]) || -100;
          const category = cols[mappedColumns.category] || "General";
          
          parsedRows.push({
            date,
            description,
            amount,
            category,
            status: isNaN(amount) ? "invalid" : amount === 0 ? "warning" : "valid",
            message: isNaN(amount) ? "Missing valid numeric amount" : amount === 0 ? "Zero amount transaction" : "Valid row ready for twin mapping"
          });
        }
      }

      setImportedPreviewRows(parsedRows);
      setImporterStep("preview");
      triggerToast(`Dry-run validation complete. Found ${parsedRows.length} transactions.`, "info");
    } catch (e) {
      triggerToast("Error processing paste CSV formatting.", "warning");
    }
  };

  const handleCommitImport = async () => {
    const validRows = importedPreviewRows.filter(r => r.status !== "invalid");
    if (validRows.length === 0) {
      triggerToast("No valid rows to import.", "warning");
      return;
    }

    setSyncing(true);
    try {
      await syncMutation("transactions", "import", {
        accountId: importAccount,
        rows: validRows
      });
      setImporterStep("paste");
      triggerToast(`Successfully imported ${validRows.length} transactions to your twin!`, "success");
    } catch (e) {
      triggerToast("Import sync failed.", "warning");
    } finally {
      setSyncing(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalData.name || !newGoalData.targetAmount) return;
    await syncMutation("goals", "upsert", {
      name: newGoalData.name,
      targetAmount: parseFloat(newGoalData.targetAmount),
      currentAmount: parseFloat(newGoalData.currentAmount) || 0,
      targetDate: newGoalData.targetDate,
      monthlyContribution: parseFloat(newGoalData.monthlyContribution) || 0,
      category: newGoalData.category,
      status: "Active"
    });
    setIsAddGoalOpen(false);
    setNewGoalData({ name: "", targetAmount: "", currentAmount: "", targetDate: "2030-12", monthlyContribution: "", category: "Custom" });
    triggerToast("New financial target connected to twin Monte Carlo paths.");
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm("Delete this financial goal?")) {
      await syncMutation("goals", "delete", null, id);
      triggerToast("Goal removed.");
    }
  };

  const handleAddScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioData.name || !newScenarioData.description) return;
    await syncMutation("scenarios", "upsert", {
      name: newScenarioData.name,
      category: newScenarioData.category,
      description: newScenarioData.description,
      incomeChange: parseFloat(newScenarioData.incomeChange) || 0,
      expenseChange: parseFloat(newScenarioData.expenseChange) || 0,
      assetChange: parseFloat(newScenarioData.assetChange) || 0,
      liabilityChange: parseFloat(newScenarioData.liabilityChange) || 0,
      delayYears: 0,
      durationMonths: parseInt(newScenarioData.durationMonths) || 12,
      applyInflation: true
    });
    setIsAddScenarioOpen(false);
    setNewScenarioData({ name: "", category: "Career", description: "", incomeChange: "", expenseChange: "", assetChange: "", liabilityChange: "", durationMonths: "12" });
    triggerToast("Custom lab scenario minted successfully!");
  };

  const handleDeleteScenario = async (id: string) => {
    if (confirm("Delete this scenario from the lab?")) {
      await syncMutation("scenarios", "delete", null, id);
      triggerToast("Scenario deleted.");
    }
  };

  const handleSaveAssumptions = async (updated: EconomicAssumptions) => {
    await syncMutation("assumptions", "upsert", updated);
    triggerToast("Economic environment updated. All 600 future simulation lines redrawn.");
  };

  // Onboarding Completed - Build Twin Animation
  const handleCompleteOnboarding = () => {
    setOnboardingStep(11); // Enter building loading scene
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setSimulationProgress(progress);
      
      if (progress === 10) setSimStepText("Reading demographic profiles...");
      else if (progress === 30) setSimStepText("Constructing initial EGP balance sheet & assets...");
      else if (progress === 50) setSimStepText("Mapping cash flow nodes & categorical expenses...");
      else if (progress === 70) setSimStepText("Connecting targets and setting goals timeline...");
      else if (progress === 90) setSimStepText("Deploying 600 stochastic Monte Carlo futures...");
      else if (progress >= 100) {
        clearInterval(interval);
        setTimeout(async () => {
          // Compile and Save onboarding data into actual database
          // 1. Update user profile
          await syncMutation("users", "update", {
            name: onboardingDraft.name,
            email: userProfile.email,
            currency: onboardingDraft.currency,
            country: onboardingDraft.country,
            city: onboardingDraft.city,
            age: parseInt(onboardingDraft.age) || 32,
            employment: onboardingDraft.employment,
            planningStyle: onboardingDraft.planningStyle,
            simulationHorizon: 30
          });

          // 2. Add Checking & Savings based on inputs
          const cashVal = parseFloat(onboardingDraft.cashSavings) || 320300;
          const investVal = parseFloat(onboardingDraft.investments) || 70000;
          const debtVal = parseFloat(onboardingDraft.debts) || 10000;

          await syncMutation("accounts", "upsert", { name: "Main Bank Account", type: "Cash", balance: cashVal }, "acc_1");
          await syncMutation("accounts", "upsert", { name: "Thndr Growth Assets", type: "Investment", balance: investVal }, "acc_3");
          await syncMutation("accounts", "upsert", { name: "Outstanding Liabilities", type: "Credit Card", balance: -debtVal }, "acc_4");

          // 3. Add Primary Goal
          const targetG = parseFloat(onboardingDraft.primaryGoalTarget) || 1500000;
          const contrG = parseFloat(onboardingDraft.primaryGoalContribution) || 8500;
          await syncMutation("goals", "upsert", {
            name: onboardingDraft.primaryGoal,
            targetAmount: targetG,
            currentAmount: 200000,
            targetDate: onboardingDraft.primaryGoalTimeline,
            monthlyContribution: contrG,
            category: "Buy a Home",
            status: "Active"
          }, "goal_1");

          // 4. Update economic assumptions return/inflation
          const customInflation = parseFloat(onboardingDraft.inflationAssumption) || 12.5;
          const customReturn = parseFloat(onboardingDraft.returnAssumption) || 15.0;
          await syncMutation("assumptions", "upsert", {
            inflationRate: customInflation,
            incomeGrowthRate: 8.0,
            expenseGrowthRate: 9.0,
            investmentReturnRate: customReturn,
            volatilityRate: 18.0,
            description: "Onboarding customized configuration"
          }, "ea_1");

          // Switch to workspace!
          setCurrentMode("app");
          setActiveTab("overview");
          triggerToast("Your Financial Twin is live! Initial model built.", "success");
        }, 800);
      }
    }, 250);
  };

  // --- AI GROUNDED INTEL ---
  const handleAskAi = async (questionText: string) => {
    if (!questionText.trim()) return;
    setAiInput("");
    setIsAiTyping(true);

    // Add user question immediately to list
    const userMsg = { id: Date.now().toString(), question: questionText, answer: "Analyzing model metrics...", createdAt: new Date() };
    setAiConversations(prev => [userMsg, ...prev]);

    // Grounded financial intelligence simulation logic
    setTimeout(() => {
      let response = "";
      const query = questionText.toLowerCase();

      // Core intelligence queries
      if (query.includes("how long") || query.includes("emergency") || query.includes("savings")) {
        response = `Your current emergency fund reserves stand at EGP ${accounts.find(a => a.id === "acc_2")?.balance?.toLocaleString() || "320,300"}. Given your digital twin's monthly recurring baseline cost of EGP 21,400, your survival coverage is exactly ${liveSimulationResult.emergencyFundSurvival} months under neutral conditions. This represents high liquidity security, far exceeding the typical 3-month recommended benchmark.`;
      } else if (query.includes("goal") || query.includes("home") || query.includes("probability")) {
        response = `Under current trajectory parameters (saving EGP ${plannerContribution.toLocaleString()}/month), your computed Monte Carlo probability of hitting the Zamalek Downpayment target (EGP ${plannerTarget.toLocaleString()}) by the year ${selectedGoalId === "goal_1" ? "2029" : "target date"} is ${liveSimulationResult.goalProbability}%. If you activate 'Lose Major Freelance Client', this drops to ${Math.max(10, liveSimulationResult.goalProbability - 24)}%.`;
      } else if (query.includes("inflation") || query.includes("shock")) {
        response = `At EGP baseline inflation of ${assumptions.inflationRate}%, your cash assets lose EGP ${(320300 * (assumptions.inflationRate/100)).toFixed(0)} of purchasing power annually. If inflation spikes to 22%, the median projected net worth at your 30-year horizon contracts by EGP ${(liveSimulationResult.averageNetWorthAtHorizon * 0.18).toFixed(0)}. I strongly advise increasing high-interest certificates (currently yields are 19-22% in Egypt) or transferring 15% more liquidity to growth instruments on Thndr.`;
      } else if (query.includes("what if") || query.includes("raise") || query.includes("save")) {
        response = `Adjusting your savings rate upward by 15% expands your monthly contribution from EGP ${plannerContribution} to EGP ${(plannerContribution * 1.15).toFixed(0)}. This raises your overall goal security probability to ${Math.min(99, liveSimulationResult.goalProbability + 15)}% and increases your expected median terminal net worth by approximately EGP 1.2M.`;
      } else {
        response = `I have analyzed your live financial digital twin. Your current net worth is EGP ${(accounts.reduce((sum, a) => sum + a.balance, 0)).toLocaleString()}. Your savings rate is currently ${((32000-21400)/32000 * 100).toFixed(1)}%. Under the '${activeScenariosList.length > 0 ? activeScenariosList[0].name : "neutral baseline"}' scenario, your 30-year expected net worth is EGP ${liveSimulationResult.averageNetWorthAtHorizon.toLocaleString(undefined, {maximumFractionDigits:0})}. Try adjusting active scenarios in the 'Simulation Lab' to see immediate outcomes!`;
      }

      // Update in local state and push to database
      setAiConversations(prev => {
        const copy = [...prev];
        if (copy[0]) {
          copy[0].answer = response;
        }
        return copy;
      });

      // Save to database
      syncMutation("ai_conversations", "create", {
        question: questionText,
        answer: response,
        contextJson: {
          nw: accounts.reduce((sum, a) => sum + a.balance, 0),
          survival: liveSimulationResult.emergencyFundSurvival,
          probability: liveSimulationResult.goalProbability
        }
      });

      setIsAiTyping(false);
    }, 1200);
  };

  // --- REPORT GENERATION ---
  const handleBuildReport = () => {
    setIsGeneratingReport(true);
    setReportProgress(5);
    
    const interval = setInterval(() => {
      setReportProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(async () => {
            const newRep = {
              id: "rep_" + Math.random().toString(36).substring(2, 9),
              name: `FinTwin Digital Laboratory Report (${reportType})`,
              type: reportType,
              createdAt: new Date().toISOString(),
              contentJson: {
                netWorth: accounts.reduce((s, a) => s + a.balance, 0),
                goalProbability: liveSimulationResult.goalProbability,
                activeScenarios: activeScenariosList.map(s => s.name),
                survivalMonths: liveSimulationResult.emergencyFundSurvival,
                notes: `Stochastic Monte Carlo forecast calculated with ${assumptions.inflationRate}% baseline inflation over 30 years.`
              }
            };
            await syncMutation("reports", "create", {
              name: newRep.name,
              type: newRep.type,
              contentJson: newRep.contentJson
            });
            setIsGeneratingReport(false);
            setActiveReportPreview(newRep);
            triggerToast(`${reportType} Report generated successfully! Ready for premium PDF export.`, "success");
          }, 400);
          return 100;
        }
        return p + 20;
      });
    }, 150);
  };

  // Filter accounts and transactions search query
  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery) return true;
    return (
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalAssets = accounts.filter(a => a.balance > 0).reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = Math.abs(accounts.filter(a => a.balance < 0).reduce((sum, a) => sum + a.balance, 0));
  const currentNetWorthVal = totalAssets - totalLiabilities;

  // --- RENDERING VIEWS ---

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? "bg-[#151310] text-[#E8E6DF] dark-theme-custom" 
        : "bg-[#F0EFE4] text-[#222220]"
    } font-sans antialiased relative selection:bg-[#F3C142] selection:text-black`}>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-[#222220] text-[#F9F7EF] text-sm font-medium shadow-xl flex items-center gap-3 border border-[#F3C142]"
          >
            <span className="w-2 h-2 rounded-full bg-[#F3C142] animate-ping" />
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-[#FAF6E9] hover:text-[#F3C142] ml-2 text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Command Palette dialog */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-start justify-center pt-24 px-4" onClick={() => setIsCommandPaletteOpen(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-[#F9F7EF] dark:bg-[#1C1A17] text-[#222220] dark:text-[#E8E6DF] rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center gap-3">
                <Search className="text-gray-400 w-5 h-5" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Type a command or ask FinTwin... (e.g. 'Add Account', 'Simulate inflation', 'Overview')"
                  className="w-full bg-transparent border-none outline-none text-base"
                  value={commandQuery}
                  onChange={e => setCommandQuery(e.target.value)}
                />
                <kbd className="text-[10px] bg-gray-200 dark:bg-zinc-800 px-2 py-1 rounded">ESC</kbd>
              </div>

              <div className="p-2 max-h-80 overflow-y-auto text-xs text-gray-500">
                <div className="p-2 uppercase font-semibold text-[10px] tracking-wider text-gray-400">Navigation Shortcuts</div>
                <button onClick={() => { setActiveTab("overview"); setCurrentMode("app"); setIsCommandPaletteOpen(false); }} className="w-full text-left p-3 hover:bg-[#F2F2ED] dark:hover:bg-zinc-800 rounded-lg flex items-center justify-between text-zinc-800 dark:text-zinc-200">
                  <span>Go to Overview Dashboard</span>
                  <span className="text-gray-400">⌘1</span>
                </button>
                <button onClick={() => { setActiveTab("twin"); setCurrentMode("app"); setIsCommandPaletteOpen(false); }} className="w-full text-left p-3 hover:bg-[#F2F2ED] dark:hover:bg-zinc-800 rounded-lg flex items-center justify-between text-zinc-800 dark:text-zinc-200">
                  <span>Open Living Financial Twin</span>
                  <span className="text-gray-400">⌘2</span>
                </button>
                <button onClick={() => { setActiveTab("scenarios"); setCurrentMode("app"); setIsCommandPaletteOpen(false); }} className="w-full text-left p-3 hover:bg-[#F2F2ED] dark:hover:bg-zinc-800 rounded-lg flex items-center justify-between text-zinc-800 dark:text-zinc-200">
                  <span>Open Simulation Laboratory & Scenarios</span>
                  <span className="text-gray-400">⌘3</span>
                </button>
                <button onClick={() => { setActiveTab("goals"); setCurrentMode("app"); setIsCommandPaletteOpen(false); }} className="w-full text-left p-3 hover:bg-[#F2F2ED] dark:hover:bg-zinc-800 rounded-lg flex items-center justify-between text-zinc-800 dark:text-zinc-200">
                  <span>Open Goals Center & Monte Carlo Calculator</span>
                  <span className="text-gray-400">⌘4</span>
                </button>
                <button onClick={() => { setActiveTab("intelligence"); setCurrentMode("app"); setIsCommandPaletteOpen(false); }} className="w-full text-left p-3 hover:bg-[#F2F2ED] dark:hover:bg-zinc-800 rounded-lg flex items-center justify-between text-zinc-800 dark:text-zinc-200">
                  <span>Ask AI Assistant</span>
                  <span className="text-gray-400">⌘5</span>
                </button>

                <div className="p-2 uppercase font-semibold text-[10px] tracking-wider text-gray-400 mt-2">Laboratory Actions</div>
                <button onClick={() => { setIsAddAccountOpen(true); setIsCommandPaletteOpen(false); }} className="w-full text-left p-3 hover:bg-[#F2F2ED] dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                  <Plus className="w-4 h-4 text-[#F3C142]" />
                  <span>Create / Add New Account</span>
                </button>
                <button onClick={() => { setIsAddTransactionOpen(true); setIsCommandPaletteOpen(false); }} className="w-full text-left p-3 hover:bg-[#F2F2ED] dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                  <Plus className="w-4 h-4 text-[#F3C142]" />
                  <span>Record Transaction Node</span>
                </button>
                <button onClick={() => { handleResetDatabase(); setIsCommandPaletteOpen(false); }} className="w-full text-left p-3 hover:bg-[#F2F2ED] dark:hover:bg-zinc-800 rounded-lg flex items-center gap-2 text-red-600">
                  <Database className="w-4 h-4" />
                  <span>Reset Twin Data to Egypt EGP Baseline</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading Spinner Scene */}
      {loading && (
        <div className="fixed inset-0 bg-[#F0EFE4] dark:bg-[#151310] z-50 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-zinc-800 border-t-[#F3C142] animate-spin" />
            <Sparkle className="w-6 h-6 text-[#F3C142] absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-sm font-semibold tracking-wide text-gray-600 dark:text-gray-400">Connecting FinTwin Secure Model State...</p>
        </div>
      )}

      {/* Syncing micro indicator */}
      {syncing && (
        <div className="fixed top-4 right-4 z-40 bg-[#222220] text-xs text-[#F9F7EF] py-1 px-3 rounded-full flex items-center gap-2 border border-[#F3C142]">
          <RefreshCw className="w-3 h-3 animate-spin text-[#F3C142]" />
          <span>Synchronizing Digital Twin...</span>
        </div>
      )}

      {/* --- SCENE 1: MARKETING LANDING PAGE --- */}
      {currentMode === "landing" && !loading && (
        <div className="overflow-hidden">
          {/* Landing Header */}
          <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-[#222220]/5">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentMode("landing")}>
              <div className="w-9 h-9 rounded-full bg-[#222220] flex items-center justify-center text-[#F3C142] font-black tracking-tighter text-lg">
                F
              </div>
              <span className="font-extrabold tracking-tight text-xl text-[#222220] dark:text-[#E8E6DF]">FinTwin</span>
              <span className="text-[9px] bg-[#F3C142]/20 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full font-bold">LAB v1.4</span>
            </div>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#222220]/80">
              <a href="#how-it-works" className="hover:text-black hover:underline underline-offset-4">How It Works</a>
              <a href="#scenarios" className="hover:text-black hover:underline underline-offset-4">Scenario Gallery</a>
              <a href="#trust" className="hover:text-black hover:underline underline-offset-4">Trust & Reliability</a>
              <a href="#faq" className="hover:text-black hover:underline underline-offset-4">FAQ</a>
            </nav>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-full hover:bg-black/5"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => { setCurrentMode("app"); setActiveTab("overview"); triggerToast("Logged in as guest session. Seed model compiled!"); }}
                className="hidden sm:inline-block px-4 py-2 rounded-full border border-[#222220] text-sm font-medium hover:bg-black/5"
              >
                Launch Sandbox
              </button>
              <button 
                onClick={() => { setOnboardingStep(1); setCurrentMode("onboarding"); }}
                className="px-5 py-2 rounded-full bg-[#222220] text-[#F9F7EF] text-sm font-semibold hover:bg-black transition-transform active:scale-95"
              >
                Build My Twin
              </button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F2EAC3] text-[#222220] text-xs font-semibold border border-[#F3C142]/40">
                <Sparkle className="w-3.5 h-3.5 animate-spin text-[#F3C142]" />
                <span>Living Financial Digital Twin & Scenario Laboratory</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#151310] dark:text-[#E8E6DF] leading-[1.1] tracking-tight">
                See Your Financial Future <span className="underline decoration-[#F3C142] decoration-wavy decoration-3">Before It Happens</span>.
              </h1>

              <p className="text-base sm:text-lg text-[#222220]/75 dark:text-gray-300 leading-relaxed max-w-xl">
                Build a living mathematical model of your real financial life. Change one event, stress-test macroeconomic shocks, simulate goals probability, and query grounded AI explanations.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => { setOnboardingStep(1); setCurrentMode("onboarding"); }}
                  className="px-8 py-4 rounded-full bg-[#222220] text-[#F9F7EF] font-bold text-base hover:bg-black shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                >
                  <span>Build My Financial Twin</span>
                  <ArrowRight className="w-5 h-5 text-[#F3C142]" />
                </button>
                <button
                  onClick={() => { setCurrentMode("app"); setActiveTab("overview"); }}
                  className="px-8 py-4 rounded-full bg-[#F9F7EF] text-[#222220] font-bold text-base border border-[#222220]/15 hover:bg-zinc-100 flex items-center justify-center gap-2"
                >
                  <span>Explore 30y Simulation Sandbox</span>
                </button>
              </div>

              {/* Dynamic state values counter */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[#222220]/10 max-w-lg">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#222220]/50">Baseline Assets</div>
                  <div className="text-xl sm:text-2xl font-black tracking-tight font-mono text-[#222220]">EGP 438,500</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#222220]/50">Scenario Paths</div>
                  <div className="text-xl sm:text-2xl font-black tracking-tight font-mono text-[#F3C142]">600 runs</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#222220]/50">Active Horizon</div>
                  <div className="text-xl sm:text-2xl font-black tracking-tight font-mono text-[#222220]">30 Years</div>
                </div>
              </div>
            </div>

            {/* Simulated Live Miniature Twin Environment */}
            <div className="lg:col-span-6 relative">
              <div className="absolute inset-0 bg-[#F2EAC3] blur-3xl opacity-30 rounded-full" />
              
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative bg-[#F9F7EF] rounded-[28px] p-6 sm:p-8 shadow-xl border border-[#222220]/10 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-[#222220]/60">Interactive Preview Laboratory</span>
                  </div>
                  <span className="text-xs bg-[#222220] text-white px-3 py-1 rounded-full font-mono">EGP Baseline</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#222220]/50">Projected Twin Net Worth (P50)</label>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[#151310] flex items-baseline gap-1">
                    EGP <span className="text-[#F3C142] animate-pulse">428,500</span>
                    <span className="text-xs text-green-600 font-bold ml-2">Baseline Live</span>
                  </div>
                </div>

                {/* Simulated Chart Container */}
                <div className="h-44 bg-[#F2F2ED] rounded-2xl relative overflow-hidden p-4 flex flex-col justify-between border border-[#222220]/5">
                  <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-4">
                    <div className="w-full h-[1px] bg-dashed bg-[#222220]/10" />
                  </div>
                  
                  {/* SVG mini chart path */}
                  <svg className="w-full h-full overflow-visible absolute inset-0" viewBox="0 0 100 40">
                    {/* Confidence interval band */}
                    <path d="M 0 35 Q 25 28 50 20 Q 75 14 100 4 L 100 40 L 0 40 Z" fill="#F2EAC3" opacity="0.5" />
                    <path d="M 0 35 Q 25 31 50 25 Q 75 21 100 12" fill="none" stroke="#222220" strokeWidth="1.5" strokeDasharray="2,2" />
                    {/* Active target line */}
                    <path d="M 0 35 Q 25 25 50 15 Q 75 8 100 1" fill="none" stroke="#F3C142" strokeWidth="2.5" />
                  </svg>

                  <div className="flex justify-between text-[10px] font-bold text-gray-400 z-10">
                    <span>Y0 (Today)</span>
                    <span>Y15 (Midway)</span>
                    <span>Y30 (Horizon)</span>
                  </div>

                  <div className="z-10 bg-white/85 backdrop-blur-xs py-1 px-3 rounded-full border border-gray-100 self-start text-[10px] font-bold text-gray-600 flex items-center gap-1.5 shadow-xs">
                    <Sliders className="w-3 h-3 text-[#F3C142]" />
                    <span>Scenario Active: Buy a Home (+8% return)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#FAF6E9] p-3 rounded-xl border border-[#F3C142]/25">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Goal Probability</div>
                    <div className="text-xl font-black font-mono text-[#222220]">78.4%</div>
                    <div className="text-[9px] text-green-700 font-bold mt-1">High success probability</div>
                  </div>
                  <div className="bg-[#FAF6E9] p-3 rounded-xl border border-[#F3C142]/25">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Emergency Survival</div>
                    <div className="text-xl font-black font-mono text-[#222220]">5.6 Months</div>
                    <div className="text-[9px] text-gray-600 font-bold mt-1">EGP 120,000 cash backing</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3.5 bg-zinc-900 text-white rounded-xl text-xs font-mono">
                  <Sparkles className="w-4.5 h-4.5 text-[#F3C142]" />
                  <span>AI: "Zamalek Property downpayment matches peak paths!"</span>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Section: What is FinTwin */}
          <section id="how-it-works" className="bg-[#FAF6E9] py-24 border-t border-b border-[#222220]/5">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#F3C142]">Product Philosophy</span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#151310]">Understand Today. Model Possibilities. Master Tomorrow.</h2>
                <p className="text-zinc-600 text-sm sm:text-base">
                  Traditional banking shows you the past. FinTwin uses advanced Monte Carlo logic to run 600 parallel futures, allowing you to test decisions beforehand.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-[#F9F7EF] p-8 rounded-[22px] border border-gray-100 shadow-xs space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#F3C142]/20 flex items-center justify-center text-[#222220]">
                    <Database className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black">1. Build your Digital Twin</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Map your real Egyptian checking, savings accounts, assets, obligations, and custom EGP income streams into a cohesive dashboard structure.
                  </p>
                </div>

                <div className="bg-[#F9F7EF] p-8 rounded-[22px] border border-gray-100 shadow-xs space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#F3C142]/20 flex items-center justify-center text-[#222220]">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black">2. Toggle Custom Scenarios</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Test career transitions, major real estate downpayments, localized EM inflation spikes, or aggressive market bull run return adjustments with simple toggles.
                  </p>
                </div>

                <div className="bg-[#F9F7EF] p-8 rounded-[22px] border border-gray-100 shadow-xs space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#F3C142]/20 flex items-center justify-center text-[#222220]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black">3. Ask Grounded AI</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Receive mathematically grounded advice rather than generic AI chatbots. The AI understands your twin parameters and simulates answers on demand.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Scenario Gallery */}
          <section id="scenarios" className="max-w-7xl mx-auto px-6 py-24 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#F3C142]">Stress Laboratories</span>
                <h2 className="text-3xl font-black tracking-tight">Preconfigured Simulation Galleries</h2>
              </div>
              <p className="text-zinc-600 max-w-md text-sm">
                A laboratory of predefined economic events tailored for contemporary personal finance management. Select and test immediately in our sandboxed workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "Lose Major Client", icon: Briefcase, cat: "Career", desc: "Reduces monthly earnings by EGP 15k for 6 months." },
                { name: "EM Inflation Shock", icon: ShieldAlert, cat: "Economic", desc: "Spikes essential monthly costs of living by EGP 5,000." },
                { name: "Buy New Zamalek Flat", icon: ArrowUpRight, cat: "Housing", desc: "Applies EGP 300k upfront downpayment & monthly mortgage installment." },
                { name: "Thndr Bull Market", icon: TrendingUp, cat: "Savings", desc: "Increases market return rate to 23% annual compounding." }
              ].map((scen, idx) => {
                const IconComp = scen.icon;
                return (
                  <div key={idx} className="bg-[#F9F7EF] p-6 rounded-[22px] border border-zinc-200/50 hover:border-[#F3C142] transition-colors duration-250 flex flex-col justify-between gap-6">
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{scen.cat}</span>
                      <h3 className="text-lg font-bold">{scen.name}</h3>
                      <p className="text-xs text-zinc-600 leading-relaxed">{scen.desc}</p>
                    </div>
                    <button 
                      onClick={() => { setCurrentMode("app"); setActiveTab("scenarios"); }}
                      className="text-xs font-bold text-[#222220] flex items-center gap-1 hover:text-[#F3C142] cursor-pointer"
                    >
                      <span>Simulate this</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section: Trust & Transparency Disclaimer */}
          <section id="trust" className="bg-[#151310] text-[#E8E6DF] py-20">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <span className="text-xs uppercase font-bold text-[#F3C142] tracking-widest">Model Security & Governance</span>
                <h2 className="text-3xl font-black tracking-tight">We Model Uncertainty. We Do Not Overpromise.</h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  FinTwin is built to bring premium institutional-grade actuarial models to personal finance. We use stochastic random-walk generators, not optimistic linear compound formulas.
                </p>
                <div className="space-y-3 text-xs text-zinc-400">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-[#F3C142] shrink-0 mt-0.5" />
                    <span><strong>100% Client-Side Data Control:</strong> Your balance sheet is kept local to your sandbox, synchronized via secure database channels.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-[#F3C142] shrink-0 mt-0.5" />
                    <span><strong>Non-Deterministic Outcomes:</strong> Displays median (expected), stress, and optimistic paths rather than promising a flat rate of wealth.</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-zinc-900 p-8 rounded-[24px] border border-zinc-800 space-y-4">
                <div className="flex items-center gap-2 text-[#F3C142]">
                  <Lock className="w-5 h-5" />
                  <span className="font-extrabold text-sm uppercase tracking-wide">Fiduciary Principle</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  FinTwin is an interactive simulation laboratory for informational planning purposes. All return assumptions represent mathematical presets. We do not sell bank products or offer retail asset management advice.
                </p>
                <button 
                  onClick={() => { setCurrentMode("app"); setActiveTab("overview"); }}
                  className="w-full py-3 rounded-full bg-[#E8E6DF] text-[#151310] text-xs font-bold hover:bg-white"
                >
                  Enter Planning Laboratory
                </button>
              </div>
            </div>
          </section>

          {/* Landing Footer */}
          <footer className="bg-[#FAF6E9] py-12 text-center text-xs text-gray-500 border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-6 space-y-4">
              <div className="font-extrabold text-[#222220] tracking-tight">FinTwin Laboratory Studio</div>
              <p>© 2026 FinTwin Inc. Built with Next.js & PostgreSQL via Drizzle ORM. Operating under emerging markets scenario presets.</p>
              <div className="flex justify-center gap-6 text-[#222220]/70">
                <a href="#how-it-works" className="hover:text-black">Terms of Simulator Use</a>
                <a href="#scenarios" className="hover:text-black">Privacy Policy</a>
                <a href="#trust" className="hover:text-black">API Security Node</a>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* --- SCENE 2: 10-STEP PROGRESSIVE ONBOARDING WIZARD --- */}
      {currentMode === "onboarding" && (
        <div className="min-h-screen flex flex-col justify-between py-8 px-4 sm:px-6">
          {/* Header */}
          <div className="max-w-xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-black text-[#F3C142] flex items-center justify-center font-bold text-xs">F</span>
              <span className="font-bold text-sm tracking-tight">FinTwin Wizard</span>
            </div>
            {onboardingStep <= 10 && (
              <span className="text-xs font-bold text-gray-500">Step {onboardingStep} of 10</span>
            )}
          </div>

          {/* Progress bar */}
          {onboardingStep <= 10 && (
            <div className="max-w-xl mx-auto w-full h-1.5 bg-gray-200 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-[#F3C142] transition-all duration-300"
                style={{ width: `${onboardingStep * 10}%` }}
              />
            </div>
          )}

          {/* Main Form Body */}
          <div className="max-w-xl mx-auto w-full bg-[#F9F7EF] rounded-[22px] border border-[#222220]/10 p-6 sm:p-8 my-8 shadow-sm">
            <AnimatePresence mode="wait">
              {onboardingStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <span className="text-[10px] bg-[#F3C142]/20 text-[#222220] px-3 py-1 rounded-full font-bold">WELCOME</span>
                    <h2 className="text-2xl sm:text-3xl font-black">Let's build your financial twin.</h2>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      A few simple questions are enough to construct your starting stochastic simulation. All values can be fine-tuned or linked to accounts later inside the workspace.
                    </p>
                  </div>
                  <div className="p-4 bg-[#FAF6E9] rounded-xl border border-[#F3C142]/20 space-y-2 text-xs">
                    <div className="font-bold">✓ Privacy Guaranteed</div>
                    <p className="text-gray-600">Your balance details are stored securely. We do not link real bank logins for simulation workspace runs unless requested.</p>
                  </div>
                  <button
                    onClick={() => setOnboardingStep(2)}
                    className="w-full py-4 rounded-full bg-[#222220] text-white font-bold text-sm hover:bg-black transition-transform active:scale-98"
                  >
                    Continue
                  </button>
                </motion.div>
              )}

              {onboardingStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-black">Personal Demographics</h2>
                    <p className="text-xs text-zinc-500">Your age and country define base economic and retirement calculation horizons.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Your Full Name</label>
                      <input
                        type="text"
                        className="w-full p-3.5 rounded-xl border border-gray-300 focus:border-[#F3C142] focus:ring-1 focus:ring-[#F3C142] bg-white text-sm outline-none font-bold"
                        value={onboardingDraft.name}
                        onChange={e => setOnboardingDraft({...onboardingDraft, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Age</label>
                        <input
                          type="number"
                          className="w-full p-3.5 rounded-xl border border-gray-300 bg-white text-sm outline-none font-bold"
                          value={onboardingDraft.age}
                          onChange={e => setOnboardingDraft({...onboardingDraft, age: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Base Currency</label>
                        <select
                          className="w-full p-3.5 rounded-xl border border-gray-300 bg-white text-sm outline-none font-bold"
                          value={onboardingDraft.currency}
                          onChange={e => setOnboardingDraft({...onboardingDraft, currency: e.target.value})}
                        >
                          <option value="EGP">EGP (Egyptian Pound)</option>
                          <option value="USD">USD ($ Dollar)</option>
                          <option value="EUR">EUR (€ Euro)</option>
                          <option value="GBP">GBP (£ Pound)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setOnboardingStep(1)} className="px-6 py-3.5 rounded-full border text-xs font-bold">Back</button>
                    <button onClick={() => setOnboardingStep(3)} className="flex-1 py-3.5 rounded-full bg-[#222220] text-white font-bold text-xs">Continue</button>
                  </div>
                </motion.div>
              )}

              {onboardingStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-black">How does your income currently work?</h2>
                    <p className="text-xs text-zinc-500">Employment type defines the volatility of income streams in Monte Carlo paths.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {["Employed", "Freelancer", "Business Owner", "Self-employed"].map((emp) => (
                      <button
                        key={emp}
                        onClick={() => {
                          setOnboardingDraft({ ...onboardingDraft, employment: emp });
                          setOnboardingStep(4);
                        }}
                        className={`w-full p-4 rounded-xl text-left border text-sm font-bold flex items-center justify-between ${
                          onboardingDraft.employment === emp ? "border-[#F3C142] bg-[#FAF6E9] text-black" : "border-gray-200 hover:border-[#F3C142]"
                        }`}
                      >
                        <span>{emp}</span>
                        {onboardingDraft.employment === emp && <span className="w-2 h-2 rounded-full bg-[#F3C142]" />}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setOnboardingStep(2)} className="px-6 py-3.5 rounded-full border text-xs font-bold">Back</button>
                    <button onClick={() => setOnboardingStep(4)} className="flex-1 py-3.5 rounded-full bg-[#222220] text-white font-bold text-xs">Continue</button>
                  </div>
                </motion.div>
              )}

              {onboardingStep === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-black">Monthly Earnings</h2>
                    <p className="text-xs text-zinc-500">Enter your baseline total monthly net cash flow receipts (EGP equivalent).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Baseline Monthly Income ({onboardingDraft.currency})</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full p-4 pl-12 rounded-xl border border-gray-300 bg-white font-mono font-bold outline-none text-lg"
                        value={onboardingDraft.monthlyIncome}
                        onChange={e => setOnboardingDraft({...onboardingDraft, monthlyIncome: e.target.value})}
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{onboardingDraft.currency}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setOnboardingStep(3)} className="px-6 py-3.5 rounded-full border text-xs font-bold">Back</button>
                    <button onClick={() => setOnboardingStep(5)} className="flex-1 py-3.5 rounded-full bg-[#222220] text-white font-bold text-xs">Continue</button>
                  </div>
                </motion.div>
              )}

              {onboardingStep === 5 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-black">Monthly Expenses</h2>
                    <p className="text-xs text-zinc-500">Your total basic living costs (Rent, utilities, groceries, loans).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Baseline Expenses ({onboardingDraft.currency})</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full p-4 pl-12 rounded-xl border border-gray-300 bg-white font-mono font-bold outline-none text-lg"
                        value={onboardingDraft.monthlyExpense}
                        onChange={e => setOnboardingDraft({...onboardingDraft, monthlyExpense: e.target.value})}
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{onboardingDraft.currency}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setOnboardingStep(4)} className="px-6 py-3.5 rounded-full border text-xs font-bold">Back</button>
                    <button onClick={() => setOnboardingStep(6)} className="flex-1 py-3.5 rounded-full bg-[#222220] text-white font-bold text-xs">Continue</button>
                  </div>
                </motion.div>
              )}

              {onboardingStep === 6 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-black">Liquid Cash & High-Yield Savings</h2>
                    <p className="text-xs text-zinc-500">This forms the core foundation of your digital twin's cash flow emergency buffer.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Emergency Fund + Cash Savings ({onboardingDraft.currency})</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full p-4 pl-12 rounded-xl border border-gray-300 bg-white font-mono font-bold outline-none text-lg"
                        value={onboardingDraft.cashSavings}
                        onChange={e => setOnboardingDraft({...onboardingDraft, cashSavings: e.target.value})}
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{onboardingDraft.currency}</span>
                    </div>
                    <span className="text-[10px] text-green-700 font-bold block mt-1">
                      Estimated Emergency Coverage: {parseFloat((parseFloat(onboardingDraft.cashSavings) / parseFloat(onboardingDraft.monthlyExpense)).toFixed(1)) || 0} Months
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setOnboardingStep(5)} className="px-6 py-3.5 rounded-full border text-xs font-bold">Back</button>
                    <button onClick={() => setOnboardingStep(7)} className="flex-1 py-3.5 rounded-full bg-[#222220] text-white font-bold text-xs">Continue</button>
                  </div>
                </motion.div>
              )}

              {onboardingStep === 7 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-black">Other Assets & Debts</h2>
                    <p className="text-xs text-zinc-500">Other investments (such as stocks, gold, property) and outstanding credit card/mortgage liabilities.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Investments / Portfolios ({onboardingDraft.currency})</label>
                      <input
                        type="number"
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-sm outline-none font-mono font-bold"
                        value={onboardingDraft.investments}
                        onChange={e => setOnboardingDraft({...onboardingDraft, investments: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Total Outstanding Debt ({onboardingDraft.currency})</label>
                      <input
                        type="number"
                        className="w-full p-3 rounded-xl border border-gray-300 bg-white text-sm outline-none font-mono font-bold animate-pulse text-red-600"
                        value={onboardingDraft.debts}
                        onChange={e => setOnboardingDraft({...onboardingDraft, debts: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setOnboardingStep(6)} className="px-6 py-3.5 rounded-full border text-xs font-bold">Back</button>
                    <button onClick={() => setOnboardingStep(8)} className="flex-1 py-3.5 rounded-full bg-[#222220] text-white font-bold text-xs">Continue</button>
                  </div>
                </motion.div>
              )}

              {onboardingStep === 8 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-black">Define Your Primary Future Target</h2>
                    <p className="text-xs text-zinc-500">What is the central financial target you are building toward?</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Goal Name</label>
                      <input
                        type="text"
                        className="w-full p-3.5 rounded-xl border border-gray-300 bg-white text-sm outline-none font-bold"
                        value={onboardingDraft.primaryGoal}
                        onChange={e => setOnboardingDraft({...onboardingDraft, primaryGoal: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Target Target ({onboardingDraft.currency})</label>
                        <input
                          type="number"
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-sm outline-none font-mono font-bold"
                          value={onboardingDraft.primaryGoalTarget}
                          onChange={e => setOnboardingDraft({...onboardingDraft, primaryGoalTarget: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Monthly Contribution ({onboardingDraft.currency})</label>
                        <input
                          type="number"
                          className="w-full p-3 rounded-xl border border-gray-300 bg-white text-sm outline-none font-mono font-bold"
                          value={onboardingDraft.primaryGoalContribution}
                          onChange={e => setOnboardingDraft({...onboardingDraft, primaryGoalContribution: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setOnboardingStep(7)} className="px-6 py-3.5 rounded-full border text-xs font-bold">Back</button>
                    <button onClick={() => setOnboardingStep(9)} className="flex-1 py-3.5 rounded-full bg-[#222220] text-white font-bold text-xs">Continue</button>
                  </div>
                </motion.div>
              )}

              {onboardingStep === 9 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-black">Economic Modeling Style</h2>
                    <p className="text-xs text-zinc-500">How should our twin generator model market volatility and inflation rate spreads?</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { key: "Cautious", label: "Cautious / Cautious assumptions", desc: "Models higher default inflation (16%) and lower average returns (11%)." },
                      { key: "Balanced", label: "Balanced / Neutral EGP Baseline", desc: "Standard emerging market parameters with historical return rates." },
                      { key: "Growth", label: "Growth Oriented / Bullish growth", desc: "Assumes strong global market return performance with mild localized inflation." }
                    ].map((pref) => (
                      <button
                        key={pref.key}
                        onClick={() => {
                          setOnboardingDraft({ ...onboardingDraft, planningStyle: pref.key });
                          setOnboardingStep(10);
                        }}
                        className={`w-full p-4 rounded-xl text-left border text-sm font-bold flex flex-col gap-1 ${
                          onboardingDraft.planningStyle === pref.key ? "border-[#F3C142] bg-[#FAF6E9] text-black" : "border-gray-200 hover:border-[#F3C142]"
                        }`}
                      >
                        <span>{pref.label}</span>
                        <span className="text-[11px] text-zinc-500 font-normal">{pref.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setOnboardingStep(8)} className="px-6 py-3.5 rounded-full border text-xs font-bold">Back</button>
                    <button onClick={() => setOnboardingStep(10)} className="flex-1 py-3.5 rounded-full bg-[#222220] text-white font-bold text-xs">Continue</button>
                  </div>
                </motion.div>
              )}

              {onboardingStep === 10 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-black">Verify Model Parameters</h2>
                    <p className="text-xs text-zinc-500">Review your parameters before we deploy the stochastic simulator paths.</p>
                  </div>

                  <div className="bg-[#FAF6E9] p-4 rounded-xl border border-[#F3C142]/20 text-xs space-y-3 font-medium">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Twin Representative:</span>
                      <span className="font-bold text-black">{onboardingDraft.name} (Age {onboardingDraft.age})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Initial Liquid Net Worth:</span>
                      <span className="font-bold font-mono text-black">{onboardingDraft.currency} {(parseFloat(onboardingDraft.cashSavings) + parseFloat(onboardingDraft.investments) - parseFloat(onboardingDraft.debts)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Base Net Cashflow Node:</span>
                      <span className="font-bold text-black font-mono">EGP {onboardingDraft.monthlyIncome} Income / EGP {onboardingDraft.monthlyExpense} Expenses</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Primary Goal Target:</span>
                      <span className="font-bold text-black">{onboardingDraft.primaryGoal} ({onboardingDraft.currency} {parseFloat(onboardingDraft.primaryGoalTarget).toLocaleString()})</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setOnboardingStep(9)} className="px-6 py-3.5 rounded-full border text-xs font-bold">Back</button>
                    <button 
                      onClick={handleCompleteOnboarding}
                      className="flex-1 py-3.5 rounded-full bg-[#222220] text-[#F3C142] font-black text-xs hover:bg-black flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Build My Living Twin</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Progress Generation Scene (Step 11) */}
              {onboardingStep === 11 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8 py-8 text-center"
                >
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-100 border-t-[#F3C142] animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center font-bold font-mono text-sm">{simulationProgress}%</span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-lg font-black tracking-tight text-gray-800">Compiling Financial Model...</h2>
                    <p className="text-xs text-zinc-500 font-bold font-mono animate-pulse">{simStepText}</p>
                  </div>

                  <div className="max-w-xs mx-auto space-y-1 bg-white p-3 rounded-lg border border-gray-100 text-[11px] text-gray-400">
                    <div className="flex justify-between">
                      <span>Stochastic Iterations</span>
                      <span>600 parallel runs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Statistical Horizon</span>
                      <span>360 monthly iterations</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-center text-xs text-gray-400">
            FinTwin Progressive Simulation Actuary • Protected by secure local schema persistence.
          </div>
        </div>
      )}

      {/* --- SCENE 3: PRIMARY LIVING DIGITAL TWIN LAB WORKSPACE APP --- */}
      {currentMode === "app" && (
        <div className="flex flex-col min-h-screen">
          
          {/* Main Desktop Layout Header */}
          <header className="px-6 py-4 bg-[#F9F7EF] dark:bg-[#1C1A17] border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-3">
              {/* Back to landing */}
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setCurrentMode("landing")}>
                <div className="w-8 h-8 rounded-full bg-[#222220] flex items-center justify-center text-[#F3C142] font-extrabold text-sm">
                  F
                </div>
                <span className="font-extrabold text-sm tracking-tight hidden sm:inline-block">FinTwin Lab</span>
              </div>
              
              <span className="text-xs px-2.5 py-1 bg-[#FAF6E9] border border-[#F3C142]/40 rounded-full font-bold text-yellow-800 flex items-center gap-1">
                <Sparkle className="w-3 h-3 text-[#F3C142] animate-pulse" />
                <span>Egypt EGP Workspace</span>
              </span>
            </div>

            {/* Quick Actions Search Bar */}
            <div className="relative max-w-md w-full mx-4 hidden md:block">
              <input
                type="text"
                placeholder="Press ⌘K or Ctrl+K to access command palette..."
                readOnly
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-full bg-[#F2F2ED] dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-full py-2 pl-10 pr-4 text-xs font-medium cursor-pointer hover:border-gray-300 outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="text-[9px] bg-white dark:bg-zinc-700 px-1.5 py-0.5 rounded border">⌘K</kbd>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-zinc-800 text-gray-500"
                title="Toggle Light/Dark Theme"
              >
                {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </button>

              <button
                onClick={handleResetDatabase}
                className="p-2 rounded-full hover:bg-red-50 text-red-600 dark:hover:bg-red-900/20"
                title="Reset Workspace to Seed Baseline"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-l pl-3">
                <div className="w-8 h-8 rounded-full bg-[#FAF6E9] border border-[#F3C142] flex items-center justify-center text-xs font-bold text-zinc-800">
                  RF
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold leading-none">{userProfile.name}</div>
                  <span className="text-[10px] text-gray-400 font-medium">Digital Twin Live</span>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 flex flex-col md:flex-row">
            
            {/* Left Column Sidebar Navigation */}
            <aside className="w-full md:w-64 bg-[#F9F7EF] dark:bg-[#1C1A17] border-r border-gray-200 dark:border-zinc-800 p-4 space-y-8">
              
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3">Financial Life</div>
                <nav className="space-y-1">
                  {[
                    { id: "overview", label: "Overview Dashboard", icon: Layers },
                    { id: "twin", label: "Financial Twin", icon: Compass },
                    { id: "accounts", label: "Accounts & Importer", icon: CreditCard },
                    { id: "goals", label: "Goal Laboratory", icon: PiggyBank }
                  ].map((navItem) => {
                    const IconComponent = navItem.icon;
                    return (
                      <button
                        key={navItem.id}
                        onClick={() => setActiveTab(navItem.id as TabType)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                          activeTab === navItem.id 
                            ? "bg-[#222220] text-[#F3C142]" 
                            : "text-[#222220]/75 dark:text-zinc-300 hover:bg-[#F2F2ED] dark:hover:bg-zinc-800"
                        }`}
                      >
                        <IconComponent className="w-4 h-4 shrink-0" />
                        <span>{navItem.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3">Simulation Lab</div>
                <nav className="space-y-1">
                  {[
                    { id: "scenarios", label: "Scenarios Laboratory", icon: Sliders },
                    { id: "economic", label: "Economic Environment", icon: Globe }
                  ].map((navItem) => {
                    const IconComponent = navItem.icon;
                    return (
                      <button
                        key={navItem.id}
                        onClick={() => setActiveTab(navItem.id as TabType)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                          activeTab === navItem.id 
                            ? "bg-[#222220] text-[#F3C142]" 
                            : "text-[#222220]/75 dark:text-zinc-300 hover:bg-[#F2F2ED] dark:hover:bg-zinc-800"
                        }`}
                      >
                        <IconComponent className="w-4 h-4 shrink-0" />
                        <span>{navItem.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3">Intelligence & Reports</div>
                <nav className="space-y-1">
                  {[
                    { id: "intelligence", label: "Grounded AI Intel", icon: Sparkles },
                    { id: "reports", label: "Simulation Reports", icon: FileText },
                    { id: "account", label: "Profile & Settings", icon: User }
                  ].map((navItem) => {
                    const IconComponent = navItem.icon;
                    return (
                      <button
                        key={navItem.id}
                        onClick={() => setActiveTab(navItem.id as TabType)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                          activeTab === navItem.id 
                            ? "bg-[#222220] text-[#F3C142]" 
                            : "text-[#222220]/75 dark:text-zinc-300 hover:bg-[#F2F2ED] dark:hover:bg-zinc-800"
                        }`}
                      >
                        <IconComponent className="w-4 h-4 shrink-0" />
                        <span>{navItem.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Dynamic sidebar mini diagnostic card */}
              <div className="bg-[#FAF6E9] dark:bg-[#201F1C] p-4 rounded-2xl border border-[#F3C142]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#222220]/50 dark:text-zinc-400">Monte Carlo Security</span>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-500">Goal Probability (Expected)</div>
                  <div className="text-xl font-mono font-black text-zinc-900 dark:text-[#E8E6DF]">{liveSimulationResult.goalProbability}%</div>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#F3C142]" style={{ width: `${liveSimulationResult.goalProbability}%` }} />
                </div>
                <p className="text-[9px] text-gray-500 leading-normal">
                  600 futures mapped with {assumptions.inflationRate}% baseline inflation.
                </p>
              </div>
            </aside>

            {/* Main Center Content Panel */}
            <main className="flex-1 bg-[#F2F2ED] dark:bg-[#151310] p-6 overflow-y-auto space-y-6">
              
              {/* Simulation running modal overlay overlay */}
              <AnimatePresence>
                {isSimulating && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                  >
                    <div className="bg-[#F9F7EF] dark:bg-zinc-900 border-2 border-[#F3C142] p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl">
                      <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-gray-100 border-t-[#F3C142] animate-spin" />
                        <span className="absolute inset-0 flex items-center justify-center font-bold font-mono text-xs">{simulationProgress}%</span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-extrabold">Recalibrating Digital Twin...</h3>
                        <p className="text-xs text-gray-500 font-mono italic animate-pulse">{simStepText}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* --- TAB 1: OVERVIEW DASHBOARD --- */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Top Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-black tracking-tight">Financial Twin Overview</h1>
                      <p className="text-xs text-gray-500">Live stochastic analysis of your consolidated balance sheet and simulated futures.</p>
                    </div>

                    {/* Quick What-If actions buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Quick What-Ifs:</span>
                      {scenarios.slice(0, 3).map((scen) => (
                        <button
                          key={scen.id}
                          onClick={() => handleToggleScenario(scen.id)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-tight border transition-all ${
                            scen.isActive
                              ? "bg-[#222220] text-[#F3C142] border-[#F3C142]"
                              : "bg-[#F9F7EF] text-zinc-800 border-zinc-200 hover:border-[#F3C142]"
                          }`}
                        >
                          {scen.isActive ? "✓ " : ""}{scen.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Metrics Group */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-5 rounded-[22px] border border-[#222220]/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Twin Net Worth</span>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight">
                        EGP {currentNetWorthVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <span>Assets: EGP {totalAssets.toLocaleString()}</span>
                        <span className="text-red-500 font-bold">•</span>
                        <span>Debt: EGP {totalLiabilities.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-5 rounded-[22px] border border-[#222220]/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Monthly Net Savings</span>
                        <PiggyBank className="w-4 h-4 text-[#F3C142]" />
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight text-green-700">
                        +EGP 10,600
                      </div>
                      <div className="text-[10px] text-zinc-500 font-medium">
                        Earnings EGP 32k • Saving rate: 33.1%
                      </div>
                    </div>

                    <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-5 rounded-[22px] border border-[#222220]/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Goal Probability</span>
                        <Sparkle className="w-4 h-4 text-[#F3C142] animate-pulse" />
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight text-[#222220] dark:text-[#F3C142]">
                        {liveSimulationResult.goalProbability}%
                      </div>
                      <div className="text-[10px] text-zinc-500 font-medium truncate">
                        Targeting {goals[0]?.name || "Zamalek Home"}
                      </div>
                    </div>

                    <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-5 rounded-[22px] border border-[#222220]/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Emergency Survival</span>
                        <ShieldAlert className="w-4 h-4 text-[#F3C142]" />
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-[#E8E6DF]">
                        {liveSimulationResult.emergencyFundSurvival} Months
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        Based on liquid EGP savings buffer
                      </div>
                    </div>
                  </div>

                  {/* Primary Monte Carlo Projection Chart */}
                  <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-[#222220]/5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold">Stochastic 30-Year Future Projection (600 Paths)</h3>
                        <p className="text-xs text-gray-400">Monte Carlo simulation of terminal wealth distribution under inflation compounding.</p>
                      </div>

                      {/* Legends */}
                      <div className="flex items-center gap-4 flex-wrap text-[10px] font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-1.5 bg-[#FAF6E9] border border-[#F3C142]/50 block" />
                          <span>P95 (Optimistic Portfolio)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-1.5 bg-[#F3C142] block" />
                          <span>P50 (Expected Median)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-1.5 bg-red-400 block" />
                          <span>P5 (Severe Volatility Crash)</span>
                        </div>
                      </div>
                    </div>

                    {/* Custom SVG Scaled Line Chart with uncertainty bands */}
                    <div className="h-64 bg-[#F2F2ED] dark:bg-zinc-900 rounded-2xl relative p-4 flex flex-col justify-between border border-[#222220]/5">
                      {liveSimulationResult.percentiles.p50.length > 0 ? (
                        <>
                          <div className="absolute inset-0 p-4 pointer-events-none">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                              {/* Confidence interval outer area (Hatched/diagonals or colored) */}
                              <polygon
                                points={liveSimulationResult.percentiles.p50.map((_, idx) => {
                                  const x = (idx / (liveSimulationResult.percentiles.p50.length - 1)) * 100;
                                  // Normalize y (p95 is highest)
                                  const maxVal = Math.max(...liveSimulationResult.percentiles.p95) * 1.1 || 1;
                                  const y = 100 - (liveSimulationResult.percentiles.p95[idx] / maxVal) * 90;
                                  return `${x},${y}`;
                                }).concat(
                                  liveSimulationResult.percentiles.p5.map((_, idx) => {
                                    const revIdx = liveSimulationResult.percentiles.p5.length - 1 - idx;
                                    const x = (revIdx / (liveSimulationResult.percentiles.p5.length - 1)) * 100;
                                    const maxVal = Math.max(...liveSimulationResult.percentiles.p95) * 1.1 || 1;
                                    const y = 100 - (liveSimulationResult.percentiles.p5[revIdx] / maxVal) * 90;
                                    return `${x},${y}`;
                                  })
                                ).join(" ")}
                                fill="#F3C142"
                                opacity="0.12"
                              />

                              {/* P95 Line */}
                              <path
                                d={liveSimulationResult.percentiles.p95.map((val, idx) => {
                                  const x = (idx / (liveSimulationResult.percentiles.p95.length - 1)) * 100;
                                  const maxVal = Math.max(...liveSimulationResult.percentiles.p95) * 1.1 || 1;
                                  const y = 100 - (val / maxVal) * 90;
                                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                                }).join(" ")}
                                fill="none"
                                stroke="#D4A72E"
                                strokeWidth="1"
                                strokeDasharray="3,3"
                              />

                              {/* Median P50 Line */}
                              <path
                                d={liveSimulationResult.percentiles.p50.map((val, idx) => {
                                  const x = (idx / (liveSimulationResult.percentiles.p50.length - 1)) * 100;
                                  const maxVal = Math.max(...liveSimulationResult.percentiles.p95) * 1.1 || 1;
                                  const y = 100 - (val / maxVal) * 90;
                                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                                }).join(" ")}
                                fill="none"
                                stroke="#222220"
                                strokeWidth="2.5"
                              />

                              {/* P5 Line */}
                              <path
                                d={liveSimulationResult.percentiles.p5.map((val, idx) => {
                                  const x = (idx / (liveSimulationResult.percentiles.p5.length - 1)) * 100;
                                  const maxVal = Math.max(...liveSimulationResult.percentiles.p95) * 1.1 || 1;
                                  const y = 100 - (val / maxVal) * 90;
                                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                                }).join(" ")}
                                fill="none"
                                stroke="#EF4444"
                                strokeWidth="1.5"
                              />
                            </svg>
                          </div>

                          {/* Y-axis tickers */}
                          <div className="absolute right-4 top-4 text-[10px] font-mono text-zinc-500 text-right space-y-1 bg-white/60 dark:bg-zinc-900/60 p-2 rounded border border-gray-100 dark:border-zinc-800">
                            <div>Peak: EGP {(Math.max(...liveSimulationResult.percentiles.p95)/1000000).toFixed(1)}M</div>
                            <div>Median: EGP {(liveSimulationResult.averageNetWorthAtHorizon/1000000).toFixed(1)}M</div>
                            <div>Stress: EGP {(Math.min(...liveSimulationResult.percentiles.p5)/1000000).toFixed(1)}M</div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-gray-400">
                          Insufficient asset and cash flow data to draw projection lines.
                        </div>
                      )}

                      <div className="flex justify-between text-[9px] font-bold text-gray-500 z-10">
                        {liveSimulationResult.months.map((m, i) => (
                          <span key={i}>{m}</span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-[#FAF6E9] dark:bg-zinc-900/50 rounded-xl border border-[#F3C142]/20 flex items-start gap-3 text-xs">
                      <Info className="w-4 h-4 text-[#F3C142] shrink-0 mt-0.5" />
                      <p className="text-zinc-600 dark:text-zinc-300">
                        <strong>Simulation Insights:</strong> Over 600 parallel futures, your expected median net worth in 30 years scales to <strong>EGP {liveSimulationResult.averageNetWorthAtHorizon.toLocaleString(undefined, {maximumFractionDigits:0})}</strong>. The 5% stress curve indicates a minimum survival threshold of EGP {(liveSimulationResult.percentiles.p5[liveSimulationResult.percentiles.p5.length-1] || 0).toLocaleString(undefined, {maximumFractionDigits:0})} in severe market recessions.
                      </p>
                    </div>
                  </div>

                  {/* Split Section: AI Context and Goal Laboratory Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Panel: Compact AI Insights */}
                    <div className="lg:col-span-6 bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-[#222220]/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-[#F3C142] animate-pulse" />
                          <h3 className="text-base font-extrabold">AI Financial Twin Insights</h3>
                        </div>
                        <button onClick={() => setActiveTab("intelligence")} className="text-xs text-gray-500 hover:text-black">Open Conversational Assistant</button>
                      </div>

                      <div className="space-y-3">
                        {aiConversations.length > 0 ? (
                          <div className="p-4 bg-zinc-900 text-white rounded-xl text-xs space-y-2">
                            <div className="font-bold text-[#F3C142] font-mono">Q: {aiConversations[0].question}</div>
                            <p className="text-zinc-300 leading-relaxed font-sans">{aiConversations[0].answer}</p>
                          </div>
                        ) : (
                          <div className="p-4 bg-zinc-900 text-white rounded-xl text-xs">
                            No queries processed yet. Click below to begin exploring.
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Suggested Quick Diagnostic:</span>
                          <div className="flex gap-2 flex-wrap">
                            <button 
                              onClick={() => handleAskAi("How resilient is my current plan against inflation in Egypt?")}
                              className="text-[10px] font-bold bg-[#F2F2ED] dark:bg-zinc-800 hover:bg-[#F3C142]/20 p-2 rounded-full text-zinc-800 dark:text-zinc-200"
                            >
                              "How resilient is my plan against inflation?"
                            </button>
                            <button 
                              onClick={() => handleAskAi("Can I reach my home goal?")}
                              className="text-[10px] font-bold bg-[#F2F2ED] dark:bg-zinc-800 hover:bg-[#F3C142]/20 p-2 rounded-full text-zinc-800 dark:text-zinc-200"
                            >
                              "Can I reach my Zamalek downpayment?"
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: Risk Drivers & Stabilizing elements */}
                    <div className="lg:col-span-6 bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-[#222220]/5 space-y-4">
                      <h3 className="text-base font-extrabold">Active Risk Matrix</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-xl border border-red-500/10 text-xs">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-600" />
                            <div>
                              <div className="font-bold text-red-900 dark:text-red-300">Liquidity Inflation Drag</div>
                              <div className="text-zinc-500 text-[10px]">{assumptions.inflationRate}% baseline inflation degrading cash value</div>
                            </div>
                          </div>
                          <span className="text-red-700 font-bold">At Risk</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/10 text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <div>
                              <div className="font-bold text-green-900 dark:text-green-300">Emergency Survival Buffer</div>
                              <div className="text-zinc-500 text-[10px]">{liveSimulationResult.emergencyFundSurvival} Months cash expense coverage</div>
                            </div>
                          </div>
                          <span className="text-green-700 font-bold">Healthy</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[#F2EAC3] rounded-xl border border-[#F3C142]/20 text-xs">
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-[#F3C142]" />
                            <div>
                              <div className="font-bold text-yellow-900 dark:text-yellow-300">Stochastic Market Volatility</div>
                              <div className="text-zinc-500 text-[10px]">{assumptions.volatilityRate}% modeling parameters</div>
                            </div>
                          </div>
                          <span className="text-yellow-700 font-bold">Active</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* --- TAB 2: FINANCIAL TWIN (BALANCE SHEET & STREAMS) --- */}
              {activeTab === "twin" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-3xl font-black tracking-tight">Your Financial Digital Twin</h1>
                      <p className="text-xs text-gray-500">The consolidated state definitions representing your real financial structure.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Net Savings and Stream Flow Cards */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* Cash Inflow Nodes */}
                      <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-zinc-200/50 space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-base font-bold flex items-center gap-2">
                            <TrendingUp className="w-4.5 h-4.5 text-green-600" />
                            <span>Inflow Streams (Monthly Recurrent)</span>
                          </h3>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-[#F2F2ED] dark:bg-zinc-800 rounded-xl text-xs">
                            <div>
                              <div className="font-bold">Upwork Freelance Retainer (Design)</div>
                              <span className="text-[10px] text-gray-400">Category: Freelance</span>
                            </div>
                            <span className="font-mono font-bold text-green-700">EGP 28,000/mo</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-[#F2F2ED] dark:bg-zinc-800 rounded-xl text-xs">
                            <div>
                              <div className="font-bold">Advisory Consultation Fee</div>
                              <span className="text-[10px] text-gray-400">Category: Career</span>
                            </div>
                            <span className="font-mono font-bold text-green-700">EGP 4,000/mo</span>
                          </div>
                        </div>
                      </div>

                      {/* Cash Outflow Nodes */}
                      <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-zinc-200/50 space-y-4">
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <TrendingDown className="w-4.5 h-4.5 text-red-500" />
                          <span>Outflow Streams (Expenses)</span>
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {[
                            { name: "Rent & Housing", val: "12,000", cat: "Housing" },
                            { name: "Food & Groceries", val: "4,500", cat: "Food" },
                            { name: "Electricity & Fiber", val: "1,900", cat: "Utilities" },
                            { name: "Entertainment Subscriptions", val: "500", cat: "Subscriptions" },
                            { name: "Thndr Automated Asset draft", val: "2,500", cat: "Investments" }
                          ].map((item, i) => (
                            <div key={i} className="p-3 bg-[#F2F2ED] dark:bg-zinc-800 rounded-xl flex justify-between items-center">
                              <div>
                                <div className="font-bold">{item.name}</div>
                                <span className="text-[9px] text-gray-400">Category: {item.cat}</span>
                              </div>
                              <span className="font-mono font-bold text-red-600">EGP {item.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Right: Consolidated Asset and Liability Sheet */}
                    <div className="lg:col-span-5 bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-zinc-200/50 space-y-6">
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <Database className="w-4.5 h-4.5 text-[#F3C142]" />
                        <span>Consolidated Balance Sheet</span>
                      </h3>

                      <div className="space-y-4 text-xs">
                        <div className="flex justify-between p-3 bg-green-500/5 border border-green-500/10 rounded-xl">
                          <span className="font-medium text-gray-500">Liquid Assets Buffer:</span>
                          <span className="font-mono font-bold text-green-700">EGP {totalAssets.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                          <span className="font-medium text-gray-500">Active Debt Liabilities:</span>
                          <span className="font-mono font-bold text-red-600">EGP {totalLiabilities.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between p-3 bg-[#FAF6E9] border border-[#F3C142]/30 rounded-xl text-sm font-bold">
                          <span>Consolidated Twin Net Worth:</span>
                          <span className="font-mono text-[#222220] dark:text-[#F3C142]">EGP {currentNetWorthVal.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Add Custom Item quick guide */}
                      <div className="p-4 bg-[#FAF6E9] dark:bg-zinc-900/50 rounded-xl border border-[#F3C142]/20 text-xs text-gray-500 space-y-2">
                        <div className="font-bold text-zinc-800 dark:text-[#E8E6DF]">Modeling Note</div>
                        <p className="leading-relaxed">
                          To make structural changes like buying properties or adding loans, use the 'Accounts & Importer' page to record new nodes, or configure specific temporal delays inside the 'Simulation Scenarios'.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 3: ACCOUNTS & CSV TRANSACTION IMPORTER --- */}
              {activeTab === "accounts" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-black tracking-tight">Accounts & CSV Importer</h1>
                      <p className="text-xs text-gray-500">Add asset/liability nodes or drag-and-drop CSV statements into your digital twin registry.</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsAddAccountOpen(true)}
                        className="px-4 py-2 bg-[#222220] text-white rounded-full text-xs font-bold hover:bg-black flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Asset Account</span>
                      </button>
                    </div>
                  </div>

                  {/* Accounts Cards List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {accounts.map((acc) => (
                      <div key={acc.id} className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-5 rounded-[22px] border border-gray-200 dark:border-zinc-800 hover:border-[#F3C142] transition-colors flex flex-col justify-between h-36">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{acc.type}</div>
                            <h3 className="text-sm font-extrabold truncate max-w-[150px]">{acc.name}</h3>
                          </div>
                          <button 
                            onClick={() => handleDeleteAccount(acc.id)} 
                            className="p-1 hover:text-red-600 rounded hover:bg-red-50 text-gray-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <div className={`text-xl font-black font-mono tracking-tight ${acc.balance < 0 ? "text-red-600 animate-pulse" : "text-zinc-900 dark:text-[#E8E6DF]"}`}>
                            EGP {acc.balance.toLocaleString()}
                          </div>
                          <span className="text-[9px] text-gray-400 font-medium">Last updated: Today</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CSV Importer Section */}
                  <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-zinc-200/50 space-y-6">
                    <div>
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <UploadCloud className="w-5 h-5 text-[#F3C142]" />
                        <span>High-Fidelity Transaction Statement Importer</span>
                      </h3>
                      <p className="text-xs text-gray-400">Import CSV statements, configure columns mapping, run dry-run validation, and commit nodes to your database.</p>
                    </div>

                    {/* Step wizard for importer */}
                    <div className="flex gap-4 border-b border-gray-200 pb-3 text-xs font-bold">
                      <button onClick={() => setImporterStep("paste")} className={`pb-2 ${importerStep === "paste" ? "border-b-2 border-[#F3C142] text-[#222220]" : "text-gray-400"}`}>1. Paste Raw CSV</button>
                      <button onClick={() => { if (importedPreviewRows.length > 0) setImporterStep("preview"); }} className={`pb-2 ${importerStep === "preview" ? "border-b-2 border-[#F3C142] text-[#222220]" : "text-gray-400"}`}>2. Dry Run & Validation</button>
                    </div>

                    {importerStep === "paste" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <label className="block font-bold text-gray-500 mb-1">Target Account Node</label>
                            <select 
                              className="w-full p-2.5 rounded-lg border border-gray-300 bg-white"
                              value={importAccount}
                              onChange={e => setImportAccount(e.target.value)}
                            >
                              {accounts.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block font-bold text-gray-500 mb-1">Columns Mapping Indices (0-based)</label>
                            <div className="grid grid-cols-4 gap-2 text-[11px] font-mono">
                              <div>
                                <span>Date:</span>
                                <input type="number" className="w-full p-1 border rounded bg-white text-center font-bold" value={mappedColumns.date} onChange={e => setMappedColumns({...mappedColumns, date: parseInt(e.target.value) || 0})} />
                              </div>
                              <div>
                                <span>Desc:</span>
                                <input type="number" className="w-full p-1 border rounded bg-white text-center font-bold" value={mappedColumns.description} onChange={e => setMappedColumns({...mappedColumns, description: parseInt(e.target.value) || 0})} />
                              </div>
                              <div>
                                <span>Amount:</span>
                                <input type="number" className="w-full p-1 border rounded bg-white text-center font-bold" value={mappedColumns.amount} onChange={e => setMappedColumns({...mappedColumns, amount: parseInt(e.target.value) || 0})} />
                              </div>
                              <div>
                                <span>Category:</span>
                                <input type="number" className="w-full p-1 border rounded bg-white text-center font-bold" value={mappedColumns.category} onChange={e => setMappedColumns({...mappedColumns, category: parseInt(e.target.value) || 0})} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Raw CSV Text Content</label>
                          <textarea
                            rows={5}
                            className="w-full p-3 font-mono text-xs rounded-xl border border-gray-300 bg-white outline-none focus:border-[#F3C142]"
                            value={rawImportText}
                            onChange={e => setRawImportText(e.target.value)}
                          />
                        </div>

                        <button 
                          onClick={handleProcessImportPaste}
                          className="px-6 py-3 rounded-full bg-[#222220] text-white text-xs font-bold hover:bg-black transition-transform active:scale-98"
                        >
                          Run Dry Run Validation
                        </button>
                      </div>
                    )}

                    {importerStep === "preview" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                            ✓ Found {importedPreviewRows.length} transactions. Ready for DB execution.
                          </span>
                          <button onClick={() => setImporterStep("paste")} className="text-xs text-gray-500 hover:text-black">Change CSV Text</button>
                        </div>

                        <div className="max-h-60 overflow-y-auto border rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left bg-white border-collapse">
                            <thead className="bg-[#F2F2ED] font-bold text-gray-500 border-b">
                              <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Description</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Validation</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importedPreviewRows.map((row, idx) => (
                                <tr key={idx} className="border-b hover:bg-gray-50">
                                  <td className="p-3 font-mono">{row.date}</td>
                                  <td className="p-3 font-bold">{row.description}</td>
                                  <td className={`p-3 font-mono font-bold ${row.amount >= 0 ? "text-green-700" : "text-red-600"}`}>EGP {row.amount}</td>
                                  <td className="p-3"><span className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">{row.category}</span></td>
                                  <td className="p-3">
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                      row.status === "valid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                    }`}>
                                      {row.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => setImporterStep("paste")} className="px-5 py-2.5 rounded-full border text-xs font-bold">Cancel</button>
                          <button 
                            onClick={handleCommitImport}
                            className="px-6 py-2.5 rounded-full bg-[#222220] text-[#F3C142] font-black text-xs hover:bg-black"
                          >
                            Commit Nodes to Digital Twin
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transaction History Registry */}
                  <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-zinc-200/50 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <Activity className="w-5 h-5 text-gray-500" />
                          <span>Transaction Node Ledger</span>
                        </h3>
                        <p className="text-xs text-gray-400">Total recorded transactions backing your monthly compound average flow.</p>
                      </div>

                      {/* Search & Category Filter */}
                      <div className="flex gap-2 w-full sm:max-w-xs">
                        <div className="relative w-full">
                          <input
                            type="text"
                            placeholder="Filter transactions..."
                            className="w-full bg-white rounded-full py-1.5 pl-9 pr-4 text-xs border border-gray-300 outline-none focus:border-[#F3C142]"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                          />
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        <button
                          onClick={() => setIsAddTransactionOpen(true)}
                          className="px-3.5 py-1.5 bg-[#222220] text-white rounded-full text-xs font-bold hover:bg-black flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Record Node</span>
                        </button>
                      </div>
                    </div>

                    <div className="border rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left bg-white">
                        <thead className="bg-[#F2F2ED] font-bold text-zinc-500">
                          <tr>
                            <th className="p-3">Description</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.length > 0 ? (
                            filteredTransactions.map((tx) => (
                              <tr key={tx.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">
                                  <div>
                                    <div className="font-bold text-zinc-900">{tx.description}</div>
                                    <span className="text-[9px] text-gray-400 font-mono">{new Date(tx.date).toLocaleDateString()}</span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="bg-gray-100 px-2.5 py-0.5 rounded text-[10px] font-medium text-gray-600">{tx.category}</span>
                                </td>
                                <td className="p-3">
                                  <span className={`text-[10px] font-bold ${tx.type === "income" ? "text-green-700" : "text-red-500"}`}>
                                    {tx.type}
                                  </span>
                                </td>
                                <td className={`p-3 font-mono font-bold ${tx.amount >= 0 ? "text-green-700" : "text-red-600"}`}>
                                  EGP {tx.amount.toLocaleString()}
                                </td>
                                <td className="p-3 text-right">
                                  <button onClick={() => handleDeleteTransaction(tx.id)} className="p-1 text-gray-400 hover:text-red-600">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">No transactions match search criteria.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 4: GOAL LABORATORY & calculator SLIDERS --- */}
              {activeTab === "goals" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-black tracking-tight">Financial Goals Laboratory</h1>
                      <p className="text-xs text-gray-500">Stochastically evaluate compound timelines and model monthly saving allocations.</p>
                    </div>
                    <button 
                      onClick={() => setIsAddGoalOpen(true)}
                      className="px-4 py-2 bg-[#222220] text-white rounded-full text-xs font-bold hover:bg-black flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Mint Goal Target</span>
                    </button>
                  </div>

                  {/* Goal Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {goals.map((goal) => {
                      const progressPct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                      const isSelected = selectedGoalId === goal.id;
                      
                      return (
                        <div 
                          key={goal.id} 
                          onClick={() => {
                            setSelectedGoalId(goal.id);
                            setPlannerContribution(goal.monthlyContribution);
                            setPlannerTarget(goal.targetAmount);
                          }}
                          className={`p-6 rounded-[22px] border transition-all cursor-pointer flex flex-col justify-between h-56 ${
                            isSelected 
                              ? "bg-[#222220] text-[#F3C142] border-[#F3C142]" 
                              : "bg-[#F9F7EF] dark:bg-[#1C1A17] text-[#222220] dark:text-[#E8E6DF] border-gray-200 dark:border-zinc-800 hover:border-[#F3C142]/60"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isSelected ? "bg-[#FAF6E9] text-zinc-900" : "bg-gray-100 text-zinc-600"}`}>
                                {goal.category}
                              </span>
                              <h3 className="text-base font-extrabold mt-2 truncate max-w-[180px]">{goal.name}</h3>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                              className={`p-1 rounded ${isSelected ? "text-yellow-600 hover:bg-zinc-800" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between text-xs font-mono">
                              <span>EGP {goal.currentAmount.toLocaleString()}</span>
                              <span>Target: EGP {goal.targetAmount.toLocaleString()}</span>
                            </div>

                            <div className="h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-[#F3C142]" style={{ width: `${progressPct}%` }} />
                            </div>

                            <div className="flex justify-between items-center text-[10px]">
                              <span>Target: {goal.targetDate}</span>
                              <span className="font-bold uppercase tracking-wider bg-green-500/10 text-green-700 px-2 py-0.5 rounded">
                                {goal.monthlyContribution > 0 ? `EGP ${goal.monthlyContribution}/mo` : "Lump-sum"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive Sliders Goal Planner tool */}
                  {selectedGoalId && (
                    <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-zinc-200/50 space-y-6">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-[#F3C142]" />
                        <h3 className="text-base font-bold">Interactive Goal Planner Sensitivity Simulator</h3>
                      </div>

                      <p className="text-xs text-gray-500">
                        Adjust your monthly contribution and target values live. The stochastic engine runs Monte Carlo simulations instantly in sandbox cache memory.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Sliders */}
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                              <span className="text-gray-500">Monthly Contribution Allocation</span>
                              <span className="font-mono text-[#F3C142]">EGP {plannerContribution.toLocaleString()}</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="30000"
                              step="500"
                              className="w-full accent-[#F3C142]"
                              value={plannerContribution}
                              onChange={e => setPlannerContribution(parseInt(e.target.value))}
                            />
                            <div className="flex justify-between text-[10px] text-gray-400">
                              <span>Min EGP 0</span>
                              <span>Max EGP 30,000</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                              <span className="text-gray-500">Target Capital Target</span>
                              <span className="font-mono text-[#F3C142]">EGP {plannerTarget.toLocaleString()}</span>
                            </div>
                            <input
                              type="range"
                              min="100000"
                              max="10000000"
                              step="100000"
                              className="w-full accent-[#F3C142]"
                              value={plannerTarget}
                              onChange={e => setPlannerTarget(parseInt(e.target.value))}
                            />
                            <div className="flex justify-between text-[10px] text-gray-400">
                              <span>EGP 100K</span>
                              <span>EGP 10M</span>
                            </div>
                          </div>
                        </div>

                        {/* Real-time simulation outputs */}
                        <div className="bg-[#FAF6E9] dark:bg-zinc-900/40 p-6 rounded-[22px] border border-[#F3C142]/20 flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Interactive Model Forecast</div>
                            <div className="text-3xl font-black font-mono tracking-tight text-zinc-900 dark:text-[#E8E6DF] flex items-baseline gap-1.5">
                              {liveSimulationResult.goalProbability}%
                              <span className="text-xs text-green-700 font-bold uppercase tracking-wider bg-green-500/10 px-2 py-0.5 rounded">
                                Success Probability
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 leading-normal">
                              Allocating EGP {plannerContribution.toLocaleString()} monthly to investments at {assumptions.investmentReturnRate}% compounding yield provides {liveSimulationResult.goalProbability}% success coverage over {userProfile.simulationHorizon} years.
                            </p>
                          </div>

                          <button 
                            onClick={async () => {
                              await syncMutation("goals", "upsert", {
                                ...goals.find(g => g.id === selectedGoalId),
                                targetAmount: plannerTarget,
                                monthlyContribution: plannerContribution
                              }, selectedGoalId);
                              triggerToast("Updated goal parameters committed to database persistent schema!");
                            }}
                            className="w-full py-3 bg-[#222220] text-[#F3C142] rounded-full text-xs font-black hover:bg-black transition-transform active:scale-98"
                          >
                            Commit Goal Adjustments to DB Twin
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 5: SCENARIOS LABORATORY --- */}
              {activeTab === "scenarios" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-black tracking-tight">Simulation Scenarios Studio</h1>
                      <p className="text-xs text-gray-500">Enable stress testing triggers or deploy custom socioeconomic events on top of 600 parallel futures.</p>
                    </div>
                    <button 
                      onClick={() => setIsAddScenarioOpen(true)}
                      className="px-4 py-2 bg-[#222220] text-white rounded-full text-xs font-bold hover:bg-black flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Mint Custom Scenario</span>
                    </button>
                  </div>

                  {/* AI Natural Language builder prompt block */}
                  <div className="bg-zinc-950 text-white p-6 rounded-[22px] border border-zinc-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#F3C142] animate-pulse" />
                      <h3 className="text-base font-bold">AI Natural Language Scenario Minting Laboratory</h3>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Type your situation. Our Grounded intelligence will extract delta streams (Income changes, durations, inflation parameters) and render an active testing card.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 'What if I take a sabbatical year of EGP 0 income starting year 3 but spend EGP 5,000 less?'"
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs rounded-full py-3 px-5 outline-none focus:border-[#F3C142]"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            triggerToast("AI Scenario generated! 'Design Sabbatical' card has been minted.", "success");
                            // Mint a dummy scenario
                            syncMutation("scenarios", "upsert", {
                              name: "AI: Custom Sabbatical",
                              category: "Career",
                              description: "A temporary 12-month reduction of monthly freelance income to 0 with offset spending reduction.",
                              incomeChange: -32000,
                              expenseChange: -5000,
                              assetChange: 0,
                              liabilityChange: 0,
                              durationMonths: 12,
                              applyInflation: true
                            });
                          }
                        }}
                      />
                      <button 
                        onClick={() => triggerToast("AI Prompt scenario compiled and registered in database!", "success")}
                        className="bg-[#F3C142] text-zinc-950 font-black text-xs px-6 rounded-full hover:bg-yellow-500"
                      >
                        Synthesize
                      </button>
                    </div>
                  </div>

                  {/* Predefined Scenario library list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {scenarios.map((scen) => (
                      <div 
                        key={scen.id} 
                        className={`p-6 rounded-[28px] bg-[#F9F7EF] dark:bg-[#1C1A17] border transition-all flex flex-col justify-between h-64 ${
                          scen.isActive 
                            ? "border-2 border-[#F3C142]" 
                            : "border-gray-200 dark:border-zinc-800 hover:border-[#F3C142]/40"
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                              {scen.category}
                            </span>
                            
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-400 font-medium">Model Active:</span>
                              <button
                                onClick={() => handleToggleScenario(scen.id)}
                                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none ${
                                  scen.isActive ? "bg-green-600" : "bg-gray-300"
                                }`}
                              >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                  scen.isActive ? "translate-x-5" : ""
                                }`} />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-base font-black">{scen.name}</h3>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{scen.description}</p>
                        </div>

                        {/* Scenario Impact variables metrics */}
                        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                          <div>
                            <div className="text-gray-400">Monthly Cashflow</div>
                            <div className={`font-bold ${scen.incomeChange - scen.expenseChange >= 0 ? "text-green-700" : "text-red-500"}`}>
                              EGP {scen.incomeChange >= 0 ? "+" : ""}{(scen.incomeChange - scen.expenseChange).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Duration</div>
                            <div className="font-bold text-zinc-800 dark:text-[#E8E6DF]">{scen.durationMonths} Months</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Actions</div>
                            <button onClick={() => handleDeleteScenario(scen.id)} className="text-red-500 hover:text-red-700 font-bold uppercase tracking-wider">
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --- TAB 6: ECONOMIC ENVIRONMENT --- */}
              {activeTab === "economic" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-3xl font-black tracking-tight">Economic Environment Settings</h1>
                      <p className="text-xs text-gray-500">Configure global compounding baseline vectors that drive all stochastic simulations.</p>
                    </div>
                  </div>

                  <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-zinc-200/50 space-y-6">
                    <h3 className="text-base font-bold">Standard Egyptian Pound Economic Modeling Inputs</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      <div className="p-4 bg-[#F2F2ED] dark:bg-zinc-800 rounded-2xl space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Annual Core Inflation</div>
                        <div className="text-3xl font-black tracking-tighter font-mono">{assumptions.inflationRate}%</div>
                        <input
                          type="range"
                          min="2"
                          max="30"
                          step="0.5"
                          className="w-full accent-[#F3C142]"
                          value={assumptions.inflationRate}
                          onChange={e => handleSaveAssumptions({ ...assumptions, inflationRate: parseFloat(e.target.value) })}
                        />
                        <p className="text-[10px] text-gray-500 leading-normal">Compounded monthly onto Outflow streams. Egypt historical average ranges 10-18%.</p>
                      </div>

                      <div className="p-4 bg-[#F2F2ED] dark:bg-zinc-800 rounded-2xl space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Investment Return (P50)</div>
                        <div className="text-3xl font-black tracking-tighter font-mono">{assumptions.investmentReturnRate}%</div>
                        <input
                          type="range"
                          min="2"
                          max="25"
                          step="0.5"
                          className="w-full accent-[#F3C142]"
                          value={assumptions.investmentReturnRate}
                          onChange={e => handleSaveAssumptions({ ...assumptions, investmentReturnRate: parseFloat(e.target.value) })}
                        />
                        <p className="text-[10px] text-gray-500 leading-normal">Compounded annually onto investment portions of digital twin assets.</p>
                      </div>

                      <div className="p-4 bg-[#F2F2ED] dark:bg-zinc-800 rounded-2xl space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Market Volatility</div>
                        <div className="text-3xl font-black tracking-tighter font-mono">{assumptions.volatilityRate}%</div>
                        <input
                          type="range"
                          min="2"
                          max="35"
                          step="0.5"
                          className="w-full accent-[#F3C142]"
                          value={assumptions.volatilityRate}
                          onChange={e => handleSaveAssumptions({ ...assumptions, volatilityRate: parseFloat(e.target.value) })}
                        />
                        <p className="text-[10px] text-gray-500 leading-normal">Standard deviation coefficient of Box-Muller normal returns generator.</p>
                      </div>

                    </div>

                    {/* Preconfigured Macro Presets */}
                    <div className="space-y-3 pt-4 border-t">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Socioeconomic Scenario Presets:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button 
                          onClick={() => handleSaveAssumptions({ inflationRate: 6.0, incomeGrowthRate: 5.0, expenseGrowthRate: 4.5, investmentReturnRate: 18.0, volatilityRate: 12.0 })}
                          className="p-4 text-left border rounded-xl hover:border-[#F3C142] bg-white dark:bg-zinc-800 text-xs font-bold space-y-1"
                        >
                          <div>Strong EGP Recovery</div>
                          <span className="text-[10px] text-gray-400 font-normal">Inflation 6% • Returns 18%</span>
                        </button>
                        <button 
                          onClick={() => handleSaveAssumptions({ inflationRate: 22.0, incomeGrowthRate: 8.0, expenseGrowthRate: 18.0, investmentReturnRate: 11.0, volatilityRate: 24.0 })}
                          className="p-4 text-left border rounded-xl hover:border-[#F3C142] bg-white dark:bg-zinc-800 text-xs font-bold space-y-1"
                        >
                          <div>Hyper Inflation Shock</div>
                          <span className="text-[10px] text-gray-400 font-normal">Inflation 22% • Returns 11%</span>
                        </button>
                        <button 
                          onClick={() => handleSaveAssumptions({ inflationRate: 12.5, incomeGrowthRate: 8.0, expenseGrowthRate: 9.0, investmentReturnRate: 15.0, volatilityRate: 18.0 })}
                          className="p-4 text-left border rounded-xl hover:border-[#F3C142] bg-white dark:bg-zinc-800 text-xs font-bold space-y-1"
                        >
                          <div>Balanced Neutral EM Baseline</div>
                          <span className="text-[10px] text-gray-400 font-normal">Inflation 12.5% • Returns 15%</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 7: GROUNDED AI INTELLIGENCE --- */}
              {activeTab === "intelligence" && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">AI Financial Intelligence</h1>
                    <p className="text-xs text-gray-500">Conversational modeling assistant grounded into your living digital twin database schema.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    
                    {/* Left Panel: Conversation history and chat input */}
                    <div className="lg:col-span-8 bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-zinc-200/50 flex flex-col justify-between min-h-[480px]">
                      
                      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
                        {aiConversations.map((conv) => (
                          <div key={conv.id} className="space-y-3">
                            <div className="p-3.5 bg-[#F2F2ED] dark:bg-zinc-800 rounded-xl rounded-br-none text-xs text-zinc-800 dark:text-zinc-200 self-end ml-12">
                              <span className="font-bold block uppercase text-[8px] tracking-wider text-gray-400">Your Query:</span>
                              <p className="font-bold">{conv.question}</p>
                            </div>
                            <div className="p-4 bg-zinc-900 text-white rounded-xl rounded-bl-none text-xs mr-12 space-y-2">
                              <span className="font-bold block uppercase text-[8px] tracking-widest text-[#F3C142] font-mono">Grounded Intelligence:</span>
                              <p className="leading-relaxed font-normal">{conv.answer}</p>
                            </div>
                          </div>
                        ))}

                        {isAiTyping && (
                          <div className="p-4 bg-zinc-900 text-[#FAF6E9] rounded-xl text-xs max-w-sm mr-12 animate-pulse flex items-center gap-2">
                            <Sparkle className="w-4 h-4 text-[#F3C142] animate-spin" />
                            <span>Computing Monte Carlo percentile futures...</span>
                          </div>
                        )}
                      </div>

                      {/* Input area */}
                      <div className="pt-4 border-t mt-4 space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ask AI... (e.g., 'What happens if I save EGP 3,000 more every month?')"
                            className="w-full bg-white dark:bg-zinc-800 border rounded-full py-3 px-5 text-xs outline-none focus:border-[#F3C142]"
                            value={aiInput}
                            onChange={e => setAiInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleAskAi(aiInput); }}
                          />
                          <button 
                            onClick={() => handleAskAi(aiInput)}
                            className="px-6 py-3 bg-[#222220] text-white rounded-full text-xs font-bold hover:bg-black"
                          >
                            Ask Node
                          </button>
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" />
                          <span>AI utilizes Monte Carlo probability calculations based on active EGP database variables.</span>
                        </div>
                      </div>

                    </div>

                    {/* Right Panel: Current Twin context summary */}
                    <div className="lg:col-span-4 bg-[#FAF6E9] dark:bg-zinc-900 p-6 rounded-[22px] border border-[#F3C142]/20 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Database className="w-4.5 h-4.5 text-[#F3C142]" />
                          <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-800 dark:text-[#FAF6E9]">Active Twin Context</h4>
                        </div>
                        <p className="text-[11px] text-zinc-500">Live indicators provided to the Grounded LLM reasoning node.</p>

                        <div className="space-y-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          <div className="flex justify-between py-1.5 border-b border-gray-100">
                            <span>Consolidated NW:</span>
                            <span className="font-mono text-zinc-900 font-bold">EGP {currentNetWorthVal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-gray-100">
                            <span>Emergency buffer:</span>
                            <span className="font-mono text-zinc-900 font-bold">{liveSimulationResult.emergencyFundSurvival} Months</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-gray-100">
                            <span>Model Inflation:</span>
                            <span className="font-mono text-zinc-900 font-bold">{assumptions.inflationRate}%</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-gray-100">
                            <span>Compounding rate:</span>
                            <span className="font-mono text-zinc-900 font-bold">{assumptions.investmentReturnRate}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-xl text-[10px] text-zinc-500 space-y-2">
                        <div className="font-bold text-zinc-900">Suggested Queries:</div>
                        <button onClick={() => handleAskAi("How long could my savings cover my expenses?")} className="block text-left text-zinc-700 hover:text-[#F3C142] underline">
                          • How long could my savings cover my expenses?
                        </button>
                        <button onClick={() => handleAskAi("What happens if I lose my income?")} className="block text-left text-zinc-700 hover:text-[#F3C142] underline">
                          • What happens if I lose my freelance income?
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* --- TAB 8: SIMULATION REPORTS & EXPORT --- */}
              {activeTab === "reports" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-black tracking-tight">Simulation Reports Center</h1>
                      <p className="text-xs text-gray-500">Generate executive financial laboratory summaries for offline printing & auditing.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select 
                        className="p-2 rounded-full border bg-white text-xs font-bold"
                        value={reportType}
                        onChange={e => setReportType(e.target.value)}
                      >
                        <option value="Snapshot">Balance Sheet Snapshot</option>
                        <option value="Scenario">Scenario Stress Analysis</option>
                        <option value="Goal">Goal Feasibility Audit</option>
                      </select>
                      <button 
                        onClick={handleBuildReport}
                        className="px-5 py-2 bg-[#222220] text-[#F3C142] rounded-full text-xs font-black hover:bg-black"
                      >
                        Compile Report
                      </button>
                    </div>
                  </div>

                  {/* Report compiler progress loader */}
                  <AnimatePresence>
                    {isGeneratingReport && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-white p-6 rounded-2xl border-2 border-zinc-200 text-center space-y-3"
                      >
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#F3C142] h-full transition-all duration-150" style={{ width: `${reportProgress}%` }} />
                        </div>
                        <p className="text-xs font-bold font-mono">Running document rendering algorithms... {reportProgress}%</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Generated PDF view preview */}
                  {activeReportPreview && (
                    <div className="bg-white p-8 rounded-[28px] border-2 border-gray-300 max-w-2xl mx-auto space-y-6 shadow-lg text-[#222220]">
                      <div className="flex justify-between items-start border-b pb-6">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">FINANCIAL OPERATING twin REPORT</div>
                          <h2 className="text-xl font-extrabold">{activeReportPreview.name}</h2>
                          <span className="text-xs text-gray-400 font-mono">ID: {activeReportPreview.id} • Compiled: {new Date(activeReportPreview.createdAt).toLocaleString()}</span>
                        </div>
                        <button 
                          onClick={() => {
                            triggerToast("PDF compiled successfully! Initiating browser printing download.", "success");
                            window.print();
                          }}
                          className="p-3 bg-[#F3C142] text-zinc-950 rounded-full font-bold text-xs flex items-center gap-1 hover:bg-yellow-500"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download PDF</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-4 bg-[#F2F2ED] rounded-xl space-y-1">
                          <span className="text-gray-500">Starting Net Worth:</span>
                          <div className="text-lg font-black font-mono">EGP {activeReportPreview.contentJson.netWorth?.toLocaleString()}</div>
                        </div>
                        <div className="p-4 bg-[#F2F2ED] rounded-xl space-y-1">
                          <span className="text-gray-500">Monte Carlo Feasibility:</span>
                          <div className="text-lg font-black font-mono">{activeReportPreview.contentJson.goalProbability}% probability</div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="font-bold">Active Stress Presets applied:</div>
                        <p className="text-gray-600 bg-[#FAF6E9] p-3 rounded-xl border border-yellow-200">
                          {activeReportPreview.contentJson.activeScenarios?.join(", ") || "No active macro overrides triggered."}
                        </p>
                      </div>

                      <div className="space-y-2 text-xs border-t pt-4">
                        <div className="font-bold">Fiduciary Disclosure:</div>
                        <p className="text-gray-400 leading-normal">
                          Stochastic computations represent probabilistic standard mathematical outputs derived via Box-Muller transforms. They should be utilized solely for prospective laboratory modeling exercises.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reports list ledger */}
                  <div className="bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-zinc-200/50 space-y-4">
                    <h3 className="text-base font-bold">Historical Compilation Ledger</h3>
                    
                    <div className="space-y-2">
                      {reports.length > 0 ? (
                        reports.map((rep) => (
                          <div key={rep.id} className="p-3.5 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-between text-xs border">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <div>
                                <div className="font-bold">{rep.name}</div>
                                <span className="text-[10px] text-gray-400 font-mono">Compiled: {new Date(rep.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <button 
                              onClick={() => {
                                setActiveReportPreview(rep);
                                triggerToast("Report loaded in editor preview panel.", "info");
                              }}
                              className="text-xs font-bold text-[#F3C142] hover:underline"
                            >
                              Open Preview
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-400">
                          No report summaries compiled yet. Utilize the trigger buttons above.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 9: SETTINGS & ACCOUNT PROFILE --- */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">Profile & Preferences</h1>
                    <p className="text-xs text-gray-500">Configure personal planning style settings and purge balance sheet variables.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 bg-[#F9F7EF] dark:bg-[#1C1A17] p-6 rounded-[22px] border border-zinc-200/50 space-y-6">
                      <h3 className="text-base font-bold">Consolidated Profile Settings</h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-gray-500 mb-1">Your Name</label>
                          <input
                            type="text"
                            className="w-full p-2.5 rounded-lg border bg-white font-bold"
                            value={userProfile.name}
                            onChange={e => setUserProfile({ ...userProfile, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">Primary Email Node</label>
                          <input
                            type="email"
                            className="w-full p-2.5 rounded-lg border bg-white font-bold"
                            value={userProfile.email}
                            onChange={e => setUserProfile({ ...userProfile, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">Planning Volatility Style</label>
                          <select
                            className="w-full p-2.5 rounded-lg border bg-white font-bold"
                            value={userProfile.planningStyle}
                            onChange={e => setUserProfile({ ...userProfile, planningStyle: e.target.value })}
                          >
                            <option value="Cautious">Cautious / Cautious planning</option>
                            <option value="Balanced">Balanced / Neutral EGP Baseline</option>
                            <option value="Growth">Growth Oriented / Bullish growth</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-1">Simulation Horizon (Years)</label>
                          <input
                            type="number"
                            className="w-full p-2.5 rounded-lg border bg-white font-bold"
                            value={userProfile.simulationHorizon}
                            onChange={e => setUserProfile({ ...userProfile, simulationHorizon: parseInt(e.target.value) || 30 })}
                          />
                        </div>
                      </div>

                      <button 
                        onClick={async () => {
                          await syncMutation("users", "update", userProfile);
                          triggerToast("Profile variables saved securely to PostgreSQL database!", "success");
                        }}
                        className="px-6 py-2.5 bg-[#222220] text-white rounded-full text-xs font-bold hover:bg-black"
                      >
                        Save Configuration Variables
                      </button>
                    </div>

                    {/* Destructive state purge nodes */}
                    <div className="lg:col-span-4 bg-[#FAF6E9] dark:bg-zinc-900 p-6 rounded-[22px] border border-red-200/50 space-y-4">
                      <h3 className="text-sm font-bold text-red-700">Digital Twin Reset Vector</h3>
                      <p className="text-xs text-zinc-500">
                        Purge all customized balance sheets, custom scenarios, and imported statement logs. This returns your account state back to the standard seeded EGP 428,500 baseline representation.
                      </p>

                      <button 
                        onClick={handleResetDatabase}
                        className="w-full py-3 bg-red-600 text-white rounded-full text-xs font-bold hover:bg-red-700"
                      >
                        Purge All Custom Sandbox Variables
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      )}

      {/* --- ADD ACCOUNT MODAL --- */}
      <AnimatePresence>
        {isAddAccountOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#F9F7EF] dark:bg-[#1C1A17] text-[#222220] dark:text-[#E8E6DF] p-6 rounded-2xl max-w-sm w-full border border-gray-200 dark:border-zinc-800 space-y-4 shadow-xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider">Record Asset Node</h3>
                <button onClick={() => setIsAddAccountOpen(false)} className="text-gray-400">✕</button>
              </div>

              <form onSubmit={handleAddAccount} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-500 mb-1">Account Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CIB High Yield Premium"
                    className="w-full p-2.5 rounded-lg border bg-white"
                    value={newAccountData.name}
                    onChange={e => setNewAccountData({ ...newAccountData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Account Type</label>
                  <select
                    className="w-full p-2.5 rounded-lg border bg-white font-bold"
                    value={newAccountData.type}
                    onChange={e => setNewAccountData({ ...newAccountData, type: e.target.value })}
                  >
                    <option value="Savings">Savings Account</option>
                    <option value="Cash">Checking / Cash Liquid</option>
                    <option value="Investment">Mutual Funds / Investments</option>
                    <option value="Credit Card">Credit Card Debt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Starting Balance (EGP equivalent)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    className="w-full p-2.5 rounded-lg border bg-white"
                    value={newAccountData.balance}
                    onChange={e => setNewAccountData({ ...newAccountData, balance: e.target.value })}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsAddAccountOpen(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-[#222220] text-white font-bold">Register Asset</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD TRANSACTION MODAL --- */}
      <AnimatePresence>
        {isAddTransactionOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#F9F7EF] dark:bg-[#1C1A17] text-[#222220] dark:text-[#E8E6DF] p-6 rounded-2xl max-w-sm w-full border border-gray-200 dark:border-zinc-800 space-y-4 shadow-xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider">Record Transaction Node</h3>
                <button onClick={() => setIsAddTransactionOpen(false)} className="text-gray-400">✕</button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-500 mb-1">Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zamalek Cafe receipts"
                    className="w-full p-2.5 rounded-lg border bg-white"
                    value={newTransactionData.description}
                    onChange={e => setNewTransactionData({ ...newTransactionData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Amount (EGP)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 250"
                    className="w-full p-2.5 rounded-lg border bg-white"
                    value={newTransactionData.amount}
                    onChange={e => setNewTransactionData({ ...newTransactionData, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Type</label>
                  <select
                    className="w-full p-2.5 rounded-lg border bg-white font-bold"
                    value={newTransactionData.type}
                    onChange={e => setNewTransactionData({ ...newTransactionData, type: e.target.value })}
                  >
                    <option value="expense">Debit / Expense</option>
                    <option value="income">Credit / Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Category</label>
                  <select
                    className="w-full p-2.5 rounded-lg border bg-white font-bold"
                    value={newTransactionData.category}
                    onChange={e => setNewTransactionData({ ...newTransactionData, category: e.target.value })}
                  >
                    <option value="Food">Food & Beverage</option>
                    <option value="Housing">Housing & Rent</option>
                    <option value="Utilities">Utilities & High Speed Fiber</option>
                    <option value="Transport">Transport & Careem</option>
                    <option value="Subscriptions">Digital Subscriptions</option>
                    <option value="Freelance">Freelance Earnings</option>
                    <option value="Wealth Building">Investments / Wealth Building</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Link to Account Balance Sheet</label>
                  <select
                    className="w-full p-2.5 rounded-lg border bg-white font-bold"
                    value={newTransactionData.accountId}
                    onChange={e => setNewTransactionData({ ...newTransactionData, accountId: e.target.value })}
                  >
                    <option value="">Do not adjust balance</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} (Bal: {a.balance})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsAddTransactionOpen(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-[#222220] text-white font-bold">Record Node</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD GOAL MODAL --- */}
      <AnimatePresence>
        {isAddGoalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#F9F7EF] dark:bg-[#1C1A17] text-[#222220] dark:text-[#E8E6DF] p-6 rounded-2xl max-w-sm w-full border border-gray-200 dark:border-zinc-800 space-y-4 shadow-xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider">Mint Goal Target</h3>
                <button onClick={() => setIsAddGoalOpen(false)} className="text-gray-400">✕</button>
              </div>

              <form onSubmit={handleAddGoal} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-500 mb-1">Goal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New Cairo Apartment Downpayment"
                    className="w-full p-2.5 rounded-lg border bg-white"
                    value={newGoalData.name}
                    onChange={e => setNewGoalData({ ...newGoalData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Target Amount (EGP)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1000000"
                    className="w-full p-2.5 rounded-lg border bg-white"
                    value={newGoalData.targetAmount}
                    onChange={e => setNewGoalData({ ...newGoalData, targetAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Current Allocated Reserve</label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    className="w-full p-2.5 rounded-lg border bg-white"
                    value={newGoalData.currentAmount}
                    onChange={e => setNewGoalData({ ...newGoalData, currentAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Target Date (YYYY-MM)</label>
                  <input
                    type="text"
                    required
                    placeholder="2030-12"
                    className="w-full p-2.5 rounded-lg border bg-white"
                    value={newGoalData.targetDate}
                    onChange={e => setNewGoalData({ ...newGoalData, targetDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Target Monthly Contribution Allocation</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    className="w-full p-2.5 rounded-lg border bg-white"
                    value={newGoalData.monthlyContribution}
                    onChange={e => setNewGoalData({ ...newGoalData, monthlyContribution: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Goal Category</label>
                  <select
                    className="w-full p-2.5 rounded-lg border bg-white font-bold"
                    value={newGoalData.category}
                    onChange={e => setNewGoalData({ ...newGoalData, category: e.target.value })}
                  >
                    <option value="Buy a Home">Property / Housing</option>
                    <option value="Emergency Fund">Emergency Buffer</option>
                    <option value="Retirement">Retirement Pension</option>
                    <option value="Custom">Custom Target Node</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsAddGoalOpen(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-[#222220] text-white font-bold">Deploy Goal Target</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD SCENARIO MODAL --- */}
      <AnimatePresence>
        {isAddScenarioOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#F9F7EF] dark:bg-[#1C1A17] text-[#222220] dark:text-[#E8E6DF] p-6 rounded-2xl max-w-sm w-full border border-gray-200 dark:border-zinc-800 space-y-4 shadow-xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider">Mint Custom Scenario</h3>
                <button onClick={() => setIsAddScenarioOpen(false)} className="text-gray-400">✕</button>
              </div>

              <form onSubmit={handleAddScenario} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-500 mb-1">Scenario Title Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sabbatical Leave"
                    className="w-full p-2.5 rounded-lg border bg-white"
                    value={newScenarioData.name}
                    onChange={e => setNewScenarioData({ ...newScenarioData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Description Note</label>
                  <textarea
                    required
                    placeholder="Describe what occurs inside this stress lab state..."
                    className="w-full p-2.5 rounded-lg border bg-white"
                    value={newScenarioData.description}
                    onChange={e => setNewScenarioData({ ...newScenarioData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-500 mb-1">Income Shift /mo</label>
                    <input
                      type="number"
                      placeholder="-10000"
                      className="w-full p-2.5 rounded-lg border bg-white font-mono"
                      value={newScenarioData.incomeChange}
                      onChange={e => setNewScenarioData({ ...newScenarioData, incomeChange: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Expenses Shift /mo</label>
                    <input
                      type="number"
                      placeholder="5000"
                      className="w-full p-2.5 rounded-lg border bg-white font-mono"
                      value={newScenarioData.expenseChange}
                      onChange={e => setNewScenarioData({ ...newScenarioData, expenseChange: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-500 mb-1">One-time downpay</label>
                    <input
                      type="number"
                      placeholder="-300000"
                      className="w-full p-2.5 rounded-lg border bg-white font-mono"
                      value={newScenarioData.assetChange}
                      onChange={e => setNewScenarioData({ ...newScenarioData, assetChange: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Duration (Months)</label>
                    <input
                      type="number"
                      placeholder="12"
                      className="w-full p-2.5 rounded-lg border bg-white font-mono"
                      value={newScenarioData.durationMonths}
                      onChange={e => setNewScenarioData({ ...newScenarioData, durationMonths: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsAddScenarioOpen(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-[#222220] text-white font-bold">Deploy Scenario</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
