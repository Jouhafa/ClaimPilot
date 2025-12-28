import type { Transaction, RecurringTransaction, CardSafetyData, ROITrackerData, ROIMonthlyMetrics, CancelledSubscription } from "./types";

/**
 * Get month key in format YYYY-MM
 */
function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Calculate ROI metrics for a given month
 */
export function calculateMonthlyROI(
  monthKey: string,
  transactions: Transaction[],
  cardSafety: CardSafetyData | null,
  cancelledSubscriptions: CancelledSubscription[],
  estimatedSavings: number = 0
): ROIMonthlyMetrics {
  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // 1. Reimbursements recovered (transactions with status="paid" in this month)
  const reimbursementsRecovered = transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return (
        tx.tag === "reimbursable" &&
        tx.status === "paid" &&
        txDate >= monthStart &&
        txDate <= monthEnd
      );
    })
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // 2. Interest avoided (from CardSafety calculations)
  // Note: CardSafety calculates interest for current statement period
  // For simplicity, we'll attribute it to the current month if due date falls in this month
  let interestAvoided = 0;
  if (cardSafety && cardSafety.dueDate) {
    const dueDate = new Date(cardSafety.dueDate);
    const dueMonthKey = getMonthKey(dueDate);
    // Only count interest avoided if due date is in this month
    // The actual calculation would need to be done by CardSafety component
    // For now, we'll estimate: if payments cover statement balance, interest was avoided
    if (dueMonthKey === monthKey) {
      const statementBalance = cardSafety.statementBalance || 0;
      const paymentsMade = cardSafety.paymentsMade || 0;
      // Estimate: if payments >= statement balance, interest was avoided
      // This is a simplified calculation - actual interest calculation is more complex
      if (paymentsMade >= statementBalance && statementBalance > 0) {
        // Rough estimate: interest on credit cards is typically ~2-3% per month
        // We'll use 2.5% as a conservative estimate
        interestAvoided = statementBalance * 0.025;
      }
    }
  }

  // 3. Subscriptions cancelled (sum of cancelled subscriptions in this month)
  const subscriptionsCancelled = cancelledSubscriptions
    .filter(sub => {
      const cancelledDate = new Date(sub.cancelledDate);
      return cancelledDate >= monthStart && cancelledDate <= monthEnd;
    })
    .reduce((sum, sub) => sum + sub.amount, 0);

  // 4. Estimated savings (manual input or auto-calculated)
  // This is passed as a parameter

  const totalBenefit = reimbursementsRecovered + interestAvoided + subscriptionsCancelled + estimatedSavings;

  return {
    reimbursementsRecovered,
    interestAvoided,
    subscriptionsCancelled,
    estimatedSavings,
    totalBenefit,
  };
}

/**
 * Get or calculate ROI metrics for a month
 */
export function getMonthlyROI(
  monthKey: string,
  transactions: Transaction[],
  cardSafety: CardSafetyData | null,
  roiData: ROITrackerData | null,
  estimatedSavings: number = 0
): ROIMonthlyMetrics {
  // Check if we have cached metrics
  if (roiData?.monthlyMetrics[monthKey]) {
    return roiData.monthlyMetrics[monthKey];
  }

  // Calculate fresh metrics
  return calculateMonthlyROI(
    monthKey,
    transactions,
    cardSafety,
    roiData?.cancelledSubscriptions ?? [],
    estimatedSavings
  );
}

/**
 * Track a subscription cancellation
 */
export function createCancelledSubscription(
  recurring: RecurringTransaction,
  cancelledDate: Date = new Date()
): CancelledSubscription {
  return {
    id: `cancelled-${recurring.id}-${cancelledDate.getTime()}`,
    merchant: recurring.normalizedMerchant,
    amount: recurring.averageAmount,
    cancelledDate: cancelledDate.toISOString(),
    originalRecurringId: recurring.id,
  };
}

/**
 * Recalculate ROI for current month
 */
export function recalculateCurrentMonthROI(
  transactions: Transaction[],
  cardSafety: CardSafetyData | null,
  roiData: ROITrackerData | null,
  estimatedSavings: number = 0
): ROIMonthlyMetrics {
  const currentMonthKey = getMonthKey(new Date());
  return calculateMonthlyROI(
    currentMonthKey,
    transactions,
    cardSafety,
    roiData?.cancelledSubscriptions ?? [],
    estimatedSavings
  );
}

