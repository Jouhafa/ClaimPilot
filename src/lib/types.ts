export type TransactionTag = "reimbursable" | "personal" | "ignore" | null;
export type ReimbursementStatus = "draft" | "submitted" | "paid";
export type TagConfidence = "high" | "medium" | "low";

// Expanded categories for financial advisor
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

// Spending type classification
export type SpendingType = "fixed" | "variable" | "income" | "transfer";

// Statement type classification
export type StatementType = "enbd_debit" | "enbd_credit" | "unknown";

// Transaction kind classification
export type TransactionKind = "spend" | "income" | "transfer" | "reimbursement" | "unknown";

// Transaction confirmation status
export type TransactionStatus = "pending" | "confirmed";

export interface Transaction {
  id: string;
  date: string; // ISO format (transaction date)
  postingDate?: string; // ISO format (for credit card statements)
  merchant: string;
  description: string;
  amount: number; // negative for debits/outflow, positive for credits/inflow
  currency: string;
  balance?: number; // Account balance after transaction (for debit statements)
  accountId?: string; // Reference to Account
  tag: TransactionTag;
  status?: ReimbursementStatus; // only for reimbursable
  transactionStatus?: TransactionStatus; // pending or confirmed (for manual transactions)
  isManual?: boolean; // True if manually added (not from statement import)
  note?: string;
  batchId?: string; // Reference to ClaimBatch
  category?: TransactionCategory;
  spendingType?: SpendingType; // fixed, variable, income, transfer
  kind?: TransactionKind; // spend, income, transfer, reimbursement, unknown
  sourceDocType?: StatementType; // enbd_debit, enbd_credit, unknown
  sourceFileName?: string; // Original file name
  isRecurring?: boolean; // Detected as recurring/subscription
  recurringFrequency?: "weekly" | "monthly" | "quarterly" | "yearly";
  // Split transaction support
  parentId?: string; // If this is a split, reference to original
  splitPercentage?: number; // e.g., 70 for 70%
  isSplit?: boolean; // True if this transaction has been split
  // Smart auto-tagging
  suggestedTag?: TransactionTag;
  suggestedCategory?: TransactionCategory;
  tagConfidence?: TagConfidence;
  tagReason?: string; // e.g., "Matched: Hotel keyword"
  isAutoTagged?: boolean; // True if tag was auto-applied
  isAutoCategorized?: boolean; // True if category was auto-applied
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

// Category labels and icons
export const CATEGORY_CONFIG: Record<TransactionCategory, { label: string; icon: string; color: string; spendingType: SpendingType }> = {
  groceries: { label: "Groceries", icon: "ShoppingCart", color: "#22c55e", spendingType: "variable" },
  dining: { label: "Dining & Food", icon: "Utensils", color: "#f97316", spendingType: "variable" },
  transport: { label: "Transport", icon: "Car", color: "#3b82f6", spendingType: "variable" },
  rent: { label: "Rent & Housing", icon: "Home", color: "#8b5cf6", spendingType: "fixed" },
  utilities: { label: "Utilities", icon: "Zap", color: "#eab308", spendingType: "fixed" },
  subscriptions: { label: "Subscriptions", icon: "Repeat", color: "#ec4899", spendingType: "fixed" },
  travel: { label: "Travel", icon: "Plane", color: "#06b6d4", spendingType: "variable" },
  shopping: { label: "Shopping", icon: "ShoppingBag", color: "#f43f5e", spendingType: "variable" },
  health: { label: "Health & Fitness", icon: "Heart", color: "#14b8a6", spendingType: "variable" },
  entertainment: { label: "Entertainment", icon: "Film", color: "#a855f7", spendingType: "variable" },
  education: { label: "Education", icon: "GraduationCap", color: "#0ea5e9", spendingType: "variable" },
  insurance: { label: "Insurance", icon: "Shield", color: "#64748b", spendingType: "fixed" },
  savings: { label: "Savings", icon: "PiggyBank", color: "#10b981", spendingType: "transfer" },
  investment: { label: "Investment", icon: "TrendingUp", color: "#6366f1", spendingType: "transfer" },
  income: { label: "Income", icon: "ArrowDownCircle", color: "#22c55e", spendingType: "income" },
  transfer: { label: "Transfer", icon: "ArrowRightLeft", color: "#94a3b8", spendingType: "transfer" },
  fees: { label: "Bank Fees", icon: "AlertCircle", color: "#ef4444", spendingType: "fixed" },
  other: { label: "Other", icon: "MoreHorizontal", color: "#6b7280", spendingType: "variable" },
};

// Legacy category labels for backwards compatibility
export const CATEGORY_LABELS: Record<TransactionCategory, string> = Object.fromEntries(
  Object.entries(CATEGORY_CONFIG).map(([key, val]) => [key, val.label])
) as Record<TransactionCategory, string>;

// Goal interface for financial planning
export interface Goal {
  id: string;
  name: string; // "Car down payment"
  targetAmount: number; // 50000
  targetDate: string; // ISO date
  currentAmount: number; // 12000
  priority: "critical" | "high" | "medium" | "low";
  category: "emergency" | "purchase" | "investment" | "lifestyle" | "debt";
  monthlyContribution?: number; // calculated or manual
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt?: string;
}

// Bucket interface for budget allocation
export interface Bucket {
  id: string;
  name: string; // "Needs", "Wants", "Goals"
  targetPercentage: number; // e.g., 50 for 50%
  targetAmount?: number; // optional fixed amount
  linkedCategories: TransactionCategory[]; // categories that count toward this bucket
  linkedGoalId?: string; // optional goal ID
  color: string;
  createdAt: string;
}

// Account Management
export type AccountType = "checking" | "savings" | "credit_card" | "investment" | "loan" | "other";
export type AccountGroup = "personal" | "business" | "joint" | "other";

export interface Account {
  id: string;
  name: string; // "ENBD Checking", "HSBC Credit Card"
  type: AccountType;
  group: AccountGroup;
  bankName?: string;
  accountNumber?: string; // Last 4 digits or masked
  currency: string;
  initialBalance: number; // Balance when account was added
  currentBalance?: number; // Calculated from transactions
  isActive: boolean;
  color?: string; // For UI display
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Budget Management
export interface Budget {
  id: string;
  category: TransactionCategory;
  monthlyAmount: number; // Budget amount for this category
  currency: string;
  rolloverEnabled: boolean; // Allow unused budget to roll over
  alertThreshold?: number; // Percentage (e.g., 80) to alert at
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface BudgetTemplate {
  id: string;
  name: string; // "Conservative", "Balanced", "Aggressive"
  description: string;
  budgets: Array<{
    category: TransactionCategory;
    percentage: number; // Percentage of monthly income
  }>;
}

// User income configuration
export interface IncomeConfig {
  monthlyIncome: number;
  currency: string;
  salaryDay?: number; // day of month salary arrives
  additionalIncome?: number; // side income, bonuses
  lastUpdated: string;
}

// Category rule for user-defined categorization
export interface CategoryRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  category: TransactionCategory;
  spendingType?: SpendingType;
  isRecurring?: boolean;
  priority: number; // higher = checked first
  isUserDefined: boolean; // false for built-in rules
  createdAt: string;
}

// Recurring transaction detection
export interface RecurringTransaction {
  id: string;
  merchantPattern: string;
  normalizedMerchant: string;
  category: TransactionCategory;
  averageAmount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  lastOccurrence: string;
  nextExpected: string;
  occurrences: number;
  transactionIds: string[]; // linked transactions
  isActive: boolean;
  isUserConfirmed: boolean;
}

// License Tier System
export type LicenseTier = "free" | "paid" | "premium";

export interface License {
  key: string;
  tier: LicenseTier;
  validatedAt: string;
  email?: string;
}

// Feature access by tier
export const TIER_FEATURES: Record<LicenseTier, string[]> = {
  free: [
    "import-statements",
    "auto-categorization",
    "spending-dashboard",
    "recurring-detection",
    "basic-export",
    "anomaly-alerts",
  ],
  paid: [
    "import-statements",
    "auto-categorization",
    "spending-dashboard",
    "recurring-detection",
    "basic-export",
    "anomaly-alerts",
    "goals",
    "buckets",
    "scenario-mode",
    "smart-suggestions",
    "advanced-export",
    "reimbursement-tracker",
    "card-safety",
    "ai-insights",
  ],
  premium: [
    "import-statements",
    "auto-categorization",
    "spending-dashboard",
    "recurring-detection",
    "basic-export",
    "anomaly-alerts",
    "goals",
    "buckets",
    "scenario-mode",
    "smart-suggestions",
    "advanced-export",
    "reimbursement-tracker",
    "card-safety",
    "ai-insights",
    "action-plan",
    "investment-policy",
    "monthly-narrative",
    "priority-support",
  ],
};

// Check if a feature is available for a tier
// DEV MODE: All features are free for authenticated users
export function hasFeatureAccess(tier: LicenseTier, feature: string): boolean {
  // In development: all authenticated users get full access
  // Return true for all features (free app mode)
  return true;
}

// Wrap (Monthly Recap) Types
export type WrapType = "monthly" | "custom";
export type WrapScope = "all" | "reimbursements" | "personal";

export interface TopMove {
  id: string;
  title: string;
  description: string;
  action: string; // e.g., "review", "reimbursements", "goals"
  actionParams?: Record<string, any>;
  timeEstimate: string; // e.g., "5 min"
  priority: "high" | "medium" | "low";
}

export interface WrapData {
  // Cover slide
  heroNumber: number;
  heroLabel: string;
  
