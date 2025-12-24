import { v4 as uuidv4 } from "uuid";
import type { 
  Transaction, Goal, Bucket, ClaimBatch, Rule, 
  RecurringTransaction, IncomeConfig, MerchantAlias 
} from "./types";

// Helper to generate dates
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Realistic UAE-based transaction data for a consultant
export function generateDemoTransactions(): Transaction[] {
  const transactions: Transaction[] = [
    // Recent business travel - Dubai to London
    {
      id: uuidv4(),
      date: daysAgo(2),
      merchant: "Emirates Airlines",
      description: "Flight DXB-LHR Business Class",
      amount: -8750,
      currency: "AED",
      tag: "reimbursable",
      status: "draft",
      category: "travel",
      spendingType: "variable",
      suggestedTag: "reimbursable",
      tagConfidence: "high",
      tagReason: "Matched: Airlines keyword",
      isAutoTagged: true,
      createdAt: daysAgo(2),
    },
    {
      id: uuidv4(),
      date: daysAgo(2),
      merchant: "Marriott London",
      description: "Hotel - 3 nights client meeting",
      amount: -4200,
      currency: "AED",
      tag: "reimbursable",
      status: "draft",
      category: "travel",
      spendingType: "variable",
      suggestedTag: "reimbursable",
      tagConfidence: "high",
      tagReason: "Matched: Hotel keyword",
      isAutoTagged: true,
      createdAt: daysAgo(2),
    },
    {
      id: uuidv4(),
      date: daysAgo(3),
      merchant: "Uber London",
      description: "Airport transfer Heathrow",
      amount: -285,
      currency: "AED",
      tag: "reimbursable",
      status: "draft",
      category: "transport",
      spendingType: "variable",
      suggestedTag: "reimbursable",
      tagConfidence: "medium",
      tagReason: "Matched: Transport during travel dates",
      isAutoTagged: true,
      createdAt: daysAgo(3),
    },
    
    // Previous trip - already submitted
    {
      id: uuidv4(),
      date: daysAgo(15),
      merchant: "Hilton Riyadh",
      description: "Hotel - Saudi project kickoff",
      amount: -3100,
      currency: "AED",
      tag: "reimbursable",
      status: "submitted",
      category: "travel",
      spendingType: "variable",
      batchId: "batch-1",
      createdAt: daysAgo(15),
    },
    {
      id: uuidv4(),
      date: daysAgo(14),
      merchant: "Saudi Airlines",
      description: "Flight DXB-RUH return",
      amount: -2450,
      currency: "AED",
      tag: "reimbursable",
      status: "submitted",
      category: "travel",
      spendingType: "variable",
      batchId: "batch-1",
      createdAt: daysAgo(14),
    },
    {
      id: uuidv4(),
      date: daysAgo(14),
      merchant: "Careem",
      description: "Riyadh airport transfers (3)",
      amount: -380,
      currency: "AED",
      tag: "reimbursable",
      status: "submitted",
      category: "transport",
      spendingType: "variable",
      batchId: "batch-1",
      createdAt: daysAgo(14),
    },
    
    // Paid reimbursements from last month
    {
      id: uuidv4(),
      date: daysAgo(35),
      merchant: "Sofitel Dubai",
      description: "Client dinner - Project Alpha",
      amount: -1850,
      currency: "AED",
      tag: "reimbursable",
      status: "paid",
      category: "dining",
      spendingType: "variable",
      batchId: "batch-2",
      createdAt: daysAgo(35),
    },
    {
      id: uuidv4(),
      date: daysAgo(38),
      merchant: "Qatar Airways",
      description: "Flight DXB-DOH client visit",
      amount: -1650,
      currency: "AED",
      tag: "reimbursable",
      status: "paid",
      category: "travel",
      spendingType: "variable",
      batchId: "batch-2",
      createdAt: daysAgo(38),
    },
    
    // Personal expenses - Fixed
    {
      id: uuidv4(),
      date: daysAgo(5),
      merchant: "DEWA",
      description: "Electricity & Water - December",
      amount: -485,
      currency: "AED",
      tag: "personal",
      category: "utilities",
      spendingType: "fixed",
      isRecurring: true,
      recurringFrequency: "monthly",
      createdAt: daysAgo(5),
    },
    {
      id: uuidv4(),
      date: daysAgo(1),
      merchant: "Etisalat",
      description: "Mobile & Internet Bundle",
      amount: -399,
      currency: "AED",
      tag: "personal",
      category: "utilities",
      spendingType: "fixed",
      isRecurring: true,
      recurringFrequency: "monthly",
      createdAt: daysAgo(1),
    },
    {
      id: uuidv4(),
      date: daysAgo(1),
      merchant: "Emaar Properties",
      description: "Rent - Downtown Dubai",
      amount: -12500,
      currency: "AED",
      tag: "personal",
      category: "rent",
      spendingType: "fixed",
      isRecurring: true,
      recurringFrequency: "monthly",
      createdAt: daysAgo(1),
    },
    
    // Subscriptions
    {
      id: uuidv4(),
      date: daysAgo(7),
      merchant: "Netflix",
      description: "Premium subscription",
      amount: -65,
      currency: "AED",
      tag: "personal",
      category: "subscriptions",
      spendingType: "fixed",
      isRecurring: true,
      recurringFrequency: "monthly",
      createdAt: daysAgo(7),
    },
    {
      id: uuidv4(),
      date: daysAgo(10),
      merchant: "Spotify",
      description: "Family plan",
      amount: -45,
      currency: "AED",
      tag: "personal",
      category: "subscriptions",
      spendingType: "fixed",
      isRecurring: true,
      recurringFrequency: "monthly",
      createdAt: daysAgo(10),
    },
    {
      id: uuidv4(),
      date: daysAgo(12),
      merchant: "Fitness First",
      description: "Gym membership",
      amount: -450,
      currency: "AED",
      tag: "personal",
      category: "health",
      spendingType: "fixed",
      isRecurring: true,
      recurringFrequency: "monthly",
      createdAt: daysAgo(12),
    },
    {
      id: uuidv4(),
      date: daysAgo(15),
      merchant: "Apple",
      description: "iCloud+ Storage",
      amount: -15,
      currency: "AED",
      tag: "personal",
      category: "subscriptions",
      spendingType: "fixed",
      isRecurring: true,
      recurringFrequency: "monthly",
      createdAt: daysAgo(15),
    },
    
    // Variable personal spending - Groceries
    {
      id: uuidv4(),
      date: daysAgo(1),
      merchant: "Carrefour",
      description: "Weekly groceries",
      amount: -487,
      currency: "AED",
      tag: "personal",
      category: "groceries",
      spendingType: "variable",
      createdAt: daysAgo(1),
    },
    {
      id: uuidv4(),
      date: daysAgo(8),
      merchant: "Spinneys",
      description: "Groceries & household",
      amount: -623,
      currency: "AED",
      tag: "personal",
      category: "groceries",
      spendingType: "variable",
      createdAt: daysAgo(8),
    },
    {
      id: uuidv4(),
      date: daysAgo(16),
      merchant: "Waitrose",
      description: "Weekend shopping",
      amount: -412,
      currency: "AED",
      tag: "personal",
      category: "groceries",
      spendingType: "variable",
      createdAt: daysAgo(16),
    },
    
    // Dining out
    {
      id: uuidv4(),
      date: daysAgo(3),
      merchant: "Zuma Dubai",
      description: "Dinner with friends",
      amount: -890,
      currency: "AED",
      tag: "personal",
      category: "dining",
      spendingType: "variable",
      createdAt: daysAgo(3),
    },
    {
      id: uuidv4(),
      date: daysAgo(6),
      merchant: "Talabat",
      description: "Food delivery",
      amount: -95,
      currency: "AED",
      tag: "personal",
      category: "dining",
      spendingType: "variable",
      createdAt: daysAgo(6),
    },
    {
      id: uuidv4(),
      date: daysAgo(9),
      merchant: "Starbucks",
      description: "Coffee meeting",
      amount: -68,
      currency: "AED",
      tag: "personal",
      category: "dining",
      spendingType: "variable",
      createdAt: daysAgo(9),
    },
    {
      id: uuidv4(),
      date: daysAgo(11),
      merchant: "La Petite Maison",
      description: "Birthday dinner",
      amount: -1250,
      currency: "AED",
      tag: "personal",
      category: "dining",
      spendingType: "variable",
      createdAt: daysAgo(11),
    },
    
    // Transport
    {
      id: uuidv4(),
      date: daysAgo(2),
      merchant: "Careem",
      description: "Ride to office",
      amount: -45,
      currency: "AED",
      tag: "personal",
      category: "transport",
      spendingType: "variable",
      createdAt: daysAgo(2),
    },
    {
      id: uuidv4(),
      date: daysAgo(4),
      merchant: "ENOC",
      description: "Fuel - Personal car",
      amount: -250,
      currency: "AED",
      tag: "personal",
      category: "transport",
      spendingType: "variable",
      createdAt: daysAgo(4),
    },
    {
      id: uuidv4(),
      date: daysAgo(7),
      merchant: "Salik",
      description: "Toll charges",
      amount: -56,
      currency: "AED",
      tag: "personal",
      category: "transport",
      spendingType: "variable",
      isRecurring: true,
      createdAt: daysAgo(7),
    },
    
    // Shopping
    {
      id: uuidv4(),
      date: daysAgo(5),
      merchant: "Amazon.ae",
      description: "Electronics & books",
      amount: -567,
      currency: "AED",
      tag: "personal",
      category: "shopping",
      spendingType: "variable",
      createdAt: daysAgo(5),
    },
    {
      id: uuidv4(),
      date: daysAgo(13),
      merchant: "IKEA",
      description: "Home decor",
      amount: -834,
      currency: "AED",
      tag: "personal",
      category: "shopping",
      spendingType: "variable",
      createdAt: daysAgo(13),
    },
    
    // Income
    {
      id: uuidv4(),
      date: daysAgo(0),
      merchant: "BCG Salary",
      description: "Monthly salary - December",
      amount: 45000,
      currency: "AED",
      tag: "personal",
      category: "income",
      spendingType: "income",
      isRecurring: true,
      recurringFrequency: "monthly",
      createdAt: daysAgo(0),
    },
    {
      id: uuidv4(),
      date: daysAgo(30),
      merchant: "BCG Salary",
      description: "Monthly salary - November",
      amount: 45000,
      currency: "AED",
      tag: "personal",
      category: "income",
      spendingType: "income",
      isRecurring: true,
      recurringFrequency: "monthly",
      createdAt: daysAgo(30),
    },
    
    // Savings transfers
    {
      id: uuidv4(),
      date: daysAgo(1),
      merchant: "Transfer to Savings",
      description: "Monthly savings",
      amount: -5000,
      currency: "AED",
      tag: "personal",
      category: "savings",
      spendingType: "transfer",
      createdAt: daysAgo(1),
    },
    {
      id: uuidv4(),
      date: daysAgo(1),
      merchant: "Sarwa Investment",
      description: "Monthly investment",
      amount: -3000,
      currency: "AED",
      tag: "personal",
      category: "investment",
      spendingType: "transfer",
      createdAt: daysAgo(1),
    },
    
    // Needs review - untagged
    {
      id: uuidv4(),
      date: daysAgo(4),
      merchant: "DHL Express",
      description: "Document shipping to client",
      amount: -180,
      currency: "AED",
      tag: null,
      category: "other",
      spendingType: "variable",
      suggestedTag: "reimbursable",
      tagConfidence: "medium",
      tagReason: "Contains 'client' - likely business expense",
      createdAt: daysAgo(4),
    },
    {
      id: uuidv4(),
      date: daysAgo(6),
      merchant: "WeWork",
      description: "Meeting room booking",
      amount: -350,
      currency: "AED",
      tag: null,
      category: "other",
      spendingType: "variable",
      suggestedTag: "reimbursable",
      tagConfidence: "medium",
      tagReason: "Co-working space - possible business expense",
      createdAt: daysAgo(6),
    },
  ];

  return transactions;
}

