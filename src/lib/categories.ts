import type { Transaction, TransactionCategory, SpendingType, CategoryRule } from "./types";
import { CATEGORY_CONFIG } from "./types";

// Built-in category patterns for auto-detection
interface CategoryPattern {
  category: TransactionCategory;
  keywords: string[];
  spendingType: SpendingType;
  isRecurring?: boolean;
}

// UAE-specific merchant patterns
const CATEGORY_PATTERNS: CategoryPattern[] = [
  // Groceries
  {
    category: "groceries",
    keywords: [
      "carrefour", "spinneys", "lulu", "waitrose", "union coop", "choithrams",
      "al maya", "geant", "nesto", "viva", "westzone", "grandiose", "kibsons",
      "fresh market", "supermarket", "hypermarket", "grocery"
    ],
    spendingType: "variable",
  },
  // Dining & Food
  {
    category: "dining",
    keywords: [
      "talabat", "zomato", "deliveroo", "careem now", "noon food", "instashop",
      "restaurant", "cafe", "coffee", "starbucks", "costa", "tim hortons",
      "dunkin", "mcdonald", "burger king", "kfc", "subway", "pizza hut",
      "domino", "papa john", "shake shack", "five guys", "nando", "cheesecake factory",
      "pf chang", "texas roadhouse", "applebee", "chili", "tgi friday",
      "breakfast", "lunch", "dinner", "food", "eatery", "bistro", "grill"
    ],
    spendingType: "variable",
  },
  // Transport
  {
    category: "transport",
    keywords: [
      "uber", "careem", "hala", "taxi", "rta", "salik", "nol", "metro",
      "bus", "adnoc", "enoc", "emarat", "petrol", "fuel", "gas station",
      "parking", "valet", "car wash", "car rental", "hertz", "budget car",
      "avis", "sixt"
    ],
    spendingType: "variable",
  },
  // Rent & Housing
  {
    category: "rent",
    keywords: [
      "rent", "landlord", "ejari", "housing", "apartment", "villa rent",
      "maintenance fee", "service charge", "community fee", "property"
    ],
    spendingType: "fixed",
    isRecurring: true,
  },
  // Utilities
  {
    category: "utilities",
    keywords: [
      "dewa", "addc", "fewa", "sewa", "sharjah electricity", "water bill",
      "electricity", "gas bill", "district cooling", "empower", "tabreed",
      "du telecom", "etisalat", "virgin mobile", "internet", "wifi",
      "mobile bill", "phone bill", "sim card"
    ],
    spendingType: "fixed",
    isRecurring: true,
  },
  // Subscriptions
  {
    category: "subscriptions",
    keywords: [
      "netflix", "spotify", "apple music", "youtube premium", "disney+",
      "amazon prime", "hbo", "hulu", "deezer", "anghami", "shahid",
      "gym", "fitness first", "gold gym", "fitness", "membership",
      "adobe", "microsoft 365", "google one", "icloud", "dropbox",
      "linkedin premium", "medium", "substack", "patreon"
    ],
    spendingType: "fixed",
    isRecurring: true,
  },
  // Travel
  {
    category: "travel",
    keywords: [
      "emirates", "etihad", "fly dubai", "air arabia", "qatar airways",
      "airline", "airways", "flight", "booking.com", "expedia", "agoda",
      "airbnb", "hotel", "marriott", "hilton", "hyatt", "sheraton",
      "intercontinental", "holiday inn", "radisson", "novotel", "ibis",
      "rotana", "jumeirah", "fairmont", "sofitel", "ritz", "four seasons",
      "st regis", "w hotel", "westin", "visa fee", "passport", "travel insurance"
    ],
    spendingType: "variable",
  },
  // Shopping
  {
    category: "shopping",
    keywords: [
      "amazon", "noon", "namshi", "ounass", "farfetch", "shein", "aliexpress",
      "mall", "dubai mall", "mall of emirates", "city centre", "ibn battuta",
      "zara", "h&m", "uniqlo", "massimo dutti", "mango", "bershka",
      "nike", "adidas", "sephora", "bath body", "ikea", "home centre",
      "pottery barn", "crate barrel", "ace hardware", "pan emirates",
      "sharaf dg", "emax", "jumbo", "virgin megastore", "apple store"
    ],
    spendingType: "variable",
  },
  // Health & Fitness
  {
    category: "health",
    keywords: [
      "pharmacy", "life pharmacy", "boots", "aster", "bin sina",
      "hospital", "clinic", "medical", "doctor", "dentist", "dental",
      "health insurance", "daman", "insurance claim", "lab", "diagnostic",
      "optician", "vision", "glasses", "lenses"
    ],
    spendingType: "variable",
  },
  // Entertainment
  {
    category: "entertainment",
    keywords: [
      "cinema", "vox", "reel", "novo", "movie", "concert", "ticket",
      "theme park", "ferrari world", "warner bros", "legoland", "aquaventure",
      "wild wadi", "dubai parks", "global village", "expo", "museum",
      "playstation", "xbox", "steam", "gaming", "game"
    ],
    spendingType: "variable",
  },
  // Education
  {
    category: "education",
    keywords: [
      "school", "university", "college", "tuition", "course", "training",
      "udemy", "coursera", "skillshare", "masterclass", "books", "kinokuniya",
      "magrudy", "education", "learning", "exam", "certification"
    ],
    spendingType: "variable",
  },
  // Insurance
  {
    category: "insurance",
    keywords: [
      "insurance", "axa", "allianz", "zurich", "oman insurance", "salama",
      "sukoon", "national health", "car insurance", "life insurance",
      "home insurance", "policy", "premium"
    ],
    spendingType: "fixed",
    isRecurring: true,
  },
  // Bank Fees
  {
    category: "fees",
    keywords: [
      "annual fee", "bank fee", "service fee", "atm fee", "withdrawal fee",
      "transfer fee", "forex fee", "fx charge", "late fee", "interest charge",
      "finance charge", "overdraft", "penalty"
    ],
    spendingType: "fixed",
  },
  // Income (credits)
  {
    category: "income",
    keywords: [
      "salary", "payroll", "wages", "bonus", "commission", "dividend",
      "interest earned", "refund", "cashback", "reimbursement received",
      "transfer in", "deposit"
    ],
    spendingType: "income",
  },
  // Transfers
  {
    category: "transfer",
    keywords: [
      "transfer to", "transfer out", "internal transfer", "self transfer",
      "standing order", "direct debit", "wise", "western union", "exchange house"
    ],
    spendingType: "transfer",
  },
  // Savings
  {
    category: "savings",
    keywords: [
      "savings account", "fixed deposit", "fd", "term deposit", "save",
      "emergency fund", "wio space"
    ],
    spendingType: "transfer",
  },
  // Investment
  {
    category: "investment",
    keywords: [
      "investment", "stock", "etf", "mutual fund", "trading", "sarwa",
      "stashaway", "wahed", "brokerage", "dividend", "securities"
    ],
    spendingType: "transfer",
  },
];

