import type { Transaction, ExpenseCoverageItem } from "./types";

/**
 * Detect likely work expenses that weren't tagged as reimbursable
 */
export function detectLikelyWorkExpenses(transactions: Transaction[]): ExpenseCoverageItem[] {
  const items: ExpenseCoverageItem[] = [];
  
  // Filter to transactions that are not tagged as reimbursable
  const untagged = transactions.filter(
    t => t.amount < 0 && // Only expenses
         t.tag !== "reimbursable" && // Not already tagged
         !t.parentId // Not a split child
  );

  untagged.forEach((tx) => {
    const merchant = tx.merchant.toLowerCase();
    const description = tx.description.toLowerCase();
    const searchText = `${merchant} ${description}`;
    const amount = Math.abs(tx.amount);
    const txDate = new Date(tx.date);

    // Travel-related patterns (high confidence)
    const travelPatterns = [
      "hotel", "marriott", "hilton", "hyatt", "airbnb", "booking.com",
      "airline", "emirates", "etihad", "flydubai", "flight", "airport",
      "uber", "careem", "taxi", "cab", "limousine", "rental car", "hertz", "avis",
      "conference", "seminar", "workshop", "training", "event"
    ];
    
    if (travelPatterns.some(pattern => searchText.includes(pattern))) {
      items.push({
        transactionId: tx.id,
        reason: "Travel-related expense (hotel, flight, transport)",
        confidence: "high",
      });
      return;
    }

    // Business meal patterns (medium confidence)
    // Meals during weekdays, above threshold (e.g., 50 AED)
    const isWeekday = txDate.getDay() >= 1 && txDate.getDay() <= 5;
    const mealPatterns = [
      "restaurant", "cafe", "coffee", "starbucks", "costa", "dining",
      "food", "meal", "lunch", "dinner", "breakfast", "catering"
    ];
    
    if (mealPatterns.some(pattern => searchText.includes(pattern)) && 
        isWeekday && 
        amount >= 50) {
      items.push({
        transactionId: tx.id,
        reason: `Business meal (${txDate.toLocaleDateString("en-US", { weekday: "short" })}, ${amount.toFixed(2)} AED)`,
        confidence: "medium",
      });
      return;
    }

    // Merchant patterns matching known work categories (medium confidence)
    const workMerchantPatterns = [
      "office", "stationery", "supplies", "equipment", "tech", "software",
      "amazon", "noon", "business", "professional", "consulting", "services"
    ];
    
    if (workMerchantPatterns.some(pattern => searchText.includes(pattern)) && amount >= 100) {
      items.push({
        transactionId: tx.id,
        reason: "Business-related merchant pattern",
        confidence: "medium",
      });
      return;
    }

    // Large amounts on weekdays (low confidence)
    if (isWeekday && amount >= 500) {
      items.push({
        transactionId: tx.id,
        reason: `Large weekday expense (${amount.toFixed(2)} AED)`,
        confidence: "low",
      });
    }
  });

  return items;
}

/**
 * Calculate gap between detected expenses, tagged reimbursables, and claims submitted
 */
export function calculateExpenseCoverageGap(
  detectedItems: ExpenseCoverageItem[],
  transactions: Transaction[],
  claimsSubmittedTotal: number
): {
  detectedTotal: number;
  taggedTotal: number;
  claimsSubmittedTotal: number;
  gap: number;
} {
  // Sum of detected items
  const detectedTotal = detectedItems.reduce((sum, item) => {
    const tx = transactions.find(t => t.id === item.transactionId);
    return sum + (tx ? Math.abs(tx.amount) : 0);
  }, 0);

  // Sum of tagged reimbursables
  const taggedTotal = transactions
    .filter(t => t.tag === "reimbursable" && !t.parentId)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Gap = detected + tagged - claims submitted
  // Positive gap means there are expenses that should be claimed
  const gap = detectedTotal + taggedTotal - claimsSubmittedTotal;

  return {
    detectedTotal,
    taggedTotal,
    claimsSubmittedTotal,
    gap: Math.max(0, gap), // Only show positive gaps
  };
}