// Demo goals
export function generateDemoGoals(): Goal[] {
  return [
    {
      id: "goal-emergency",
      name: "Emergency Fund",
      targetAmount: 50000,
      targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      currentAmount: 32000,
      priority: "critical",
      category: "emergency",
      monthlyContribution: 3000,
      color: "#ef4444",
      createdAt: daysAgo(90),
    },
    {
      id: "goal-car",
      name: "Car Down Payment",
      targetAmount: 80000,
      targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      currentAmount: 25000,
      priority: "high",
      category: "purchase",
      monthlyContribution: 5000,
      color: "#3b82f6",
      createdAt: daysAgo(60),
    },
    {
      id: "goal-vacation",
      name: "Japan Trip 2025",
      targetAmount: 15000,
      targetDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      currentAmount: 8500,
      priority: "medium",
      category: "lifestyle",
      monthlyContribution: 2000,
      color: "#22c55e",
      createdAt: daysAgo(45),
    },
    {
      id: "goal-home",
      name: "Home Down Payment",
      targetAmount: 500000,
      targetDate: new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      currentAmount: 85000,
      priority: "high",
      category: "purchase",
      monthlyContribution: 12000,
      color: "#8b5cf6",
      createdAt: daysAgo(180),
    },
  ];
}

// Demo buckets
export function generateDemoBuckets(): Bucket[] {
  return [
    {
      id: "bucket-needs",
      name: "Needs",
      targetPercentage: 50,
      linkedCategories: ["rent", "utilities", "groceries", "transport", "health", "insurance"],
      color: "#3b82f6",
      createdAt: daysAgo(90),
    },
    {
      id: "bucket-wants",
      name: "Wants",
      targetPercentage: 30,
      linkedCategories: ["dining", "shopping", "entertainment", "subscriptions", "travel"],
      color: "#f97316",
      createdAt: daysAgo(90),
    },
    {
      id: "bucket-goals",
      name: "Savings & Goals",
      targetPercentage: 20,
      linkedCategories: ["savings", "investment"],
      color: "#22c55e",
      createdAt: daysAgo(90),
    },
  ];
}

