import { get, set, del } from "idb-keyval";
import type { 
  Transaction, Rule, CardSafetyData, ClaimBatch, ImportProfile, MerchantAlias,
  Goal, Bucket, CategoryRule, RecurringTransaction, IncomeConfig, WrapSnapshot,
  ROITrackerData, Reminder, ExpenseCoverageConfig, ExpenseCoverageItem, Account, Budget
} from "./types";
import type { UserProfile } from "./appState";

const TRANSACTIONS_KEY = "reimburse_transactions";
const RULES_KEY = "reimburse_rules";
const CARD_SAFETY_KEY = "reimburse_card_safety";
const LICENSE_KEY = "reimburse_license";
const BATCHES_KEY = "reimburse_batches";
const PROFILES_KEY = "reimburse_import_profiles";
const ALIASES_KEY = "reimburse_merchant_aliases";
const GOALS_KEY = "claimpilot_goals";
const BUCKETS_KEY = "claimpilot_buckets";
const CATEGORY_RULES_KEY = "claimpilot_category_rules";
const RECURRING_KEY = "claimpilot_recurring";
const INCOME_KEY = "claimpilot_income";
const PROFILE_KEY = "claimpilot_profile";
const WRAPS_KEY = "claimpilot_wraps";
const ROI_TRACKER_KEY = "claimpilot_roi_tracker";
const REMINDERS_KEY = "claimpilot_reminders";
const ACCOUNTS_KEY = "claimpilot_accounts";
const EXPENSE_COVERAGE_KEY = "claimpilot_expense_coverage";
const BUDGETS_KEY = "claimpilot_budgets";
const AIDEEPDIVE_PREFERENCE_KEY = "claimpilot_ai_deepdive_enabled";

// Transactions
export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  await set(TRANSACTIONS_KEY, transactions);
}

export async function loadTransactions(): Promise<Transaction[]> {
  const data = await get<Transaction[]>(TRANSACTIONS_KEY);
  return data || [];
}

export async function addTransactions(newTransactions: Transaction[]): Promise<Transaction[]> {
  const existing = await loadTransactions();
  // Dedupe by checking if transaction with same date, description, amount exists
  const deduped = newTransactions.filter((newTx) => {
    return !existing.some(
      (existingTx) =>
        existingTx.date === newTx.date &&
        existingTx.description === newTx.description &&
        existingTx.amount === newTx.amount
    );
  });
  const merged = [...existing, ...deduped];
  await saveTransactions(merged);
  return merged;
}

export async function updateTransaction(
  id: string,
  updates: Partial<Transaction>
): Promise<Transaction[]> {
  const transactions = await loadTransactions();
  const updated = transactions.map((tx) =>
    tx.id === id ? { ...tx, ...updates } : tx
  );
  await saveTransactions(updated);
  return updated;
}

export async function deleteTransaction(id: string): Promise<Transaction[]> {
  const transactions = await loadTransactions();
  // Also delete any children if this is a parent
  const filtered = transactions.filter((tx) => tx.id !== id && tx.parentId !== id);
  await saveTransactions(filtered);
  return filtered;
}

export async function clearAllTransactions(): Promise<void> {
  await del(TRANSACTIONS_KEY);
}

// Rules
export async function saveRules(rules: Rule[]): Promise<void> {
  await set(RULES_KEY, rules);
}

export async function loadRules(): Promise<Rule[]> {
  const data = await get<Rule[]>(RULES_KEY);
  return data || [];
}

export async function addRule(rule: Rule): Promise<Rule[]> {
  const rules = await loadRules();
  rules.push(rule);
  await saveRules(rules);
  return rules;
}

export async function deleteRule(id: string): Promise<Rule[]> {
  const rules = await loadRules();
  const filtered = rules.filter((r) => r.id !== id);
  await saveRules(filtered);
  return filtered;
}

// Card Safety
export async function saveCardSafety(data: CardSafetyData): Promise<void> {
  await set(CARD_SAFETY_KEY, data);
}

export async function loadCardSafety(): Promise<CardSafetyData | null> {
  const data = await get<CardSafetyData>(CARD_SAFETY_KEY);
  return data || null;
}

// License
import type { License, LicenseTier } from "./types";

export async function saveLicense(
  key: string, 
  tier: LicenseTier = "paid", 
  email?: string
): Promise<void> {
  await set(LICENSE_KEY, { 
    key, 
    tier,
    validatedAt: new Date().toISOString(),
    email,
  });
}

