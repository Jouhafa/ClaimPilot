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
  createdAt: string;
}

export interface Rule {
  id: string;
  contains: string; // substring match on merchant/description
  tag: Exclude<TransactionTag, null>;
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