// Demo claim batches
export function generateDemoClaimBatches(): ClaimBatch[] {
  return [
    {
      id: "batch-1",
      name: "Riyadh Trip - Dec 2024",
      status: "submitted",
      createdAt: daysAgo(14),
      submittedAt: daysAgo(10),
    },
    {
      id: "batch-2",
      name: "Qatar Client Visit - Nov 2024",
      status: "paid",
      createdAt: daysAgo(38),
      submittedAt: daysAgo(35),
      paidAt: daysAgo(25),
    },
  ];
}

// Demo rules
export function generateDemoRules(): Rule[] {
  return [
    {
      id: "rule-hotel",
      name: "Hotels → Reimbursable",
      conditions: [
        { field: "merchant", operator: "contains", value: "hotel" },
      ],
      action: { tag: "reimbursable", category: "travel" },
    },
    {
      id: "rule-airlines",
      name: "Airlines → Reimbursable",
      conditions: [
        { field: "merchant", operator: "contains", value: "airline" },
      ],
      action: { tag: "reimbursable", category: "travel" },
    },
    {
      id: "rule-flight",
      name: "Flights → Reimbursable",
      conditions: [
        { field: "description", operator: "contains", value: "flight" },
      ],
      action: { tag: "reimbursable", category: "travel" },
    },
    {
      id: "rule-client",
      name: "Client expenses → Reimbursable",
      conditions: [
        { field: "description", operator: "contains", value: "client" },
      ],
      action: { tag: "reimbursable" },
    },
  ];
}

