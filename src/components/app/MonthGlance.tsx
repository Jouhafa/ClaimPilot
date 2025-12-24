"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";

export function MonthGlance() {
  const { transactions, incomeConfig, buckets } = useApp();

  const stats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Filter this month's transactions
    const monthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Calculate spending (negative amounts)
    const spent = monthTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate income (positive amounts)
    const income = monthTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    // Get budget from income config or estimate
    const monthlyIncome = incomeConfig?.monthlyIncome || income || 45000;
    
    // Calculate budget (assume 70% of income for spending)
    const spendingBucket = buckets.find(b => 
      b.name.toLowerCase().includes("need") || b.name.toLowerCase().includes("spend")
    );
    const budget = spendingBucket 
      ? Math.round(monthlyIncome * (spendingBucket.targetPercentage / 100))
      : Math.round(monthlyIncome * 0.7);

    // Calculate saved (income - spent)
    const saved = Math.max(0, income - spent);

    // Calculate percentage
    const percentSpent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

    // Days in month calculations
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysRemaining = lastDay - today.getDate();
    const daysPassed = today.getDate();

    // Calculate daily budget vs daily spending
    const expectedSpentByNow = (budget / lastDay) * daysPassed;
    const dailyBudget = budget / lastDay;
    const actualDaily = spent / daysPassed;
    const onTrack = spent <= expectedSpentByNow;
    const overPace = spent - expectedSpentByNow;

    // Category breakdown for insights
    const categoryBreakdown: Record<string, number> = {};
    monthTransactions
      .filter(t => t.amount < 0)
      .forEach(t => {
        const cat = t.category || "other";
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Math.abs(t.amount);
      });

    // Get top category
    const topCategory = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])[0];

    // Calculate remaining daily budget
    const remainingBudget = Math.max(0, budget - spent);
    const remainingDailyBudget = daysRemaining > 0 ? Math.round(remainingBudget / daysRemaining) : 0;

    return {
      spent,
      budget,
      saved,
      percentSpent,
      daysRemaining,
      onTrack,
      overPace,
      topCategory,
      remainingDailyBudget,
      expectedSpentByNow,
    };
  }, [transactions, incomeConfig, buckets]);

  // Generate actionable insight
  const getInsight = () => {
    if (stats.onTrack) {
      return {
        text: `You're on track! Spend up to ${stats.remainingDailyBudget.toLocaleString()} AED/day to stay within budget.`,
        color: "text-green-600 dark:text-green-400",
      };
    } else {
      const weeklyReduction = Math.round(stats.overPace / (stats.daysRemaining / 7));
      const topCatName = stats.topCategory 
        ? stats.topCategory[0].charAt(0).toUpperCase() + stats.topCategory[0].slice(1).replace(/_/g, " ")
        : "spending";
      return {
        text: `You're ${Math.round(stats.overPace).toLocaleString()} AED over pace. Cut ${topCatName} by ${weeklyReduction.toLocaleString()} AED/week to recover.`,
        color: "text-amber-600 dark:text-amber-400",
      };
    }
  };

  const insight = getInsight();

  const getProgressColor = (percent: number, onTrack: boolean) => {
    if (!onTrack) return "bg-amber-500";
    if (percent > 90) return "bg-amber-500";
    if (percent > 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">This month at a glance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Budget used</span>
            <span className={cn(
              "font-medium",
              !stats.onTrack && "text-amber-500",
              stats.onTrack && stats.percentSpent <= 75 && "text-green-500"
            )}>
              {stats.percentSpent}%
            </span>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", getProgressColor(stats.percentSpent, stats.onTrack))}
              style={{ width: `${Math.min(100, stats.percentSpent)}%` }}
            />
            {/* Day progress marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
              style={{ left: `${(new Date().getDate() / 30) * 100}%` }}
              title="Expected progress"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats.spent.toLocaleString()} AED spent</span>
            <span>of {stats.budget.toLocaleString()} AED</span>
          </div>
        </div>

        {/* Actionable Insight */}
        <div className={cn("text-sm font-medium p-3 rounded-lg bg-muted/50", insight.color)}>
          {insight.text}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Saved this month</p>
            <p className="text-lg font-bold text-green-500">
              {stats.saved.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">AED</span>
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Days remaining</p>
            <p className="text-lg font-bold">
              {stats.daysRemaining} <span className="text-xs font-normal text-muted-foreground">days</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
