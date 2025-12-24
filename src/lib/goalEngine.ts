import type { Goal, Transaction, Bucket } from "./types";

/**
 * Calculate required monthly contribution to reach a goal
 */
export function calculateRequiredMonthly(goal: Goal): number {
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return 0;

  const targetDate = new Date(goal.targetDate);
  const now = new Date();
  const monthsRemaining = Math.max(
    1,
    (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
  );

  return remaining / monthsRemaining;
}

/**
 * Calculate projected completion date at current savings rate
 */
export function calculateProjectedDate(goal: Goal, monthlySavings: number): Date | null {
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return new Date(); // Already complete
  if (monthlySavings <= 0) return null; // Never

  const monthsNeeded = Math.ceil(remaining / monthlySavings);
  const projected = new Date();
  projected.setMonth(projected.getMonth() + monthsNeeded);
  return projected;
}

/**
 * Calculate goal progress percentage
 */
export function calculateProgress(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
}

/**
 * Check if goal is on track
 */
export function isGoalOnTrack(goal: Goal, currentMonthlySavings: number): {
  isOnTrack: boolean;
  projectedDate: Date | null;
  requiredMonthly: number;
  surplus: number; // positive = ahead, negative = behind
} {
  const requiredMonthly = calculateRequiredMonthly(goal);
  const projectedDate = calculateProjectedDate(goal, currentMonthlySavings);
  const targetDate = new Date(goal.targetDate);

  let isOnTrack = false;
  if (projectedDate) {
    isOnTrack = projectedDate <= targetDate;
  }

  return {
    isOnTrack,
    projectedDate,
    requiredMonthly,
    surplus: currentMonthlySavings - requiredMonthly,
  };
}

/**
 * Calculate impact of spending cut on goal timeline
 */
export function calculateCutImpact(
  goal: Goal,
  currentMonthlySavings: number,
  monthlyReduction: number
): {
  currentProjectedDate: Date | null;
  newProjectedDate: Date | null;
  monthsSaved: number;
} {
  const currentProjected = calculateProjectedDate(goal, currentMonthlySavings);
  const newProjected = calculateProjectedDate(goal, currentMonthlySavings + monthlyReduction);

  let monthsSaved = 0;
  if (currentProjected && newProjected) {
    monthsSaved = Math.round(
      (currentProjected.getTime() - newProjected.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
  }

  return {
    currentProjectedDate: currentProjected,
    newProjectedDate: newProjected,
    monthsSaved,
  };
}

/**
 * Calculate scenario impact (bonus, expense change, etc.)
 */
export function calculateScenarioImpact(
  goal: Goal,
  currentMonthlySavings: number,
  scenario: {
    oneTimeAmount?: number; // e.g., bonus injection
    monthlyChange?: number; // e.g., rent increase (-500) or salary raise (+1000)
    newTargetDate?: string; // e.g., delay goal by 6 months
    newTargetAmount?: number; // e.g., reduce goal amount
  }
): {
  newCurrentAmount: number;
  newTargetAmount: number;
  newTargetDate: string;
  newMonthlySavings: number;
  newRequiredMonthly: number;
  newProjectedDate: Date | null;
  isNowOnTrack: boolean;
} {
  const newCurrentAmount = goal.currentAmount + (scenario.oneTimeAmount || 0);
  const newTargetAmount = scenario.newTargetAmount ?? goal.targetAmount;
  const newTargetDate = scenario.newTargetDate ?? goal.targetDate;
  const newMonthlySavings = currentMonthlySavings + (scenario.monthlyChange || 0);

  const hypotheticalGoal: Goal = {
    ...goal,
    currentAmount: newCurrentAmount,
    targetAmount: newTargetAmount,
    targetDate: newTargetDate,
  };

  const newRequiredMonthly = calculateRequiredMonthly(hypotheticalGoal);
  const newProjectedDate = calculateProjectedDate(hypotheticalGoal, newMonthlySavings);
  const isNowOnTrack = newProjectedDate ? newProjectedDate <= new Date(newTargetDate) : false;

  return {
    newCurrentAmount,
    newTargetAmount,
    newTargetDate,
    newMonthlySavings,
    newRequiredMonthly,
    newProjectedDate,
    isNowOnTrack,
  };
}

/**
 * Calculate estimated monthly savings from transactions
 */
export function estimateMonthlySavings(
  transactions: Transaction[],
  monthsToAnalyze: number = 3,
  manualIncome?: number
): number {
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsToAnalyze);

  const recentTx = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate >= cutoffDate && !tx.parentId;
  });

  let totalIncome = 0;
  let totalExpenses = 0;

  recentTx.forEach((tx) => {
    if (tx.amount > 0) {
      totalIncome += tx.amount;
    } else {
      totalExpenses += Math.abs(tx.amount);
    }
  });

  // Use manual income if provided and detected income is low
  if (manualIncome && totalIncome < manualIncome * monthsToAnalyze * 0.5) {
    totalIncome = manualIncome * monthsToAnalyze;
  }

  const avgMonthlySavings = (totalIncome - totalExpenses) / monthsToAnalyze;
  return Math.max(0, avgMonthlySavings);
}

