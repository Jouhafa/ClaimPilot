/**
 * Story Topics and Slides for Layer 2 (Story View)
 * Each topic defines a deck of 3-6 slides with deterministic data
 */

import type { Transaction } from "@/lib/types";
import { 
  getCategoryBreakdown, 
  getMonthOverMonthComparison, 
  getCashflowSummary, 
  getTopMerchants 
} from "@/lib/categories";
import type { InsightTopicId } from "./InsightCardTopics";

export interface StorySlide {
  id: string;
  title: string;
  chartType: "donut" | "bars" | "lines" | "metric";
  data: any;
}

export interface StoryDeck {
  topicId: InsightTopicId;
  title: string;
  slides: StorySlide[];
}

/**
 * Generate story deck for a topic
 */
export function getStoryDeck(
  topicId: InsightTopicId,
  transactions: Transaction[],
  selectedMonth: Date
): StoryDeck {
  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

  const monthTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= monthStart && txDate <= monthEnd && t.amount < 0 && !t.parentId;
  });

  switch (topicId) {
    case "spending-overview": {
      const total = monthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const categoryBreakdown = getCategoryBreakdown(monthTransactions);
      
      return {
        topicId: "spending-overview",
        title: "Spending Overview",
        slides: [
          {
            id: "total",
            title: "Total Spending",
            chartType: "metric",
            data: { value: total, unit: "AED", label: "This month" },
          },
          {
            id: "categories",
            title: "By Category",
            chartType: "donut",
            data: categoryBreakdown.slice(0, 8).map(cat => ({
              name: cat.label,
              value: cat.total,
              color: cat.color,
            })),
          },
          {
            id: "top3",
            title: "Top 3 Categories",
            chartType: "bars",
            data: categoryBreakdown.slice(0, 3).map(cat => ({
              label: cat.label,
              value: cat.total,
              color: cat.color,
            })),
          },
        ],
      };
    }

    case "category-breakdown": {
      const categoryBreakdown = getCategoryBreakdown(monthTransactions);
      
      return {
        topicId: "category-breakdown",
        title: "Category Breakdown",
        slides: [
          {
            id: "all",
            title: "All Categories",
            chartType: "donut",
            data: categoryBreakdown.slice(0, 8).map(cat => ({
              name: cat.label,
              value: cat.total,
              color: cat.color,
            })),
          },
          {
            id: "top5",
            title: "Top 5",
            chartType: "bars",
            data: categoryBreakdown.slice(0, 5).map(cat => ({
              label: cat.label,
              value: cat.total,
              color: cat.color,
            })),
          },
        ],
      };
    }

    case "cashflow": {
      const allMonthTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= monthStart && txDate <= monthEnd && !t.parentId;
      });
      const cashflow = getCashflowSummary(allMonthTransactions);
      
      return {
        topicId: "cashflow",
        title: "Cashflow",
        slides: [
          {
            id: "net",
            title: "Net Cashflow",
            chartType: "metric",
            data: { value: cashflow.netCashflow, unit: "AED" },
          },
          {
            id: "inout",
            title: "Inflow vs Outflow",
            chartType: "donut",
            data: [
              { name: "Inflow", value: cashflow.totalInflow, color: "#22c55e" },
              { name: "Outflow", value: cashflow.totalOutflow, color: "#ef4444" },
            ],
          },
        ],
      };
    }

    case "trends": {
      const monthComparison = getMonthOverMonthComparison(transactions, selectedMonth);
      
      return {
        topicId: "trends",
        title: "Month-over-Month Trends",
        slides: [
          {
            id: "changes",
            title: "Category Changes",
            chartType: "bars",
            data: monthComparison.slice(0, 8).map(change => ({
              label: change.label,
              value: change.change,
              percentage: change.changePercentage,
              isPositive: change.change < 0,
            })),
          },
        ],
      };
    }

    case "merchants": {
      const topMerchants = getTopMerchants(monthTransactions, 10);
      
      return {
        topicId: "merchants",
        title: "Top Merchants",
        slides: [
          {
            id: "top10",
            title: "Top 10 Merchants",
            chartType: "bars",
            data: topMerchants.map(merchant => ({
              label: merchant.merchant,
              value: merchant.total,
              count: merchant.count,
            })),
          },
        ],
      };
    }

    default:
      return {
        topicId: "spending-overview",
        title: "Spending Overview",
        slides: [],
      };
  }
}
