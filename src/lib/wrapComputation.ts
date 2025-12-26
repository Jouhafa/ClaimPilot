import { v4 as uuidv4 } from "uuid";
import type { Transaction, WrapData, WrapSnapshot, WrapType, WrapScope, TopMove, TransactionCategory } from "./types";
import { getCategoryBreakdown, getMonthOverMonthComparison } from "./categories";
import { getRecurringSummary } from "./recurringDetector";
import type { RecurringTransaction } from "./types";
import { CATEGORY_CONFIG } from "./types";

export interface ComputeWrapOptions {
  transactions: Transaction[];
  recurring: RecurringTransaction[];
  period: { start: Date; end: Date };
  scope?: WrapScope;
  currency?: string;
  previousMonthTransactions?: Transaction[];
  goals?: Array<{ id: string; name: string; currentAmount: number; targetAmount: number }>;
}

/**
 * Compute wrap data for a given period
 */
export function computeWrapData(options: ComputeWrapOptions): WrapData {
  const {
    transactions,
    recurring,
    period,
    scope = "all",
    currency = "AED",
    previousMonthTransactions = [],
    goals = [],
  } = options;

  // Filter transactions by scope and period
  let filteredTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate >= period.start && txDate <= period.end;
  });

  if (scope === "reimbursements") {
    filteredTransactions = filteredTransactions.filter((tx) => tx.tag === "reimbursable");
  } else if (scope === "personal") {
    filteredTransactions = filteredTransactions.filter((tx) => tx.tag === "personal" || !tx.tag);
  }

  // Calculate totals
  const expenses = filteredTransactions.filter((tx) => tx.amount < 0);
  const income = filteredTransactions.filter((tx) => tx.amount > 0);
  
  const totalSpent = expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalIncome = income.reduce((sum, tx) => sum + tx.amount, 0);
  const totalSaved = totalIncome - totalSpent;
  
  const totalReimbursable = filteredTransactions
    .filter((tx) => tx.tag === "reimbursable")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // Top categories (max 5)
  const categoryBreakdown = getCategoryBreakdown(filteredTransactions);
  const topCategories = categoryBreakdown.slice(0, 5).map((cat) => ({
    category: cat.category,
    amount: cat.total,
    percentage: cat.percentage,
  }));

  // Month-over-month changes (top 3)
  const allTransactionsForComparison = scope === "all" 
    ? transactions 
    : transactions.filter((tx) => {
        if (scope === "reimbursements") return tx.tag === "reimbursable";
        if (scope === "personal") return tx.tag === "personal" || !tx.tag;
        return true;
      });
  
  const monthComparison = getMonthOverMonthComparison(allTransactionsForComparison, period.end);
  const monthOverMonthChanges = monthComparison
    .filter((c) => Math.abs(c.change) > 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3)
    .map((c) => ({
      label: c.label,
      change: c.change,
      changePercent: c.changePercentage,
      isIncrease: c.change > 0,
    }));

  // Recurring/subscriptions
  const recurringSummary = getRecurringSummary(recurring);
  const recurringInPeriod = recurring.filter((r) => {
    const lastDate = new Date(r.lastOccurrence);
    return lastDate >= period.start && lastDate <= period.end;
  });
  
  const topRecurring = recurringInPeriod
    .slice(0, 5)
    .map((r) => ({
      merchant: r.normalizedMerchant,
      amount: r.averageAmount,
      frequency: r.frequency,
    }));

  // Reimbursements pipeline
  const reimbursementsPipeline = {
    draft: filteredTransactions.filter((tx) => tx.tag === "reimbursable" && tx.status === "draft").length,
    submitted: filteredTransactions.filter((tx) => tx.tag === "reimbursable" && tx.status === "submitted").length,
    paid: filteredTransactions.filter((tx) => tx.tag === "reimbursable" && tx.status === "paid").length,
    total: filteredTransactions.filter((tx) => tx.tag === "reimbursable").length,
  };

  // Flags
  const flags: WrapData["flags"] = [];
  
  const lowConfidence = filteredTransactions.filter((tx) => tx.tagConfidence === "low").length;
  if (lowConfidence > 0) {
    flags.push({
      type: "low_confidence",
      count: lowConfidence,
      message: `${lowConfidence} transaction${lowConfidence > 1 ? "s" : ""} with low confidence tags`,
    });
  }

  const untagged = filteredTransactions.filter((tx) => !tx.tag && !tx.suggestedTag).length;
  if (untagged > 0) {
    flags.push({
      type: "untagged",
      count: untagged,
      message: `${untagged} untagged transaction${untagged > 1 ? "s" : ""}`,
    });
  }

  // Unusual transactions (large amounts or outliers)
  const avgAmount = expenses.length > 0 
    ? expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / expenses.length 
    : 0;
  const unusual = expenses.filter((tx) => Math.abs(tx.amount) > avgAmount * 3).length;
  if (unusual > 0) {
    flags.push({
      type: "unusual",
      count: unusual,
      message: `${unusual} unusually large transaction${unusual > 1 ? "s" : ""}`,
    });
  }

  // Top 3 moves
  const top3Moves: TopMove[] = [];
  
  // Move 1: Review if there are untagged or low confidence
  if (untagged > 0 || lowConfidence > 0) {
    top3Moves.push({
      id: "review",
      title: "Review Transactions",
      description: `${untagged + lowConfidence} transaction${untagged + lowConfidence > 1 ? "s need" : " needs"} your attention`,
      action: "review",
      timeEstimate: "5 min",
      priority: "high",
    });
  }

  // Move 2: Reimbursements if any
  if (reimbursementsPipeline.draft > 0) {
    top3Moves.push({
      id: "reimbursements",
      title: "Submit Reimbursements",
      description: `${reimbursementsPipeline.draft} reimbursement${reimbursementsPipeline.draft > 1 ? "s" : ""} ready to claim`,
      action: "reimbursements",
      timeEstimate: "10 min",
      priority: "high",
    });
  }

  // Move 3: Goals if behind
  const behindGoals = goals.filter((g) => {
    const progress = (g.currentAmount / g.targetAmount) * 100;
    const expectedProgress = 100; // Simplified - could calculate based on target date
    return progress < expectedProgress * 0.8; // 80% of expected
  });
  
  if (behindGoals.length > 0) {
    top3Moves.push({
      id: "goals",
      title: "Catch Up on Goals",
      description: `${behindGoals.length} goal${behindGoals.length > 1 ? "s" : ""} need attention`,
      action: "goals",
      timeEstimate: "15 min",
      priority: "medium",
    });
  }

  // Fill remaining moves if needed
  if (top3Moves.length < 3) {
    top3Moves.push({
      id: "export",
      title: "Export Reports",
      description: "Generate finance-ready reports",
      action: "export",
      timeEstimate: "2 min",
      priority: "low",
    });
  }

  // Hero number - use total transactions or total spent
  const heroNumber = filteredTransactions.length;
  const heroLabel = "transactions";

  // Check if on track (simplified - could use goals/buckets)
  const isOnTrack = totalSaved >= 0; // Positive savings

  return {
    heroNumber,
    heroLabel,
    totalSpent,
    totalSaved,
    totalReimbursable,
    isOnTrack,
    topCategories,
    monthOverMonthChanges,
    recurringSummary: {
      total: recurringSummary.totalMonthly,
      count: recurringInPeriod.length,
      topItems: topRecurring,
    },
    reimbursementsPipeline,
    flags,
    top3Moves: top3Moves.slice(0, 3),
    currency,
  };
}

/**
 * Generate a monthly wrap snapshot
 */
export function generateMonthlyWrap(
  monthKey: string, // YYYY-MM
  options: ComputeWrapOptions
): WrapSnapshot {
  const [year, month] = monthKey.split("-").map(Number);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  const wrapData = computeWrapData({
    ...options,
    period: { start: periodStart, end: periodEnd },
  });

  const monthName = periodStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return {
    id: uuidv4(),
    type: "monthly",
    monthKey,
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    },
    createdAt: new Date().toISOString(),
    title: `${monthName} Wrap`,
    wrapData,
    version: "1.0",
  };
}

/**
 * Generate a custom wrap snapshot
 */
export function generateCustomWrap(
  period: { start: Date; end: Date },
  scope: WrapScope,
  options: ComputeWrapOptions
): WrapSnapshot {
  const wrapData = computeWrapData({
    ...options,
    period,
    scope,
  });

  const startStr = period.start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = period.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return {
    id: uuidv4(),
    type: "custom",
    period: {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    },
    scope,
    createdAt: new Date().toISOString(),
    title: `Wrap · ${startStr}–${endStr}`,
    wrapData,
    version: "1.0",
  };
}

