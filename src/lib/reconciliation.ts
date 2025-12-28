import type { Transaction } from "./types";

/**
 * Reconciliation configuration
 */
const RECONCILIATION_CONFIG = {
  amountTolerance: 0.01, // 1 cent tolerance
  dateWindowDays: 7, // Match within 7 days
  merchantSimilarityThreshold: 0.7, // 70% similarity for merchant matching
};

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Check if two amounts match within tolerance
 */
function amountsMatch(amount1: number, amount2: number): boolean {
  return Math.abs(Math.abs(amount1) - Math.abs(amount2)) <= RECONCILIATION_CONFIG.amountTolerance;
}

/**
 * Check if two dates are within the date window
 */
function datesWithinWindow(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= RECONCILIATION_CONFIG.dateWindowDays;
}

/**
 * Check if two merchants are similar enough
 */
function merchantsMatch(merchant1: string, merchant2: string): boolean {
  const similarity = calculateSimilarity(merchant1, merchant2);
  return similarity >= RECONCILIATION_CONFIG.merchantSimilarityThreshold;
}

/**
 * Match a pending transaction with imported transactions
 */
export function findMatchingTransaction(
  pendingTx: Transaction,
  importedTransactions: Transaction[]
): Transaction | null {
  for (const importedTx of importedTransactions) {
    // Skip if imported transaction is already matched or is also pending
    if (importedTx.transactionStatus === "pending" || importedTx.isManual) {
      continue;
    }
    
    // Check amount match
    if (!amountsMatch(pendingTx.amount, importedTx.amount)) {
      continue;
    }
    
    // Check date window
    if (!datesWithinWindow(pendingTx.date, importedTx.date)) {
      continue;
    }
    
    // Check merchant similarity
    if (!merchantsMatch(pendingTx.merchant, importedTx.merchant)) {
      continue;
    }
    
    // All checks passed - this is a match
    return importedTx;
  }
  
  return null;
}

/**
 * Reconcile pending transactions with newly imported transactions
 * Returns reconciliation results
 */
export interface ReconciliationResult {
  matched: Array<{ pending: Transaction; imported: Transaction }>;
  stillPending: Transaction[];
  alerts: Array<{ pending: Transaction; reason: string }>;
}

export function reconcilePendingTransactions(
  pendingTransactions: Transaction[],
  importedTransactions: Transaction[]
): ReconciliationResult {
  const matched: Array<{ pending: Transaction; imported: Transaction }> = [];
  const stillPending: Transaction[] = [];
  const alerts: Array<{ pending: Transaction; reason: string }> = [];
  
  for (const pendingTx of pendingTransactions) {
    if (pendingTx.transactionStatus !== "pending") {
      continue;
    }
    
    const match = findMatchingTransaction(pendingTx, importedTransactions);
    
    if (match) {
      matched.push({ pending: pendingTx, imported: match });
    } else {
      // Check if transaction is old (more than 30 days)
      const daysSince = (new Date().getTime() - new Date(pendingTx.date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) {
        alerts.push({
          pending: pendingTx,
          reason: `Still pending after ${Math.floor(daysSince)} days`,
        });
      }
      stillPending.push(pendingTx);
    }
  }
  
  return { matched, stillPending, alerts };
}

/**
 * Merge pending transaction with imported transaction
 * Preserves user-added data from pending transaction
 */
export function mergeTransaction(
  pending: Transaction,
  imported: Transaction
): Transaction {
  return {
    ...imported,
    // Preserve user-added fields from pending transaction
    tag: pending.tag || imported.tag,
    category: pending.category || imported.category,
    note: pending.note || imported.note,
    accountId: pending.accountId || imported.accountId,
    // Mark as confirmed
    transactionStatus: "confirmed" as const,
    isManual: false,
    // Keep the imported transaction's ID and dates
    id: imported.id,
    date: imported.date,
    postingDate: imported.postingDate,
  };
}

