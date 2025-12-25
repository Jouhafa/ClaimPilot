import type { Transaction, RecurringTransaction, TransactionCategory } from "./types";
import { CATEGORY_CONFIG } from "./types";
import { v4 as uuidv4 } from "uuid";

/**
 * Detect recurring transactions from a list of transactions
 * Groups by merchant and looks for patterns (same amount, ~30 day intervals)
 */
export function detectRecurringTransactions(
  transactions: Transaction[]
): RecurringTransaction[] {
  // Filter out income/credits and split children
  const expenses = transactions.filter(
    (tx) => tx.amount < 0 && !tx.parentId
  );

  // Group by normalized merchant name
  const byMerchant: Record<string, Transaction[]> = {};
  expenses.forEach((tx) => {
    const key = tx.merchant.toLowerCase().trim();
    if (!byMerchant[key]) {
      byMerchant[key] = [];
    }
    byMerchant[key].push(tx);
  });

  const recurring: RecurringTransaction[] = [];

  Object.entries(byMerchant).forEach(([merchantKey, txs]) => {
    if (txs.length < 2) return; // Need at least 2 transactions

    // Sort by date
    const sorted = [...txs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Check for recurring pattern
    const analysis = analyzePattern(sorted);
    
    if (analysis.isRecurring) {
      const averageAmount =
        sorted.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / sorted.length;

      // Get the most common category
      const categoryCounts: Record<string, number> = {};
      sorted.forEach((tx) => {
        const cat = tx.category || "other";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      const mostCommonCategory = Object.entries(categoryCounts).sort(
        (a, b) => b[1] - a[1]
      )[0][0] as TransactionCategory;

      // Calculate next expected date
      const lastDate = new Date(sorted[sorted.length - 1].date);
      const nextDate = new Date(lastDate);
      switch (analysis.frequency) {
        case "weekly":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "monthly":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case "quarterly":
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case "yearly":
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      recurring.push({
        id: uuidv4(),
        merchantPattern: merchantKey,
        normalizedMerchant: sorted[0].merchant, // Use original casing from first tx
        category: mostCommonCategory,
        averageAmount,
        frequency: analysis.frequency,
        lastOccurrence: sorted[sorted.length - 1].date,
        nextExpected: nextDate.toISOString().split("T")[0],
        occurrences: sorted.length,
        transactionIds: sorted.map((tx) => tx.id),
        isActive: true,
        isUserConfirmed: false,
      });
    }
  });

  // Sort by average amount (highest first)
  return recurring.sort((a, b) => b.averageAmount - a.averageAmount);
}

interface PatternAnalysis {
  isRecurring: boolean;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  confidence: "high" | "medium" | "low";
  averageInterval: number; // in days
}

function analyzePattern(sortedTransactions: Transaction[]): PatternAnalysis {
  if (sortedTransactions.length < 2) {
    return { isRecurring: false, frequency: "monthly", confidence: "low", averageInterval: 0 };
  }

  // Calculate intervals between transactions
  const intervals: number[] = [];
  for (let i = 1; i < sortedTransactions.length; i++) {
    const prev = new Date(sortedTransactions[i - 1].date);
    const curr = new Date(sortedTransactions[i].date);
    const daysDiff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }

  const averageInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

  // Check amount consistency - relaxed to 30% variance
  const amounts = sortedTransactions.map((tx) => Math.abs(tx.amount));
  const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  const amountVariance =
    amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length;
  const amountStdDev = Math.sqrt(amountVariance);
  const amountConsistent = amountStdDev / avgAmount < 0.30; // Relaxed to 30% variance threshold

  // Determine frequency - with more relaxed interval ranges
  let frequency: "weekly" | "monthly" | "quarterly" | "yearly" = "monthly";
  let isRecurring = false;
  let confidence: "high" | "medium" | "low" = "low";

  if (averageInterval >= 5 && averageInterval <= 12) {
    // Relaxed weekly range (was 5-10)
    frequency = "weekly";
    isRecurring = intervals.length >= 2 && amountConsistent; // Relaxed from 3 to 2
    confidence = intervals.length >= 3 ? "high" : "medium";
  } else if (averageInterval >= 20 && averageInterval <= 45) {
    // Relaxed monthly range (was 25-35)
    frequency = "monthly";
    isRecurring = amountConsistent; // Removed interval count requirement
    confidence = intervals.length >= 2 ? "high" : "medium";
  } else if (averageInterval >= 75 && averageInterval <= 110) {
    // Relaxed quarterly range (was 85-100)
    frequency = "quarterly";
    isRecurring = true; // Always treat as recurring if pattern matches
    confidence = intervals.length >= 2 ? "high" : "medium";
  } else if (averageInterval >= 330 && averageInterval <= 400) {
    // Relaxed yearly range (was 350-380)
    frequency = "yearly";
    isRecurring = true;
    confidence = "medium";
  }

  // Lower threshold for known subscription categories
  const firstTx = sortedTransactions[0];
  const knownSubscriptionCategories: TransactionCategory[] = [
    "subscriptions",
    "utilities",
    "rent",
    "insurance",
  ];
  if (
    firstTx.category &&
    knownSubscriptionCategories.includes(firstTx.category)
  ) {
    if (!isRecurring && averageInterval >= 20 && averageInterval <= 50) {
      isRecurring = true;
      frequency = "monthly";
      confidence = "medium";
    }
  }

  // Fallback: If we see 2+ transactions from same merchant, consider it potentially recurring
  if (!isRecurring && sortedTransactions.length >= 2) {
    // Check if amounts are roughly similar (within 50%)
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    if (minAmount / maxAmount > 0.5) {
      isRecurring = true;
      // Guess frequency based on average interval
      if (averageInterval <= 15) frequency = "weekly";
      else if (averageInterval <= 50) frequency = "monthly";
      else if (averageInterval <= 120) frequency = "quarterly";
      else frequency = "yearly";
      confidence = "low";
    }
  }

  return {
    isRecurring,
    frequency,
    confidence,
    averageInterval,
  };
}

/**
 * Get summary statistics for recurring transactions
 */
export function getRecurringSummary(recurring: RecurringTransaction[]): {
  totalMonthly: number;
  totalYearly: number;
  byCategory: { category: TransactionCategory; monthly: number; count: number }[];
  activeCount: number;
} {
  let totalMonthly = 0;
  const byCategory: Record<TransactionCategory, { monthly: number; count: number }> = {} as Record<
    TransactionCategory,
    { monthly: number; count: number }
  >;

  recurring
    .filter((r) => r.isActive)
    .forEach((r) => {
      let monthlyAmount = r.averageAmount;
      switch (r.frequency) {
        case "weekly":
          monthlyAmount = r.averageAmount * 4.33;
          break;
        case "quarterly":
          monthlyAmount = r.averageAmount / 3;
          break;
        case "yearly":
          monthlyAmount = r.averageAmount / 12;
          break;
      }

      totalMonthly += monthlyAmount;

      if (!byCategory[r.category]) {
        byCategory[r.category] = { monthly: 0, count: 0 };
      }
      byCategory[r.category].monthly += monthlyAmount;
      byCategory[r.category].count += 1;
    });

  return {
    totalMonthly,
    totalYearly: totalMonthly * 12,
    byCategory: Object.entries(byCategory)
      .map(([cat, data]) => ({
        category: cat as TransactionCategory,
        monthly: data.monthly,
        count: data.count,
      }))
      .sort((a, b) => b.monthly - a.monthly),
    activeCount: recurring.filter((r) => r.isActive).length,
  };
}

/**
 * Check if a transaction matches a recurring pattern
 */
export function isTransactionRecurring(
  tx: Transaction,
  recurring: RecurringTransaction[]
): RecurringTransaction | null {
  const merchantKey = tx.merchant.toLowerCase().trim();
  return (
    recurring.find(
      (r) =>
        r.merchantPattern === merchantKey ||
        r.normalizedMerchant.toLowerCase() === merchantKey
    ) || null
  );
}

/**
 * Get upcoming recurring transactions for the next N days
 */
export function getUpcomingRecurring(
  recurring: RecurringTransaction[],
  daysAhead: number = 30
): {
  item: RecurringTransaction;
  expectedDate: Date;
  daysUntil: number;
}[] {
  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  return recurring
    .filter((r) => r.isActive)
    .map((r) => {
      const expectedDate = new Date(r.nextExpected);
      const daysUntil = Math.round(
        (expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return { item: r, expectedDate, daysUntil };
    })
    .filter((r) => r.expectedDate <= cutoff && r.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Detect anomalies: transactions that changed significantly from usual recurring amount
 */
export function detectRecurringAnomalies(
  transactions: Transaction[],
  recurring: RecurringTransaction[]
): {
  transaction: Transaction;
  recurring: RecurringTransaction;
  difference: number;
  percentageChange: number;
}[] {
  const anomalies: {
    transaction: Transaction;
    recurring: RecurringTransaction;
    difference: number;
    percentageChange: number;
  }[] = [];

  transactions.forEach((tx) => {
    const match = isTransactionRecurring(tx, recurring);
    if (match) {
      const amount = Math.abs(tx.amount);
      const difference = amount - match.averageAmount;
      const percentageChange = (difference / match.averageAmount) * 100;

      // Flag if more than 20% different from average
      if (Math.abs(percentageChange) > 20) {
        anomalies.push({
          transaction: tx,
          recurring: match,
          difference,
          percentageChange,
        });
      }
    }
  });

  return anomalies.sort(
    (a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange)
  );
}

