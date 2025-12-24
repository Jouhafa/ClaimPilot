"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { CATEGORY_CONFIG, type TransactionCategory } from "@/lib/types";
import { getCategoryBreakdown } from "@/lib/categories";
import { getRecurringSummary } from "@/lib/recurringDetector";
import { calculateCutImpact, estimateMonthlySavings } from "@/lib/goalEngine";

interface Suggestion {
  id: string;
  type: "cut" | "optimize" | "alert" | "opportunity";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact?: {
    monthlySavings: number;
    goalImpact?: string; // "Car goal 2 months closer"
  };
  category?: TransactionCategory;
  actionable: boolean;
}

export function SmartSuggestions() {
  const { transactions, goals, recurring, incomeConfig } = useApp();

  const monthlySavings = useMemo(() => {
    return estimateMonthlySavings(transactions, 3, incomeConfig?.monthlyIncome);
  }, [transactions, incomeConfig]);

  const categoryBreakdown = useMemo(() => getCategoryBreakdown(transactions), [transactions]);
  const recurringSummary = useMemo(() => getRecurringSummary(recurring), [recurring]);

  const suggestions = useMemo(() => {
    const results: Suggestion[] = [];

    // Get total spending
    const totalSpending = categoryBreakdown.reduce((sum, c) => sum + c.total, 0);

    // 1. High-percentage category suggestions
    categoryBreakdown.forEach(({ category, label, total, percentage }) => {
      if (category === "income" || category === "transfer" || category === "savings") return;

      // Dining over 15%
      if (category === "dining" && percentage > 15) {
        const potentialCut = total * 0.3; // Suggest 30% reduction
        const goalImpact = goals.length > 0 
          ? calculateCutImpact(goals[0], monthlySavings, potentialCut / 30)
          : null;

        results.push({
          id: `cut_${category}`,
          type: "cut",
          priority: percentage > 25 ? "high" : "medium",
          title: `Dining at ${percentage.toFixed(0)}% of spending`,
          description: `Cutting dining by 30% could save ${potentialCut.toFixed(0)} AED/month`,
          impact: {
            monthlySavings: potentialCut,
            goalImpact: goalImpact?.monthsSaved 
              ? `${goals[0].name} ${goalImpact.monthsSaved} months closer`
              : undefined,
          },
          category,
          actionable: true,
        });
      }

      // Shopping over 15%
      if (category === "shopping" && percentage > 15) {
        const potentialCut = total * 0.25;
        results.push({
          id: `cut_${category}`,
          type: "cut",
          priority: percentage > 20 ? "high" : "medium",
          title: `Shopping at ${percentage.toFixed(0)}% of spending`,
          description: `Consider reducing shopping by 25% to save ${potentialCut.toFixed(0)} AED/month`,
          impact: { monthlySavings: potentialCut },
          category,
          actionable: true,
        });
      }

      // Entertainment over 10%
      if (category === "entertainment" && percentage > 10) {
        const potentialCut = total * 0.3;
        results.push({
          id: `cut_${category}`,
          type: "cut",
          priority: "medium",
          title: `Entertainment at ${percentage.toFixed(0)}% of spending`,
          description: `Entertainment can often be optimized - potential savings: ${potentialCut.toFixed(0)} AED/month`,
          impact: { monthlySavings: potentialCut },
          category,
          actionable: true,
        });
      }

      // Transport over 12%
      if (category === "transport" && percentage > 12) {
        results.push({
          id: `optimize_${category}`,
          type: "optimize",
          priority: "low",
          title: `Transport costs at ${percentage.toFixed(0)}%`,
          description: `Consider carpooling, public transport, or optimizing ride-hailing usage`,
          category,
          actionable: false,
        });
      }
    });

    // 2. Subscription review
    if (recurringSummary.totalMonthly > 0) {
      const subscriptionCategories = recurringSummary.byCategory.find(c => c.category === "subscriptions");
      if (subscriptionCategories && subscriptionCategories.monthly > 500) {
        results.push({
          id: "review_subscriptions",
          type: "optimize",
          priority: "medium",
          title: `${subscriptionCategories.count} subscriptions at ${subscriptionCategories.monthly.toFixed(0)} AED/month`,
          description: `Review your subscriptions - even canceling 1-2 could save significantly`,
          impact: { monthlySavings: subscriptionCategories.monthly * 0.2 },
          category: "subscriptions",
          actionable: true,
        });
      }
    }

    // 3. Total recurring check
    if (recurringSummary.totalMonthly > (incomeConfig?.monthlyIncome || totalSpending) * 0.5) {
      results.push({
        id: "high_recurring",
        type: "alert",
        priority: "high",
        title: `Recurring costs are 50%+ of income`,
        description: `Your fixed costs (${recurringSummary.totalMonthly.toFixed(0)} AED) leave little room for savings`,
        actionable: false,
      });
    }

    // 4. No goals set
    if (goals.length === 0 && transactions.length > 10) {
      results.push({
        id: "no_goals",
        type: "opportunity",
        priority: "medium",
        title: `No savings goals set`,
        description: `Set up a goal to start tracking progress and get personalized advice`,
        actionable: true,
      });
    }

    // 5. Off-track goals
    goals.forEach(goal => {
      const required = (goal.targetAmount - goal.currentAmount) / 
        Math.max(1, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
      
      if (required > monthlySavings * 1.2) {
        results.push({
          id: `offtrack_${goal.id}`,
          type: "alert",
          priority: goal.priority === "critical" ? "high" : "medium",
          title: `"${goal.name}" may be behind schedule`,
          description: `Need ${required.toFixed(0)} AED/month but only saving ~${monthlySavings.toFixed(0)} AED`,
          actionable: false,
        });
      }
    });

    // 6. Positive: Good savings rate
    const savingsRate = incomeConfig?.monthlyIncome 
      ? (monthlySavings / incomeConfig.monthlyIncome) * 100 
      : 0;
    
    if (savingsRate >= 20) {
      results.push({
        id: "good_savings",
        type: "opportunity",
        priority: "low",
        title: `Great savings rate: ${savingsRate.toFixed(0)}%`,
        description: `You're saving more than the recommended 20%. Consider investing the surplus!`,
        actionable: true,
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return results.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [categoryBreakdown, recurringSummary, goals, monthlySavings, incomeConfig, transactions.length]);

  const getTypeIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "cut":
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case "optimize":
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        );
      case "alert":
        return (
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "opportunity":
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
    }
  };

  const getPriorityBadge = (priority: Suggestion["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive" className="text-xs">High Impact</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="text-xs">Low</Badge>;
    }
  };

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            Not enough data for suggestions. Import more transactions to get personalized advice.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Smart Suggestions
        </CardTitle>
        <CardDescription>Personalized tips to improve your finances</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.slice(0, 5).map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
          >
            <div className="mt-0.5">{getTypeIcon(suggestion.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm">{suggestion.title}</p>
                {getPriorityBadge(suggestion.priority)}
              </div>
              <p className="text-sm text-muted-foreground">{suggestion.description}</p>
              {suggestion.impact && (
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-green-500 font-medium">
                    Save ~{suggestion.impact.monthlySavings.toFixed(0)} AED/mo
                  </span>
                  {suggestion.impact.goalImpact && (
                    <span className="text-primary">→ {suggestion.impact.goalImpact}</span>
                  )}
                </div>
              )}
            </div>
            {suggestion.category && (
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: CATEGORY_CONFIG[suggestion.category]?.color }}
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