export async function loadLicense(): Promise<License | null> {
  const data = await get<License>(LICENSE_KEY);
  // Handle legacy format (without tier)
  if (data && !data.tier) {
    return { ...data, tier: "paid" };
  }
  return data || null;
}

export async function clearLicense(): Promise<void> {
  await del(LICENSE_KEY);
}

// Claim Batches
export async function saveBatches(batches: ClaimBatch[]): Promise<void> {
  await set(BATCHES_KEY, batches);
}

export async function loadBatches(): Promise<ClaimBatch[]> {
  const data = await get<ClaimBatch[]>(BATCHES_KEY);
  return data || [];
}

export async function addBatch(batch: ClaimBatch): Promise<ClaimBatch[]> {
  const batches = await loadBatches();
  batches.push(batch);
  await saveBatches(batches);
  return batches;
}

export async function updateBatch(
  id: string,
  updates: Partial<ClaimBatch>
): Promise<ClaimBatch[]> {
  const batches = await loadBatches();
  const updated = batches.map((b) =>
    b.id === id ? { ...b, ...updates } : b
  );
  await saveBatches(updated);
  return updated;
}

export async function deleteBatch(id: string): Promise<ClaimBatch[]> {
  const batches = await loadBatches();
  const filtered = batches.filter((b) => b.id !== id);
  await saveBatches(filtered);
  return filtered;
}

// Import Profiles
export async function saveProfiles(profiles: ImportProfile[]): Promise<void> {
  await set(PROFILES_KEY, profiles);
}

export async function loadProfiles(): Promise<ImportProfile[]> {
  const data = await get<ImportProfile[]>(PROFILES_KEY);
  return data || [];
}

export async function addProfile(profile: ImportProfile): Promise<ImportProfile[]> {
  const profiles = await loadProfiles();
  profiles.push(profile);
  await saveProfiles(profiles);
  return profiles;
}

export async function deleteProfile(id: string): Promise<ImportProfile[]> {
  const profiles = await loadProfiles();
  const filtered = profiles.filter((p) => p.id !== id);
  await saveProfiles(filtered);
  return filtered;
}

// Merchant Aliases
export async function saveAliases(aliases: MerchantAlias[]): Promise<void> {
  await set(ALIASES_KEY, aliases);
}

export async function loadAliases(): Promise<MerchantAlias[]> {
  const data = await get<MerchantAlias[]>(ALIASES_KEY);
  return data || getDefaultAliases();
}

export async function addAlias(alias: MerchantAlias): Promise<MerchantAlias[]> {
  const aliases = await loadAliases();
  aliases.push(alias);
  await saveAliases(aliases);
  return aliases;
}

export async function updateAlias(
  id: string,
  updates: Partial<MerchantAlias>
): Promise<MerchantAlias[]> {
  const aliases = await loadAliases();
  const updated = aliases.map((a) =>
    a.id === id ? { ...a, ...updates } : a
  );
  await saveAliases(updated);
  return updated;
}

export async function deleteAlias(id: string): Promise<MerchantAlias[]> {
  const aliases = await loadAliases();
  const filtered = aliases.filter((a) => a.id !== id);
  await saveAliases(filtered);
  return filtered;
}

// Default merchant aliases
function getDefaultAliases(): MerchantAlias[] {
  return [
    { id: "careem", variants: ["CAREEM", "CAREEM HALA", "CAREEM UAE"], normalizedName: "Careem" },
    { id: "uber", variants: ["UBER", "UBER BV", "UBER TRIP", "UBER EATS"], normalizedName: "Uber" },
    { id: "amazon", variants: ["AMAZON", "AMAZON.AE", "AMZN", "AMAZON AWS"], normalizedName: "Amazon" },
    { id: "netflix", variants: ["NETFLIX", "NETFLIX.COM"], normalizedName: "Netflix" },
    { id: "spotify", variants: ["SPOTIFY", "SPOTIFY AB"], normalizedName: "Spotify" },
    { id: "starbucks", variants: ["STARBUCKS", "STARBUCKS COFFEE"], normalizedName: "Starbucks" },
    { id: "marriott", variants: ["MARRIOTT", "MARRIOTT HOTEL", "MARRIOTT BONVOY"], normalizedName: "Marriott" },
    { id: "hilton", variants: ["HILTON", "HILTON HOTEL", "HILTON HONORS"], normalizedName: "Hilton" },
  ];
}

