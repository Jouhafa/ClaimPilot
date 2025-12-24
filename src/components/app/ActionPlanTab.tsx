"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/context";
import { calculateRequiredMonthly, estimateMonthlySavings, suggestGoalAllocation, calculateBucketSpending } from "@/lib/goalEngine";
import { getUpcomingRecurring } from "@/lib/recurringDetector";
import { CATEGORY_CONFIG } from "@/lib/types";

interface ActionItem {
  id: string;
  type: "payment" | "transfer" | "review" | "goal" | "reminder";
  title: string;
  description: string;
  amount?: number;
  dueDate?: string;
  priority: "urgent" | "high" | "normal";
  completed: boolean;
}

export function ActionPlanTab() {
  const { 
    transactions, goals, buckets, recurring, incomeConfig,
    updateGoal 
  } = useApp();

  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  // Calculate key metrics
  const monthlySavings = useMemo(() => 
    estimateMonthlySavings(transactions, 3, incomeConfig?.monthlyIncome), 
    [transactions, incomeConfig]
  );

  const goalAllocations = useMemo(() => 
    suggestGoalAllocation(goals, monthlySavings), 
    [goals, monthlySavings]
  );

  const bucketSpending = useMemo(() => 
    calculateBucketSpending(transactions, buckets), 
    [transactions, buckets]
  );

  const upcomingRecurring = useMemo(() => 
    getUpcomingRecurring(recurring, 7), // Next 7 days
    [recurring]
  );

  // Calculate reimbursable amounts
  const reimbursementStats = useMemo(() => {
    const reimbursables = transactions.filter(tx => tx.tag === "reimbursable" && !tx.parentId);
    const draft = reimbursables.filter(tx => tx.status === "draft").reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const submitted = reimbursables.filter(tx => tx.status === "submitted").reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return { draft, submitted, total: draft + submitted };
  }, [transactions]);

  // Generate action items
  const actionItems = useMemo(() => {
    const items: ActionItem[] = [];
    const today = new Date();

    // 1. Credit card payment reminder (if card safety data exists)
    // Simplified: always show if there are reimbursables pending
    if (reimbursementStats.total > 0) {
      items.push({
        id: "cc_payment",
        type: "payment",
        title: "Credit Card Payment",
        description: `Account for ${reimbursementStats.total.toFixed(0)} AED pending reimbursements when paying`,
        amount: reimbursementStats.total,
        priority: "high",
        completed: completedItems.has("cc_payment"),
      });
    }

    // 2. Submit pending reimbursements
    if (reimbursementStats.draft > 0) {
      items.push({
        id: "submit_reimbursements",
        type: "review",
        title: "Submit Reimbursements",
        description: `${reimbursementStats.draft.toFixed(0)} AED in draft claims to submit`,
        amount: reimbursementStats.draft,
        priority: "high",
        completed: completedItems.has("submit_reimbursements"),
      });
    }

    // 3. Upcoming recurring payments
    upcomingRecurring.slice(0, 3).forEach(({ item, daysUntil }) => {
      items.push({
        id: `recurring_${item.id}`,
        type: "reminder",
        title: `${item.normalizedMerchant} due`,
        description: daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`,
        amount: item.averageAmount,
        dueDate: item.nextExpected,
        priority: daysUntil <= 2 ? "urgent" : "normal",
        completed: completedItems.has(`recurring_${item.id}`),
      });
    });

    // 4. Goal contributions
    goalAllocations.forEach(({ goalId, suggestedAmount, reason }) => {
      const goal = goals.find(g => g.id === goalId);
      if (goal) {
        items.push({
          id: `goal_${goalId}`,
          type: "goal",
          title: `Fund "${goal.name}"`,
          description: reason,
          amount: suggestedAmount,
          priority: goal.priority === "critical" ? "high" : "normal",
          completed: completedItems.has(`goal_${goalId}`),
        });
      }
    });

    // 5. Budget bucket alerts
    bucketSpending.forEach(({ bucketId, variance }) => {
      const bucket = buckets.find(b => b.id === bucketId);
      if (bucket && variance > 0) {
        items.push({
          id: `bucket_${bucketId}`,
          type: "review",
          title: `${bucket.name} over budget`,
          description: `Over by ${variance.toFixed(0)} AED - review spending`,
          amount: variance,
          priority: variance > 500 ? "high" : "normal",
          completed: completedItems.has(`bucket_${bucketId}`),
        });
      }
    });

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2 };
    return items.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [reimbursementStats, upcomingRecurring, goalAllocations, bucketSpending, goals, buckets, completedItems]);

  const toggleComplete = (id: string) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const completedCount = actionItems.filter(i => i.completed).length;
  const progressPercent = actionItems.length > 0 ? (completedCount / actionItems.length) * 100 : 0;

  const getTypeIcon = (type: ActionItem["type"]) => {
    switch (type) {
      case "payment":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case "transfer":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case "review":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case "goal":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      case "reminder":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  const getPriorityColor = (priority: ActionItem["priority"]) => {
    switch (priority) {
      case "urgent": return "text-red-500 bg-red-500/10";
      case "high": return "text-orange-500 bg-orange-500/10";
      case "normal": return "text-blue-500 bg-blue-500/10";
    }
  };

  const currentMonth = new Date().toLocaleDateString("en-AE", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monthly Action Plan</h1>
        <p className="text-muted-foreground mt-2">
          Your financial to-do list for {currentMonth}
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedCount} of {actionItems.length} tasks
            </span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          {progressPercent === 100 && actionItems.length > 0 && (
            <p className="text-sm text-green-500 mt-2 font-medium">
              All tasks complete! You're on track.
            </p>
          )}
        </CardContent>
      </Card>

      {/* This Week Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">This Week</CardTitle>
          <CardDescription>Immediate actions to take</CardDescription>
        </CardHeader>
        <CardContent>
          {actionItems.filter(i => i.priority === "urgent" || i.priority === "high").length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No urgent tasks this week.
            </p>
          ) : (
            <div className="space-y-3">
              {actionItems
                .filter(i => i.priority === "urgent" || i.priority === "high")
                .map(item => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      item.completed ? "bg-muted/30 opacity-60" : "hover:bg-muted/30"
                    }`}
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleComplete(item.id)}
                      className="mt-1"
                    />
                    <div className={`p-2 rounded-lg ${getPriorityColor(item.priority)}`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${item.completed ? "line-through" : ""}`}>
                        {item.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    {item.amount && (
                      <div className="text-right">
                        <p className="font-mono font-semibold">{item.amount.toFixed(0)} AED</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* This Month Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">This Month</CardTitle>
          <CardDescription>Goals and bucket allocations</CardDescription>
        </CardHeader>
        <CardContent>
          {actionItems.filter(i => i.priority === "normal").length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No monthly tasks. Set up goals to get personalized recommendations.
            </p>
          ) : (
            <div className="space-y-3">
              {actionItems
                .filter(i => i.priority === "normal")
                .map(item => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      item.completed ? "bg-muted/30 opacity-60" : "hover:bg-muted/30"
                    }`}
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleComplete(item.id)}
                      className="mt-1"
                    />
                    <div className={`p-2 rounded-lg ${getPriorityColor(item.priority)}`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${item.completed ? "line-through" : ""}`}>
                        {item.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    {item.amount && (
                      <div className="text-right">
                        <p className="font-mono font-semibold">{item.amount.toFixed(0)} AED</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goal Progress Summary */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Goal Tracker</CardTitle>
            <CardDescription>If you complete all allocations this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.slice(0, 3).map(goal => {
              const allocation = goalAllocations.find(a => a.goalId === goal.id);
              const newAmount = goal.currentAmount + (allocation?.suggestedAmount || 0);
              const progress = (newAmount / goal.targetAmount) * 100;
              
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{goal.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {newAmount.toLocaleString()} / {goal.targetAmount.toLocaleString()} AED
                    </span>
                  </div>
                  <Progress value={Math.min(100, progress)} className="h-2" />
                  {allocation && (
                    <p className="text-xs text-green-500">
                      +{allocation.suggestedAmount.toFixed(0)} AED this month
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

