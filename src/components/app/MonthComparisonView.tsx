"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/context";
import { CATEGORY_CONFIG, type TransactionCategory } from "@/lib/types";
import { getMonthOverMonthComparison } from "@/lib/categories";
import type { Transaction } from "@/lib/types";

interface MonthComparisonViewProps {
  selectedMonth: Date;
}

export function MonthComparisonView({ selectedMonth }: MonthComparisonViewProps) {
  const { transactions, recurring, goals } = useApp();

  // Get transactions for selected month and previous month
  const comparisonData = useMemo(() => {
    const selectedMonthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const selectedMonthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
    const previousMonthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    const previousMonthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 0, 23, 59, 59);

    const selectedMonthTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= selectedMonthStart && txDate <= selectedMonthEnd && tx.amount < 0 && !tx.parentId;
    });

    const previousMonthTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= previousMonthStart && txDate <= previousMonthEnd && tx.amount < 0 && !tx.parentId;
    });

    // Category comparison
    const categoryComparison = getMonthOverMonthComparison(transactions, selectedMonth);

    // Total spending comparison
    const selectedTotal = selectedMonthTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const previousTotal = previousMonthTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalChange = selectedTotal - previousTotal;
    const totalChangePercent = previousTotal > 0 ? ((selectedTotal - previousTotal) / previousTotal) * 100 : selectedTotal > 0 ? 100 : 0;

    // Merchant comparison (top 5)
    const selectedMerchants: Record<string, number> = {};
    const previousMerchants: Record<string, number> = {};

    selectedMonthTransactions.forEach((tx) => {
      const merchant = tx.merchant || "Unknown";
      selectedMerchants[merchant] = (selectedMerchants[merchant] || 0) + Math.abs(tx.amount);
    });

    previousMonthTransactions.forEach((tx) => {
      const merchant = tx.merchant || "Unknown";
      previousMerchants[merchant] = (previousMerchants[merchant] || 0) + Math.abs(tx.amount);
    });

    const merchantDeltas = Object.keys({ ...selectedMerchants, ...previousMerchants })
      .map((merchant) => ({
        merchant,
        selected: selectedMerchants[merchant] || 0,
        previous: previousMerchants[merchant] || 0,
        change: (selectedMerchants[merchant] || 0) - (previousMerchants[merchant] || 0),
        changePercent: previousMerchants[merchant] > 0
          ? (((selectedMerchants[merchant] || 0) - previousMerchants[merchant]) / previousMerchants[merchant]) * 100
          : (selectedMerchants[merchant] || 0) > 0 ? 100 : 0,
      }))
      .filter((m) => m.selected > 0 || m.previous > 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5);

    // Recurring comparison
    const selectedRecurring = recurring.filter((r) => {
      const rDate = new Date(r.lastOccurrence);
      return rDate >= selectedMonthStart && rDate <= selectedMonthEnd;
    });
    const previousRecurring = recurring.filter((r) => {
      const rDate = new Date(r.lastOccurrence);
      return rDate >= previousMonthStart && rDate <= previousMonthEnd;
    });

    // Goals progress comparison
    const goalsProgress = goals.map((goal) => {
      const selectedProgress = selectedMonthTransactions
        .filter((tx) => tx.category === goal.category)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      const previousProgress = previousMonthTransactions
        .filter((tx) => tx.category === goal.category)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      return {
        goal: goal.name,
        selected: selectedProgress,
        previous: previousProgress,
        change: selectedProgress - previousProgress,
      };
    });

    return {
      categoryComparison,
      totalSpending: {
        selected: selectedTotal,
        previous: previousTotal,
        change: totalChange,
        changePercent: totalChangePercent,
      },
      merchantDeltas,
      recurring: {
        selected: selectedRecurring.length,
        previous: previousRecurring.length,
        change: selectedRecurring.length - previousRecurring.length,
      },
      goalsProgress,
    };
  }, [transactions, selectedMonth, recurring, goals]);

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const previousMonth = new Date(selectedMonth);
  previousMonth.setMonth(previousMonth.getMonth() - 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Month Comparison</h2>
        <p className="text-muted-foreground">
          {formatMonth(selectedMonth)} vs {formatMonth(previousMonth)}
        </p>
      </div>

      {/* Total Spending Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Total Spending</CardTitle>
          <CardDescription>Overall spending comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">
                AED {comparisonData.totalSpending.selected.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Last Month</p>
              <p className="text-2xl font-bold text-muted-foreground">
                AED {comparisonData.totalSpending.previous.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Change</span>
              <Badge
                variant={comparisonData.totalSpending.change > 0 ? "destructive" : comparisonData.totalSpending.change < 0 ? "default" : "secondary"}
                className="text-sm px-3 py-1"
              >
                {comparisonData.totalSpending.change > 0 ? "+" : ""}
                {comparisonData.totalSpending.change.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} AED
                {" "}({comparisonData.totalSpending.changePercent > 0 ? "+" : ""}
                {comparisonData.totalSpending.changePercent.toFixed(1)}%)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Deltas */}
      <Card>
        <CardHeader>
          <CardTitle>Category Changes</CardTitle>
          <CardDescription>Spending by category comparison</CardDescription>
        </CardHeader>
        <CardContent>
          {comparisonData.categoryComparison.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No category data available</p>
          ) : (
            <div className="space-y-3">
              {comparisonData.categoryComparison
                .filter((c) => c.currentMonth > 0 || c.previousMonth > 0)
                .sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage))
                .slice(0, 8)
                .map(({ category, label, currentMonth, previousMonth, change, changePercentage }) => (
                  <div key={category} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: CATEGORY_CONFIG[category]?.color || "#6b7280" }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{label}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            This: AED {currentMonth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Last: AED {previousMonth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={change > 0 ? "destructive" : change < 0 ? "default" : "secondary"}
                      className="ml-4"
                    >
                      {change > 0 ? "+" : ""}{changePercentage.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Merchant Changes */}
      {comparisonData.merchantDeltas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Merchant Changes</CardTitle>
            <CardDescription>Merchants with biggest spending changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparisonData.merchantDeltas.map((merchant, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{merchant.merchant}</p>
                    <p className="text-xs text-muted-foreground">
                      {merchant.selected > 0 && `This: AED ${merchant.selected.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
                      {merchant.previous > 0 && ` • Last: AED ${merchant.previous.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
                    </p>
                  </div>
                  <Badge
                    variant={merchant.change > 0 ? "destructive" : merchant.change < 0 ? "default" : "secondary"}
                    className="ml-4"
                  >
                    {merchant.change > 0 ? "+" : ""}{merchant.changePercent.toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurring Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring & Subscriptions</CardTitle>
          <CardDescription>Active recurring transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-xl font-bold">{comparisonData.recurring.selected}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Month</p>
              <p className="text-xl font-bold text-muted-foreground">{comparisonData.recurring.previous}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Change</p>
              <Badge
                variant={comparisonData.recurring.change > 0 ? "destructive" : comparisonData.recurring.change < 0 ? "default" : "secondary"}
                className="text-sm"
              >
                {comparisonData.recurring.change > 0 ? "+" : ""}{comparisonData.recurring.change}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

