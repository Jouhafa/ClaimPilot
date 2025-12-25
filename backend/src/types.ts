export type TransactionTag = "reimbursable" | "personal" | "ignore" | null;
export type TransactionCategory = 
  | "groceries"
  | "dining"
  | "transport"
  | "rent"
  | "utilities"
  | "subscriptions"
  | "travel"
  | "shopping"
  | "health"
  | "entertainment"
  | "education"
  | "insurance"
  | "savings"
  | "investment"
  | "income"
  | "transfer"
  | "fees"
  | "other";

export interface Transaction {
  date: string;
  description: string;
  merchant: string;
  amount: number;
  currency: string;
}

export interface LicenseVerificationRequest {
  licenseKey: string;
}

export interface LicenseVerificationResponse {
  valid: boolean;
  tier: string;
  expiresAt?: string;
}

export interface ParsePDFRequest {
  text: string;
}

export interface ParsePDFResponse {
  success: boolean;
  transactions: Transaction[];
  count: number;
}

export interface SuggestTagsRequest {
  description: string;
  merchant: string;
  amount: number;
}

export interface SuggestTagsResponse {
  suggestedTag: TransactionTag;
  suggestedCategory: TransactionCategory;
  confidence: number;
  reason: string;
}

export interface MonthlyNarrativeRequest {
  summaryData: {
    totalSpending: number;
    topCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    monthOverMonth: Array<{
      category: string;
      change: number;
    }>;
    cashflow: {
      inflow: number;
      outflow: number;
      net: number;
    };
    goalsCount: number;
    income?: number;
  };
}

export interface MonthlyNarrativeResponse {
  narrative: string;
}