// Demo recurring transactions
export function generateDemoRecurring(): RecurringTransaction[] {
  return [
    {
      id: "rec-rent",
      merchantPattern: "Emaar",
      normalizedMerchant: "Emaar Properties",
      category: "rent",
      averageAmount: 12500,
      frequency: "monthly",
      lastOccurrence: daysAgo(1),
      nextExpected: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      occurrences: 12,
      transactionIds: [],
      isActive: true,
      isUserConfirmed: true,
    },
    {
      id: "rec-dewa",
      merchantPattern: "DEWA",
      normalizedMerchant: "DEWA",
      category: "utilities",
      averageAmount: 485,
      frequency: "monthly",
      lastOccurrence: daysAgo(5),
      nextExpected: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      occurrences: 12,
      transactionIds: [],
      isActive: true,
      isUserConfirmed: true,
    },
    {
      id: "rec-netflix",
      merchantPattern: "Netflix",
      normalizedMerchant: "Netflix",
      category: "subscriptions",
      averageAmount: 65,
      frequency: "monthly",
      lastOccurrence: daysAgo(7),
      nextExpected: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      occurrences: 24,
      transactionIds: [],
      isActive: true,
      isUserConfirmed: true,
    },
    {
      id: "rec-spotify",
      merchantPattern: "Spotify",
      normalizedMerchant: "Spotify",
      category: "subscriptions",
      averageAmount: 45,
      frequency: "monthly",
      lastOccurrence: daysAgo(10),
      nextExpected: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      occurrences: 18,
      transactionIds: [],
      isActive: true,
      isUserConfirmed: true,
    },
    {
      id: "rec-gym",
      merchantPattern: "Fitness First",
      normalizedMerchant: "Fitness First",
      category: "health",
      averageAmount: 450,
      frequency: "monthly",
      lastOccurrence: daysAgo(12),
      nextExpected: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      occurrences: 8,
      transactionIds: [],
      isActive: true,
      isUserConfirmed: true,
    },
  ];
}

