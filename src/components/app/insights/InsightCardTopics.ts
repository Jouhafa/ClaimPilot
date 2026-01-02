/**
 * Insight Card Topics for Layer 1 (Insights Home)
 * Each topic defines deterministic data computation and optional chart data
 */

import type { Transaction } from "@/lib/types";
import { 
  getCategoryBreakdown, 
  getMonthOverMonthComparison, 
  getCashflowSummary, 
  getTopMerchants,
  getFixedVsVariable 
} from "@/lib/categories";

export interface InsightCardData {
  id: string;
  title: string; // Question style
  description?: string;
  keyMetric: {
    value: number;
    unit: string;
    delta?: {
      value: number;
      percentage: number;
      isPositive: boolean;
    };
  };
  chartData?: {
    type: "mini-bars" | "mini-donut" | "mini-list";
    data: any[];
  };
}

export type InsightTopicId = "spending-overview" | "category-breakdown" | "cashflow" | "trends" | "merchants";

/**
 * Compute insight card data for a specific topic
 */
export function computeInsightCardData(
  topicId: InsightTopicId,
  transactions: Transaction[],
  selectedMonth: Date,
  incomeConfig?: { monthlyIncome: number } | null
): InsightCardData {
  const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
  const prevMonthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
  const prevMonthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 0, 23, 59, 59);

  const monthTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= monthStart && txDate <= monthEnd && t.amount < 0 && !t.parentId;
  });

  const prevMonthTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= prevMonthStart && txDate <= prevMonthEnd && t.amount < 0 && !t.parentId;
  });

  const monthTotal = monthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const prevMonthTotal = prevMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const delta = monthTotal - prevMonthTotal;
  const deltaPercent = prevMonthTotal > 0 ? ((delta / prevMonthTotal) * 100) : (monthTotal > 0 ? 100 : 0);

  switch (topicId) {
    case "spending-overview": {
      return {
        id: "spending-overview",
        title: "Where did your money go?",
        keyMetric: {
          value: monthTotal,
          unit: "AED",
          delta: prevMonthTotal > 0 ? {
            value: delta,
            percentage: deltaPercent,
            isPositive: delta < 0, // Negative delta (less spending) is positive
          } : undefined,
        },
        chartData: {
          type: "mini-bars",
          data: getCategoryBreakdown(monthTransactions).slice(0, 3).map(cat => ({
            label: cat.label,
            value: cat.total,
            color: cat.color,
          })),
        },
      };
    }

    case "category-breakdown": {
      const categoryBreakdown = getCategoryBreakdown(monthTransactions);
      const topCategory = categoryBreakdown[0];
      
      return {
        id: "category-breakdown",
        title: "What's your biggest category?",
        keyMetric: {
          value: topCategory?.total || 0,
          unit: "AED",
        },
        chartData: topCategory ? {
          type: "mini-list",
          data: categoryBreakdown.slice(0, 3).map(cat => ({
            label: cat.label,
            value: cat.total,
            percentage: cat.percentage,
            color: cat.color,
          })),
        } : undefined,
      };
    }

    case "cashflow": {
      const cashflow = getCashflowSummary(transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= monthStart && txDate <= monthEnd && !t.parentId;
      }));
      
      const monthlyIncome = incomeConfig?.monthlyIncome || cashflow.totalInflow;
      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - cashflow.totalOutflow) / monthlyIncome) * 100 : 0;

      return {
        id: "cashflow",
        title: "How's your cashflow?",
        keyMetric: {
          value: cashflow.netCashflow,
          unit: "AED",
        },
        chartData: {
          type: "mini-donut",
          data: [
            { name: "Income", value: cashflow.totalInflow, color: "#22c55e" },
            { name: "Expenses", value: cashflow.totalOutflow, color: "#ef4444" },
          ],
        },
      };
    }

    case "trends": {
      const monthComparison = getMonthOverMonthComparison(transactions, selectedMonth);
      const biggestChange = monthComparison.find(c => Math.abs(c.changePercentage) > 0);
      
      return {
        id: "trends",
        title: "What changed this month?",
        keyMetric: biggestChange ? {
          value: Math.abs(biggestChange.change),
          unit: biggestChange.label,
          delta: {
            value: biggestChange.change,
            percentage: biggestChange.changePercentage,
            isPositive: biggestChange.change < 0, // Less spending is positive
          },
        } : {
          value: 0,
          unit: "No data",
        },
        chartData: biggestChange ? {
          type: "mini-list",
          data: monthComparison.slice(0, 3).map(change => ({
            label: change.label,
            value: change.change,
            percentage: change.changePercentage,
            isPositive: change.change < 0,
          })),
        } : undefined,
      };
    }

    case "merchants": {
      const topMerchants = getTopMerchants(monthTransactions, 3);
      const topMerchant = topMerchants[0];
      
      return {
        id: "merchants",
        title: "Who did you spend with most?",
        keyMetric: {
          value: topMerchant?.total || 0,
          unit: topMerchant?.merchant || "No data",
        },
        chartData: topMerchant ? {
          type: "mini-list",
          data: topMerchants.map(merchant => ({
            label: merchant.merchant,
            value: merchant.total,
            count: merchant.count,
          })),
        } : undefined,
      };
    }

    default:
      throw new Error(`Unknown topic ID: ${topicId}`);
  }
}

/**
 * Get all insight topic IDs
 */
export function getAllInsightTopics(): InsightTopicId[] {
  return ["spending-overview", "category-breakdown", "cashflow", "trends", "merchants"];
}