/**
 * Detect category for a single transaction
 */
export function detectCategory(tx: Transaction, userRules: CategoryRule[] = []): {
  category: TransactionCategory;
  spendingType: SpendingType;
  isRecurring: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
} {
  const searchText = `${tx.merchant} ${tx.description}`.toLowerCase();

  // Check user-defined rules first (sorted by priority)
  const sortedRules = [...userRules].sort((a, b) => b.priority - a.priority);
  for (const rule of sortedRules) {
    const matches = rule.conditions.every((cond) => {
      const fieldValue = String(tx[cond.field as keyof Transaction] || "").toLowerCase();
      switch (cond.operator) {
        case "contains":
          return fieldValue.includes(String(cond.value).toLowerCase());
        case "equals":
          return fieldValue === String(cond.value).toLowerCase();
        case "startsWith":
          return fieldValue.startsWith(String(cond.value).toLowerCase());
        default:
          return false;
      }
    });
    
    if (matches) {
      return {
        category: rule.category,
        spendingType: rule.spendingType || CATEGORY_CONFIG[rule.category].spendingType,
        isRecurring: rule.isRecurring || false,
        confidence: "high",
        reason: `User rule: ${rule.name}`,
      };
    }
  }

  // Check built-in patterns
  for (const pattern of CATEGORY_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return {
          category: pattern.category,
          spendingType: pattern.spendingType,
          isRecurring: pattern.isRecurring || false,
          confidence: "high",
          reason: `Matched: ${keyword}`,
        };
      }
    }
  }

  // Income detection by positive amount
  if (tx.amount > 0) {
    return {
      category: "income",
      spendingType: "income",
      isRecurring: false,
      confidence: "medium",
      reason: "Positive amount (credit)",
    };
  }

  // Default to "other"
  return {
    category: "other",
    spendingType: "variable",
    isRecurring: false,
    confidence: "low",
    reason: "No pattern match",
  };
}