  // Snapshot
  totalSpent: number;
  totalSaved: number;
  totalReimbursable: number;
  isOnTrack: boolean;
  
  // Top categories (max 5)
  topCategories: Array<{
    category: TransactionCategory;
    amount: number;
    percentage: number;
  }>;
  
  // Changes vs last month (top 3)
  monthOverMonthChanges: Array<{
    label: string;
    change: number;
    changePercent: number;
    isIncrease: boolean;
  }>;
  
  // Recurring/subscriptions
  recurringSummary: {
    total: number;
    count: number;
    topItems: Array<{
      merchant: string;
      amount: number;
      frequency: string;
    }>;
  };
  
  // Reimbursements pipeline
  reimbursementsPipeline: {
    draft: number;
    submitted: number;
    paid: number;
    total: number;
  };
  
  // Flags
  flags: Array<{
    type: "low_confidence" | "untagged" | "unusual";
    count: number;
    message: string;
  }>;
  
  // Top 3 moves
  top3Moves: TopMove[];
  
  currency: string;
}

export interface WrapSnapshot {
  id: string;
  type: WrapType;
  monthKey?: string; // YYYY-MM for monthly wraps
  period: {
    start: string; // ISO date
    end: string; // ISO date
  };
  scope?: WrapScope;
  createdAt: string;
  watchedAt?: string;
  title: string; // e.g., "Dec 2025 Wrap" or "Wrap · Oct 15–Dec 23"
  wrapData: WrapData;
  version: string; // e.g., "1.0"
}

// ROI Tracker
export interface ROIMonthlyMetrics {
  reimbursementsRecovered: number;
  interestAvoided: number;
  subscriptionsCancelled: number;
  estimatedSavings: number;
  totalBenefit: number;
}

export interface CancelledSubscription {
  id: string;
  merchant: string;
  amount: number;
  cancelledDate: string;
  originalRecurringId?: string;
}

export interface ROITrackerData {
  monthlyMetrics: Record<string, ROIMonthlyMetrics>; // monthKey -> metrics
  cancelledSubscriptions: CancelledSubscription[];
  lastUpdated: string;
}

// Reminders
export type ReminderType = "monthly_import" | "card_due" | "stale_reimbursement";
export type ReminderDeliveryMethod = "in_app" | "calendar" | "email";

export interface Reminder {
  id: string;
  type: ReminderType;
  enabled: boolean;
  triggerDays?: number; // days before/after for card due and stale
  deliveryMethods: ReminderDeliveryMethod[];
  lastTriggered?: string;
  nextTrigger?: string;
  createdAt: string;
}

// Expense Coverage
export interface ExpenseCoverageConfig {
  claimsSubmittedTotal: number;
  claimsSubmittedDate?: string;
  lastAnalyzed: string;
}

export interface ExpenseCoverageItem {
  transactionId: string;
  reason: string; // "Travel-related", "Business meal", etc.
  confidence: "high" | "medium" | "low";
}