// Goals
export async function saveGoals(goals: Goal[]): Promise<void> {
  await set(GOALS_KEY, goals);
}

export async function loadGoals(): Promise<Goal[]> {
  const data = await get<Goal[]>(GOALS_KEY);
  return data || [];
}

export async function addGoal(goal: Goal): Promise<Goal[]> {
  const goals = await loadGoals();
  goals.push(goal);
  await saveGoals(goals);
  return goals;
}

export async function updateGoal(
  id: string,
  updates: Partial<Goal>
): Promise<Goal[]> {
  const goals = await loadGoals();
  const updated = goals.map((g) =>
    g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
  );
  await saveGoals(updated);
  return updated;
}

export async function deleteGoal(id: string): Promise<Goal[]> {
  const goals = await loadGoals();
  const filtered = goals.filter((g) => g.id !== id);
  await saveGoals(filtered);
  return filtered;
}

// Buckets
export async function saveBuckets(buckets: Bucket[]): Promise<void> {
  await set(BUCKETS_KEY, buckets);
}

export async function loadBuckets(): Promise<Bucket[]> {
  const data = await get<Bucket[]>(BUCKETS_KEY);
  return data || getDefaultBuckets();
}

export async function addBucket(bucket: Bucket): Promise<Bucket[]> {
  const buckets = await loadBuckets();
  buckets.push(bucket);
  await saveBuckets(buckets);
  return buckets;
}

export async function updateBucket(
  id: string,
  updates: Partial<Bucket>
): Promise<Bucket[]> {
  const buckets = await loadBuckets();
  const updated = buckets.map((b) =>
    b.id === id ? { ...b, ...updates } : b
  );
  await saveBuckets(updated);
  return updated;
}

export async function deleteBucket(id: string): Promise<Bucket[]> {
  const buckets = await loadBuckets();
  const filtered = buckets.filter((b) => b.id !== id);
  await saveBuckets(filtered);
  return filtered;
}

function getDefaultBuckets(): Bucket[] {
  return [
    {
      id: "needs",
      name: "Needs",
      targetPercentage: 50,
      linkedCategories: ["rent", "utilities", "groceries", "transport", "health", "insurance"],
      color: "#3b82f6",
      createdAt: new Date().toISOString(),
    },
    {
      id: "wants",
      name: "Wants",
      targetPercentage: 30,
      linkedCategories: ["dining", "shopping", "entertainment", "subscriptions", "travel"],
      color: "#f97316",
      createdAt: new Date().toISOString(),
    },
    {
      id: "goals",
      name: "Goals",
      targetPercentage: 20,
      linkedCategories: ["savings", "investment"],
      color: "#22c55e",
      createdAt: new Date().toISOString(),
    },
  ];
}

// Category Rules
export async function saveCategoryRules(rules: CategoryRule[]): Promise<void> {
  await set(CATEGORY_RULES_KEY, rules);
}

export async function loadCategoryRules(): Promise<CategoryRule[]> {
  const data = await get<CategoryRule[]>(CATEGORY_RULES_KEY);
  return data || [];
}

export async function addCategoryRule(rule: CategoryRule): Promise<CategoryRule[]> {
  const rules = await loadCategoryRules();
  rules.push(rule);
  await saveCategoryRules(rules);
  return rules;
}

export async function updateCategoryRule(
  id: string,
  updates: Partial<CategoryRule>
): Promise<CategoryRule[]> {
  const rules = await loadCategoryRules();
  const updated = rules.map((r) =>
    r.id === id ? { ...r, ...updates } : r
  );
  await saveCategoryRules(updated);
  return updated;
}

export async function deleteCategoryRule(id: string): Promise<CategoryRule[]> {
  const rules = await loadCategoryRules();
  const filtered = rules.filter((r) => r.id !== id);
  await saveCategoryRules(filtered);
  return filtered;
}

// Recurring Transactions
export async function saveRecurring(recurring: RecurringTransaction[]): Promise<void> {
  await set(RECURRING_KEY, recurring);
}

export async function loadRecurring(): Promise<RecurringTransaction[]> {
  const data = await get<RecurringTransaction[]>(RECURRING_KEY);
  return data || [];
}

export async function addRecurring(item: RecurringTransaction): Promise<RecurringTransaction[]> {
  const recurring = await loadRecurring();
  recurring.push(item);
  await saveRecurring(recurring);
  return recurring;
}

