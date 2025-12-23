export type TransactionTag = "reimbursable" | "personal" | "ignore" | null;
export type ReimbursementStatus = "draft" | "submitted" | "paid";

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

export interface CardSafetyData {
  statementBalance: number;
  dueDate: string;
  paymentsMade: number;
}

export interface ParsedRow {
  date: string;
  description: string;
  debit?: number;
  credit?: number;
  balance?: number;
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