/**
 * Get goal priority color
 */
export function getGoalPriorityColor(priority: Goal["priority"]): string {
  switch (priority) {
    case "critical":
      return "#ef4444"; // red
    case "high":
      return "#f97316"; // orange
    case "medium":
      return "#eab308"; // yellow
    case "low":
      return "#22c55e"; // green
    default:
      return "#6b7280"; // gray
  }
}

/**
 * Get goal category icon name
 */
export function getGoalCategoryIcon(category: Goal["category"]): string {
  switch (category) {
    case "emergency":
      return "Shield";
    case "purchase":
      return "ShoppingCart";
    case "investment":
      return "TrendingUp";
    case "lifestyle":
      return "Heart";
    case "debt":
      return "CreditCard";
    default:
      return "Target";
  }
}

/**
 * Suggest optimal goal allocation based on available savings
 */
export function suggestGoalAllocation(
  goals: Goal[],
  availableMonthlySavings: number
): { goalId: string; suggestedAmount: number; reason: string }[] {
  // Sort by priority (critical first) then by deadline (nearest first)
  const sortedGoals = [...goals].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
  });

  const allocations: { goalId: string; suggestedAmount: number; reason: string }[] = [];
  let remaining = availableMonthlySavings;

  for (const goal of sortedGoals) {
    if (remaining <= 0) break;

    const required = calculateRequiredMonthly(goal);
    const allocated = Math.min(remaining, required);

    if (allocated > 0) {
      allocations.push({
        goalId: goal.id,
        suggestedAmount: allocated,
        reason:
          allocated >= required
            ? `Full amount to stay on track`
            : `Partial allocation (need ${required.toFixed(0)} AED/month)`,
      });
      remaining -= allocated;
    }
  }

  return allocations;
}

/**
 * Calculate bucket allocation from transactions
 */
export function calculateBucketSpending(
  transactions: Transaction[],
  buckets: Bucket[]
): { bucketId: string; actual: number; target: number; variance: number }[] {
  const result: { bucketId: string; actual: number; target: number; variance: number }[] = [];

  // Calculate total spending
  const totalSpending = transactions
    .filter((tx) => tx.amount < 0 && !tx.parentId)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  for (const bucket of buckets) {
    // Calculate actual spending in this bucket's categories
    const actual = transactions
      .filter(
        (tx) =>
          tx.amount < 0 &&
          !tx.parentId &&
          tx.category &&
          bucket.linkedCategories.includes(tx.category)
      )
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const target = bucket.targetAmount ?? (totalSpending * bucket.targetPercentage) / 100;
    const variance = actual - target;

    result.push({
      bucketId: bucket.id,
      actual,
      target,
      variance,
    });
  }

  return result;
}