export async function updateRecurring(
  id: string,
  updates: Partial<RecurringTransaction>
): Promise<RecurringTransaction[]> {
  const recurring = await loadRecurring();
  const updated = recurring.map((r) =>
    r.id === id ? { ...r, ...updates } : r
  );
  await saveRecurring(updated);
  return updated;
}

export async function deleteRecurring(id: string): Promise<RecurringTransaction[]> {
  const recurring = await loadRecurring();
  const filtered = recurring.filter((r) => r.id !== id);
  await saveRecurring(filtered);
  return filtered;
}

// Income Config
export async function saveIncomeConfig(config: IncomeConfig): Promise<void> {
  await set(INCOME_KEY, config);
}

export async function loadIncomeConfig(): Promise<IncomeConfig | null> {
  const data = await get<IncomeConfig>(INCOME_KEY);
  return data || null;
}

// User Profile
export async function saveProfile(profile: UserProfile): Promise<void> {
  await set(PROFILE_KEY, profile);
}

export async function loadProfile(): Promise<UserProfile | null> {
  const data = await get<UserProfile>(PROFILE_KEY);
  return data || null;
}

export async function deleteUserProfile(): Promise<void> {
  await del(PROFILE_KEY);
}

// Wrap Snapshots
export async function saveWrapSnapshot(wrap: WrapSnapshot): Promise<void> {
  const wraps = await loadWrapSnapshots();
  const existingIndex = wraps.findIndex(w => w.id === wrap.id);
  if (existingIndex >= 0) {
    wraps[existingIndex] = wrap;
  } else {
    wraps.push(wrap);
  }
  await set(WRAPS_KEY, wraps);
}

export async function loadWrapSnapshots(): Promise<WrapSnapshot[]> {
  const data = await get<WrapSnapshot[]>(WRAPS_KEY);
  return data || [];
}

export async function getWrapSnapshot(id: string): Promise<WrapSnapshot | null> {
  const wraps = await loadWrapSnapshots();
  return wraps.find(w => w.id === id) || null;
}

export async function getMonthlyWrap(monthKey: string): Promise<WrapSnapshot | null> {
  const wraps = await loadWrapSnapshots();
  return wraps.find(w => w.type === "monthly" && w.monthKey === monthKey) || null;
}

export async function deleteWrapSnapshot(id: string): Promise<void> {
  const wraps = await loadWrapSnapshots();
  const filtered = wraps.filter(w => w.id !== id);
  await set(WRAPS_KEY, filtered);
}

export async function updateWrapWatchedAt(id: string, watchedAt: string): Promise<void> {
  const wraps = await loadWrapSnapshots();
  const updated = wraps.map(w => w.id === id ? { ...w, watchedAt } : w);
  await set(WRAPS_KEY, updated);
}

// ROI Tracker
export async function saveROITrackerData(data: ROITrackerData): Promise<void> {
  await set(ROI_TRACKER_KEY, data);
}

export async function loadROITrackerData(): Promise<ROITrackerData | null> {
  const data = await get<ROITrackerData>(ROI_TRACKER_KEY);
  return data || null;
}

export async function updateROITrackerData(updates: Partial<ROITrackerData>): Promise<ROITrackerData> {
  const existing = await loadROITrackerData();
  const { monthlyMetrics: updatesMonthlyMetrics, cancelledSubscriptions: updatesCancelledSubscriptions, lastUpdated: updatesLastUpdated, ...restUpdates } = updates;
  const { monthlyMetrics: existingMonthlyMetrics, cancelledSubscriptions: existingCancelledSubscriptions, lastUpdated: existingLastUpdated, ...restExisting } = existing || {};
  const updated: ROITrackerData = {
    ...restExisting,
    ...restUpdates,
    monthlyMetrics: { ...existingMonthlyMetrics, ...updatesMonthlyMetrics },
    cancelledSubscriptions: updatesCancelledSubscriptions ?? existingCancelledSubscriptions ?? [],
    lastUpdated: updatesLastUpdated ?? existingLastUpdated ?? new Date().toISOString(),
  };
  await saveROITrackerData(updated);
  return updated;
}

// Reminders
export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await set(REMINDERS_KEY, reminders);
}

export async function loadReminders(): Promise<Reminder[]> {
  const data = await get<Reminder[]>(REMINDERS_KEY);
  return data || [];
}

export async function addReminder(reminder: Reminder): Promise<Reminder[]> {
  const reminders = await loadReminders();
  reminders.push(reminder);
  await saveReminders(reminders);
  return reminders;
}