// Demo income config
export function generateDemoIncomeConfig(): IncomeConfig {
  return {
    monthlyIncome: 45000,
    currency: "AED",
    salaryDay: 1,
    additionalIncome: 0,
    lastUpdated: daysAgo(0),
  };
}

// Demo merchant aliases
export function generateDemoAliases(): MerchantAlias[] {
  return [
    { id: "alias-careem", variants: ["CAREEM", "CAREEM HALA", "Careem UAE", "CAREEM CAPTAIN"], normalizedName: "Careem" },
    { id: "alias-uber", variants: ["UBER", "UBER BV", "UBER TRIP", "UBER EATS"], normalizedName: "Uber" },
    { id: "alias-emirates", variants: ["EMIRATES", "EMIRATES AIRLINES", "EK"], normalizedName: "Emirates Airlines" },
    { id: "alias-marriott", variants: ["MARRIOTT", "MARRIOTT HOTEL", "MARRIOTT BONVOY", "MARRIOTT INTERNATIONAL"], normalizedName: "Marriott" },
    { id: "alias-starbucks", variants: ["STARBUCKS", "STARBUCKS COFFEE", "STARBUCKS UAE"], normalizedName: "Starbucks" },
  ];
}

// Card safety demo data
export function generateDemoCardSafety() {
  return {
    statementBalance: 23450,
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    paymentsMade: 5000,
    minimumDue: 1175,
    statementDate: daysAgo(18),
    safetyBuffer: 500,
  };
}

// All demo data in one object
export interface DemoData {
  transactions: Transaction[];
  goals: Goal[];
  buckets: Bucket[];
  batches: ClaimBatch[];
  rules: Rule[];
  recurring: RecurringTransaction[];
  incomeConfig: IncomeConfig;
  aliases: MerchantAlias[];
  cardSafety: ReturnType<typeof generateDemoCardSafety>;
}

export function generateAllDemoData(): DemoData {
  return {
    transactions: generateDemoTransactions(),
    goals: generateDemoGoals(),
    buckets: generateDemoBuckets(),
    batches: generateDemoClaimBatches(),
    rules: generateDemoRules(),
    recurring: generateDemoRecurring(),
    incomeConfig: generateDemoIncomeConfig(),
    aliases: generateDemoAliases(),
    cardSafety: generateDemoCardSafety(),
  };
}

