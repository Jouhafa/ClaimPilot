export type TransactionTag = "reimbursable" | "personal" | "ignore" | null;
export type ReimbursementStatus = "draft" | "submitted" | "paid";
export type TagConfidence = "high" | "medium" | "low";
export type TransactionCategory = 
  | "travel" 
  | "meals" 
  | "transport" 
  | "accommodation" 
  | "software" 
  | "office" 
  | "communication" 
  | "other";

export interface Transaction {
  id: string;
  date: string; // ISO format
  merchant: string;
  description: string;
  amount: number; // negative for debits, positive for credits
  currency: string;
  tag: TransactionTag;
  status?: ReimbursementStatus; // only for reimbursable
  note?: string;
  batchId?: string; // Reference to ClaimBatch
  category?: TransactionCategory;
  // Split transaction support
  parentId?: string; // If this is a split, reference to original
  splitPercentage?: number; // e.g., 70 for 70%
  isSplit?: boolean; // True if this transaction has been split
  // Smart auto-tagging
  suggestedTag?: TransactionTag;
  tagConfidence?: TagConfidence;
  tagReason?: string; // e.g., "Matched: Hotel keyword"
  isAutoTagged?: boolean; // True if tag was auto-applied
  createdAt: string;
}

// Legacy simple rule (for backwards compatibility)
export interface LegacyRule {
  id: string;
  contains: string;
  tag: Exclude<TransactionTag, null>;
}

// Advanced Rule with conditions
export interface Rule {
  id: string;
  name?: string;
  conditions: RuleCondition[];
  action: RuleAction;
  // Legacy support
  contains?: string;
  tag?: Exclude<TransactionTag, null>;
}

export interface RuleCondition {
  field: "merchant" | "description" | "amount" | "currency";
  operator: "contains" | "equals" | "startsWith" | "greaterThan" | "lessThan";
  value: string | number;
}

export interface RuleAction {
  tag: Exclude<TransactionTag, null>;
  category?: string;
  note?: string;
}

// Claim Batches for grouping reimbursements
export interface ClaimBatch {
  id: string;
  name: string; // "Dubai Trip Dec 2025"
  status: ReimbursementStatus;
  createdAt: string;
  submittedAt?: string;
  paidAt?: string;
}

// Enhanced Card Safety with statement snapshots
export interface CardSafetyData {
  statementBalance: number;
  dueDate: string;
  paymentsMade: number;
  minimumDue?: number;
  statementDate?: string;
  safetyBuffer?: number; // Extra buffer to add
}

export interface ParsedRow {
  date: string;
  description: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

// Import profile for saving column mappings
export interface ImportProfile {
  id: string;
  name: string; // "ENBD Credit Card", "HSBC Debit", etc.
  bankName: string;
  fileType: "csv" | "excel" | "pdf";
  columnMappings: {
    date?: string;
    description?: string;
    debit?: string;
    credit?: string;
    amount?: string;
    balance?: string;
  };
  dateFormat?: string; // "DD/MM/YYYY", "YYYY-MM-DD", etc.
  createdAt: string;
}

// Merchant alias for normalization
export interface MerchantAlias {
  id: string;
  variants: string[]; // ["CAREEM HALA", "CAREEM", "Careem Hala UAE"]
  normalizedName: string; // "Careem"
}

// Helper function to check if rule matches transaction
export function ruleMatchesTransaction(rule: Rule, tx: Transaction): boolean {
  // Legacy rule support
  if (rule.contains && !rule.conditions?.length) {
    const searchText = `${tx.merchant} ${tx.description}`.toLowerCase();
    return searchText.includes(rule.contains.toLowerCase());
  }

  // Advanced rule with conditions
  if (!rule.conditions || rule.conditions.length === 0) return false;

  return rule.conditions.every((condition) => {
    const fieldValue = tx[condition.field];
    
    switch (condition.operator) {
      case "contains":
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case "equals":
        return String(fieldValue).toLowerCase() === String(condition.value).toLowerCase();
      case "startsWith":
        return String(fieldValue).toLowerCase().startsWith(String(condition.value).toLowerCase());
      case "greaterThan":
        return Math.abs(Number(fieldValue)) > Number(condition.value);
      case "lessThan":
        return Math.abs(Number(fieldValue)) < Number(condition.value);
      default:
        return false;
    }
  });
}

// Get the tag from a rule (handles legacy and new format)
export function getRuleTag(rule: Rule): Exclude<TransactionTag, null> {
  if (rule.action?.tag) return rule.action.tag;
  if (rule.tag) return rule.tag;
  return "reimbursable"; // default
}

// Detect potential duplicates
export function findDuplicates(transactions: Transaction[]): Map<string, Transaction[]> {
  const duplicates = new Map<string, Transaction[]>();
  
  transactions.forEach((tx, i) => {
    if (tx.parentId) return; // Skip split children
    
    const key = `${tx.date}-${Math.abs(tx.amount).toFixed(2)}-${tx.merchant.toLowerCase().substring(0, 10)}`;
    
    const existing = duplicates.get(key) || [];
    existing.push(tx);
    duplicates.set(key, existing);
  });
  
  // Filter to only groups with more than one
  const result = new Map<string, Transaction[]>();
  duplicates.forEach((txs, key) => {
    if (txs.length > 1) {
      result.set(key, txs);
    }
  });
  
  return result;
}

// Normalize merchant name
export function normalizeMerchant(merchant: string, aliases: MerchantAlias[]): string {
  const lowerMerchant = merchant.toLowerCase().trim();
  
  for (const alias of aliases) {
    for (const variant of alias.variants) {
      if (lowerMerchant.includes(variant.toLowerCase())) {
        return alias.normalizedName;
      }
    }
  }
  
  return merchant;
}

// Calculate currency totals
export function calculateCurrencyTotals(transactions: Transaction[]): Map<string, number> {
  const totals = new Map<string, number>();
  
  transactions.forEach((tx) => {
    if (tx.tag !== "reimbursable") return;
    const current = totals.get(tx.currency) || 0;
    totals.set(tx.currency, current + Math.abs(tx.amount));
  });
  
  return totals;
}

// Category labels
export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  travel: "Travel",
  meals: "Meals & Dining",
  transport: "Transport",
  accommodation: "Accommodation",
  software: "Software & Subscriptions",
  office: "Office Supplies",
  communication: "Communication",
  other: "Other",
};
