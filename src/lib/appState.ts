import type { Transaction, Goal, Bucket, ImportProfile } from "./types";
import { getAutoTagStats } from "./autoTagger";

export type AppState = 
  | "FIRST_RUN_SETUP"
  | "NEEDS_IMPORT"
  | "NEEDS_REVIEW"
  | "READY";

export interface AppStateData {
  state: AppState;
  hasProfile: boolean;
  hasBuckets: boolean;
  hasGoals: boolean;
  hasTransactions: boolean;
  hasImportedThisMonth: boolean;
  needsReview: boolean;
  reviewCount: number;
}

export interface UserProfile {
  nickname?: string;
  currency: string;
  email?: string;
  phone?: string;
  income?: number;
  city?: string;
  defaultStatementType?: "credit" | "debit";
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Computes the current app state based on persisted data
 */
export function computeAppState(
  transactions: Transaction[],
  goals: Goal[],
  buckets: Bucket[],
  profile: UserProfile | null,
  selectedMonth: Date
): AppStateData {
  const hasProfile = !!profile && profile.onboardingCompleted;
  const hasBuckets = buckets.length > 0;
  const hasGoals = goals.length > 0;
  const hasTransactions = transactions.length > 0;
  
  // Check if there are transactions for the selected month
  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
  
  const monthTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= monthStart && txDate <= monthEnd;
  });
  
  const hasImportedThisMonth = monthTransactions.length > 0;
  
  // Check review status
  const autoTagStats = getAutoTagStats(transactions);
  const needsReview = autoTagStats.needsReviewCount > 0;
  const reviewCount = autoTagStats.needsReviewCount;
  
  // Determine state
  let state: AppState;
  
  if (!hasProfile || (!hasBuckets && !hasGoals)) {
    state = "FIRST_RUN_SETUP";
  } else if (!hasImportedThisMonth) {
    state = "NEEDS_IMPORT";
  } else if (needsReview) {
    state = "NEEDS_REVIEW";
  } else {
    state = "READY";
  }
  
  return {
    state,
    hasProfile,
    hasBuckets,
    hasGoals,
    hasTransactions,
    hasImportedThisMonth,
    needsReview,
    reviewCount,
  };
}