/**
 * Auto-categorize multiple transactions
 */
export function categorizeTransactions(
  transactions: Transaction[],
  userRules: CategoryRule[] = []
): Transaction[] {
  return transactions.map((tx) => {
    // Skip if already categorized by user
    if (tx.category && !tx.isAutoCategorized) {
      return tx;
    }

    const result = detectCategory(tx, userRules);
    
    return {
      ...tx,
      category: result.category,
      suggestedCategory: result.category,
      spendingType: result.spendingType,
      isRecurring: result.isRecurring,
      isAutoCategorized: true,
    };
  });
}

/**
 * Get category breakdown from transactions
 */
export function getCategoryBreakdown(transactions: Transaction[]): {
  category: TransactionCategory;
  label: string;
  color: string;
  icon: string;
  total: number;
  count: number;
  percentage: number;
}[] {
  const totals: Record<TransactionCategory, { total: number; count: number }> = {} as Record<TransactionCategory, { total: number; count: number }>;
  let grandTotal = 0;

  // Only count expenses (negative amounts)
  transactions.forEach((tx) => {
    if (tx.amount >= 0) return; // Skip income/credits
    if (tx.parentId) return; // Skip split children
    
    const cat = tx.category || "other";
    if (!totals[cat]) {
      totals[cat] = { total: 0, count: 0 };
    }
    totals[cat].total += Math.abs(tx.amount);
    totals[cat].count += 1;
    grandTotal += Math.abs(tx.amount);
  });

  return Object.entries(totals)
    .map(([cat, data]) => ({
      category: cat as TransactionCategory,
      label: CATEGORY_CONFIG[cat as TransactionCategory]?.label || cat,
      color: CATEGORY_CONFIG[cat as TransactionCategory]?.color || "#6b7280",
      icon: CATEGORY_CONFIG[cat as TransactionCategory]?.icon || "MoreHorizontal",
      total: data.total,
      count: data.count,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Get fixed vs variable spending breakdown
 */
export function getFixedVsVariable(transactions: Transaction[]): {
  fixed: { total: number; count: number; categories: TransactionCategory[] };
  variable: { total: number; count: number; categories: TransactionCategory[] };
  income: { total: number; count: number };
  transfer: { total: number; count: number };
} {
  const result = {
    fixed: { total: 0, count: 0, categories: [] as TransactionCategory[] },
    variable: { total: 0, count: 0, categories: [] as TransactionCategory[] },
    income: { total: 0, count: 0 },
    transfer: { total: 0, count: 0 },
  };

  const fixedCats = new Set<TransactionCategory>();
  const variableCats = new Set<TransactionCategory>();

  transactions.forEach((tx) => {
    if (tx.parentId) return; // Skip split children
    
    const type = tx.spendingType || CATEGORY_CONFIG[tx.category || "other"]?.spendingType || "variable";
    const amount = Math.abs(tx.amount);
    
    switch (type) {
      case "fixed":
        result.fixed.total += amount;
        result.fixed.count += 1;
        if (tx.category) fixedCats.add(tx.category);
        break;
      case "variable":
        result.variable.total += amount;
        result.variable.count += 1;
        if (tx.category) variableCats.add(tx.category);
        break;
      case "income":
        result.income.total += amount;
        result.income.count += 1;
        break;
      case "transfer":
        result.transfer.total += amount;
        result.transfer.count += 1;
        break;
    }
  });

  result.fixed.categories = Array.from(fixedCats);
  result.variable.categories = Array.from(variableCats);

  return result;
}

/**
 * Get month-over-month comparison by category
 */
export function getMonthOverMonthComparison(
  transactions: Transaction[],
  currentMonth: Date = new Date()
): {
  category: TransactionCategory;
  label: string;
  currentMonth: number;
  previousMonth: number;
  change: number;
  changePercentage: number;
}[] {
  const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const previousMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const previousMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);

  const current: Record<TransactionCategory, number> = {} as Record<TransactionCategory, number>;
  const previous: Record<TransactionCategory, number> = {} as Record<TransactionCategory, number>;

  transactions.forEach((tx) => {
    if (tx.amount >= 0) return; // Skip income
    if (tx.parentId) return;
    
    const txDate = new Date(tx.date);
    const cat = tx.category || "other";
    const amount = Math.abs(tx.amount);

    if (txDate >= currentMonthStart) {
      current[cat] = (current[cat] || 0) + amount;
    } else if (txDate >= previousMonthStart && txDate <= previousMonthEnd) {
      previous[cat] = (previous[cat] || 0) + amount;
    }
  });

  // Combine all categories
  const allCategories = new Set([...Object.keys(current), ...Object.keys(previous)]);
  
  return Array.from(allCategories)
    .map((cat) => {
      const curr = current[cat as TransactionCategory] || 0;
      const prev = previous[cat as TransactionCategory] || 0;
      const change = curr - prev;
      const changePercentage = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
      
      return {
        category: cat as TransactionCategory,
        label: CATEGORY_CONFIG[cat as TransactionCategory]?.label || cat,
        currentMonth: curr,
        previousMonth: prev,
        change,
        changePercentage,
      };
    })
    .filter((item) => item.currentMonth > 0 || item.previousMonth > 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

/**
 * Get cashflow summary
 */
export function getCashflowSummary(transactions: Transaction[]): {
  totalInflow: number;
  totalOutflow: number;
  netCashflow: number;
  inflowByCategory: { category: TransactionCategory; amount: number }[];
  outflowByCategory: { category: TransactionCategory; amount: number }[];
} {
  let totalInflow = 0;
  let totalOutflow = 0;
  const inflowByCategory: Record<TransactionCategory, number> = {} as Record<TransactionCategory, number>;
  const outflowByCategory: Record<TransactionCategory, number> = {} as Record<TransactionCategory, number>;

  transactions.forEach((tx) => {
    if (tx.parentId) return;
    
    const cat = tx.category || "other";
    
    if (tx.amount > 0) {
      totalInflow += tx.amount;
      inflowByCategory[cat] = (inflowByCategory[cat] || 0) + tx.amount;
    } else {
      totalOutflow += Math.abs(tx.amount);
      outflowByCategory[cat] = (outflowByCategory[cat] || 0) + Math.abs(tx.amount);
    }
  });

  return {
    totalInflow,
    totalOutflow,
    netCashflow: totalInflow - totalOutflow,
    inflowByCategory: Object.entries(inflowByCategory)
      .map(([cat, amount]) => ({ category: cat as TransactionCategory, amount }))
      .sort((a, b) => b.amount - a.amount),
    outflowByCategory: Object.entries(outflowByCategory)
      .map(([cat, amount]) => ({ category: cat as TransactionCategory, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

/**
 * Get top merchants
 */
export function getTopMerchants(
  transactions: Transaction[],
  limit: number = 10
): {
  merchant: string;
  category: TransactionCategory;
  total: number;
  count: number;
  averageAmount: number;
}[] {
  const merchants: Record<string, { category: TransactionCategory; total: number; count: number }> = {};

  transactions.forEach((tx) => {
    if (tx.amount >= 0) return; // Skip income
    if (tx.parentId) return;
    
    const merchant = tx.merchant;
    if (!merchants[merchant]) {
      merchants[merchant] = { category: tx.category || "other", total: 0, count: 0 };
    }
    merchants[merchant].total += Math.abs(tx.amount);
    merchants[merchant].count += 1;
  });

  return Object.entries(merchants)
    .map(([merchant, data]) => ({
      merchant,
      category: data.category,
      total: data.total,
      count: data.count,
      averageAmount: data.total / data.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