export async function updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder[]> {
  const reminders = await loadReminders();
  const updated = reminders.map(r => r.id === id ? { ...r, ...updates } : r);
  await saveReminders(updated);
  return updated;
}

export async function deleteReminder(id: string): Promise<Reminder[]> {
  const reminders = await loadReminders();
  const filtered = reminders.filter(r => r.id !== id);
  await saveReminders(filtered);
  return filtered;
}

// Expense Coverage
export async function saveExpenseCoverageConfig(config: ExpenseCoverageConfig): Promise<void> {
  await set(EXPENSE_COVERAGE_KEY, config);
}

export async function loadExpenseCoverageConfig(): Promise<ExpenseCoverageConfig | null> {
  const data = await get<ExpenseCoverageConfig>(EXPENSE_COVERAGE_KEY);
  return data || null;
}

export async function saveExpenseCoverageItems(items: ExpenseCoverageItem[]): Promise<void> {
  await set(`${EXPENSE_COVERAGE_KEY}_items`, items);
}

export async function loadExpenseCoverageItems(): Promise<ExpenseCoverageItem[]> {
  const data = await get<ExpenseCoverageItem[]>(`${EXPENSE_COVERAGE_KEY}_items`);
  return data || [];
}

// Accounts
export async function saveAccounts(accounts: Account[]): Promise<void> {
  await set(ACCOUNTS_KEY, accounts);
}

export async function loadAccounts(): Promise<Account[]> {
  const data = await get<Account[]>(ACCOUNTS_KEY);
  return data || [];
}

export async function addAccount(account: Account): Promise<Account[]> {
  const accounts = await loadAccounts();
  accounts.push(account);
  await saveAccounts(accounts);
  return accounts;
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<Account[]> {
  const accounts = await loadAccounts();
  const updated = accounts.map((a) =>
    a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
  );
  await saveAccounts(updated);
  return updated;
}

export async function deleteAccount(id: string): Promise<Account[]> {
  const accounts = await loadAccounts();
  const filtered = accounts.filter((a) => a.id !== id);
  await saveAccounts(filtered);
  return filtered;
}

// Budgets
export async function saveBudgets(budgets: Budget[]): Promise<void> {
  await set(BUDGETS_KEY, budgets);
}

export async function loadBudgets(): Promise<Budget[]> {
  const data = await get<Budget[]>(BUDGETS_KEY);
  return data || [];
}

export async function addBudget(budget: Budget): Promise<Budget[]> {
  const budgets = await loadBudgets();
  budgets.push(budget);
  await saveBudgets(budgets);
  return budgets;
}

export async function updateBudget(id: string, updates: Partial<Budget>): Promise<Budget[]> {
  const budgets = await loadBudgets();
  const updated = budgets.map((b) =>
    b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
  );
  await saveBudgets(updated);
  return updated;
}

export async function deleteBudget(id: string): Promise<Budget[]> {
  const budgets = await loadBudgets();
  const filtered = budgets.filter((b) => b.id !== id);
  await saveBudgets(filtered);
  return filtered;
}

// AI Deep Dive Preference
export async function saveAIDeepDivePreference(enabled: boolean): Promise<void> {
  await set(AIDEEPDIVE_PREFERENCE_KEY, enabled);
}

export async function loadAIDeepDivePreference(): Promise<boolean> {
  const data = await get<boolean>(AIDEEPDIVE_PREFERENCE_KEY);
  return data ?? false; // Default to false (OFF)
}

// Delete all data (for privacy/data controls)
export async function deleteAllData(): Promise<void> {
  // Delete all data types
  await Promise.all([
    del(TRANSACTIONS_KEY),
    del(RULES_KEY),
    del(CARD_SAFETY_KEY),
    del(BATCHES_KEY),
    del(PROFILES_KEY),
    del(ALIASES_KEY),
    del(GOALS_KEY),
    del(BUCKETS_KEY),
    del(CATEGORY_RULES_KEY),
    del(RECURRING_KEY),
    del(INCOME_KEY),
    del(PROFILE_KEY),
    del(WRAPS_KEY),
    del(ROI_TRACKER_KEY),
    del(REMINDERS_KEY),
    del(ACCOUNTS_KEY),
    del(EXPENSE_COVERAGE_KEY),
    del(BUDGETS_KEY),
    // Note: LICENSE_KEY is intentionally preserved - user may want to keep their license
  ]);
}
