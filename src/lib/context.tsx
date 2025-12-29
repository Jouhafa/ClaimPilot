"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { 
  Transaction, Rule, ClaimBatch, MerchantAlias, CardSafetyData,
  Goal, Bucket, CategoryRule, RecurringTransaction, IncomeConfig,
  License, LicenseTier, Account, Budget
} from "./types";
import { hasFeatureAccess } from "./types";
import {
  loadTransactions,
  saveTransactions,
  addTransactions as addTransactionsToStorage,
  updateTransaction as updateTransactionInStorage,
  deleteTransaction as deleteTransactionFromStorage,
  clearAllTransactions,
  loadRules,
  saveRules,
  loadBatches,
  saveBatches,
  loadAliases,
  saveAliases,
  loadGoals,
  saveGoals,
  loadBuckets,
  saveBuckets,
  loadCategoryRules,
  saveCategoryRules,
  loadRecurring,
  saveRecurring,
  loadIncomeConfig,
  saveIncomeConfig,
  loadCardSafety,
  saveCardSafety,
  loadLicense,
  saveLicense,
  clearLicense,
  loadProfile,
  saveProfile,
  loadAccounts,
  saveAccounts,
  addAccount as addAccountToStorage,
  updateAccount as updateAccountInStorage,
  deleteAccount as deleteAccountFromStorage,
  loadBudgets,
  saveBudgets,
  addBudget as addBudgetToStorage,
  updateBudget as updateBudgetInStorage,
  deleteBudget as deleteBudgetFromStorage,
  deleteAllData,
} from "./storage";
import type { UserProfile } from "./appState";

interface AppContextType {
  // Data
  transactions: Transaction[];
  rules: Rule[];
  batches: ClaimBatch[];
  aliases: MerchantAlias[];
  goals: Goal[];
  buckets: Bucket[];
  categoryRules: CategoryRule[];
  recurring: RecurringTransaction[];
  incomeConfig: IncomeConfig | null;
  cardSafety: CardSafetyData | null;
  license: License | null;
  profile: UserProfile | null;
  accounts: Account[];
  selectedAccountId: string | null;
  budgets: Budget[];
  isLoading: boolean;
  
  // License functions
  tier: LicenseTier;
  hasAccess: (feature: string) => boolean;
  setLicense: (license: License | null) => Promise<void>;
  verifyLicense: (key: string) => Promise<{ valid: boolean; error?: string }>;
  removeLicense: () => Promise<void>;
  
  // Transaction functions
  addTransactions: (newTransactions: Transaction[]) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  updateTransactions: (ids: string[], updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteAllTransactions: () => Promise<void>;
  deleteAllData: () => Promise<void>;
  splitTransaction: (id: string, splits: { percentage: number; tag: Transaction["tag"] }[]) => Promise<void>;
  
  // Rule functions
  addRule: (rule: Rule) => Promise<void>;
  updateRule: (id: string, updates: Partial<Rule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  
  // Batch functions
  addBatch: (batch: ClaimBatch) => Promise<void>;
  updateBatch: (id: string, updates: Partial<ClaimBatch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  assignToBatch: (transactionIds: string[], batchId: string) => Promise<void>;
  removeFromBatch: (transactionIds: string[]) => Promise<void>;
  
  // Alias functions
  addAlias: (alias: MerchantAlias) => Promise<void>;
  updateAlias: (id: string, updates: Partial<MerchantAlias>) => Promise<void>;
  deleteAlias: (id: string) => Promise<void>;
  applyMerchantNormalization: () => Promise<number>;
  
  // Goal functions
  addGoal: (goal: Goal) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  
  // Bucket functions
  addBucket: (bucket: Bucket) => Promise<void>;
  updateBucket: (id: string, updates: Partial<Bucket>) => Promise<void>;
  deleteBucket: (id: string) => Promise<void>;
  
  // Category rule functions
  addCategoryRule: (rule: CategoryRule) => Promise<void>;
  updateCategoryRule: (id: string, updates: Partial<CategoryRule>) => Promise<void>;
  deleteCategoryRule: (id: string) => Promise<void>;
  
  // Recurring functions
  addRecurring: (item: RecurringTransaction) => Promise<void>;
  updateRecurring: (id: string, updates: Partial<RecurringTransaction>) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  setRecurring: (items: RecurringTransaction[]) => Promise<void>;
  
  // Income config
  setIncomeConfig: (config: IncomeConfig) => Promise<void>;
  
  // Card safety
  setCardSafety: (data: CardSafetyData) => Promise<void>;
  
  // Profile functions
  setProfile: (profile: UserProfile) => Promise<void>;
  
  // Account functions
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  setSelectedAccount: (accountId: string | null) => void;
  
  // Budget functions
  addBudget: (budget: Budget) => Promise<void>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [batches, setBatches] = useState<ClaimBatch[]>([]);
  const [aliases, setAliases] = useState<MerchantAlias[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [recurring, setRecurringState] = useState<RecurringTransaction[]>([]);
  const [incomeConfig, setIncomeConfigState] = useState<IncomeConfig | null>(null);
  const [cardSafety, setCardSafetyState] = useState<CardSafetyData | null>(null);
  const [license, setLicenseState] = useState<License | null>(null);
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Computed tier
  const tier: LicenseTier = license?.tier || "free";
  
  // Check feature access
  const hasAccess = useCallback((feature: string) => {
    return hasFeatureAccess(tier, feature);
  }, [tier]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        loadedTransactions, 
        loadedRules, 
        loadedBatches, 
        loadedAliases,
        loadedGoals,
        loadedBuckets,
        loadedCategoryRules,
        loadedRecurring,
        loadedIncomeConfig,
        loadedCardSafety,
        loadedLicense,
        loadedProfile,
        loadedAccounts,
        loadedBudgets,
      ] = await Promise.all([
        loadTransactions(),
        loadRules(),
        loadBatches(),
        loadAliases(),
        loadGoals(),
        loadBuckets(),
        loadCategoryRules(),
        loadRecurring(),
        loadIncomeConfig(),
        loadCardSafety(),
        loadLicense(),
        loadProfile(),
        loadAccounts(),
        loadBudgets(),
      ]);
      setTransactions(loadedTransactions);
      setRules(loadedRules);
      setBatches(loadedBatches);
      setAliases(loadedAliases);
      setGoals(loadedGoals);
      setBuckets(loadedBuckets);
      setCategoryRules(loadedCategoryRules);
      setRecurringState(loadedRecurring);
      setIncomeConfigState(loadedIncomeConfig);
      setCardSafetyState(loadedCardSafety);
      setLicenseState(loadedLicense);
      setProfileState(loadedProfile);
      setAccounts(loadedAccounts);
      setBudgets(loadedBudgets);
      
      // Set default selected account if none selected and accounts exist
      if (!selectedAccountId && loadedAccounts.length > 0) {
        const activeAccount = loadedAccounts.find(a => a.isActive) || loadedAccounts[0];
        if (activeAccount) {
          setSelectedAccountId(activeAccount.id);
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Transaction functions
  const addTransactions = async (newTransactions: Transaction[]) => {
    const merged = await addTransactionsToStorage(newTransactions);
    setTransactions(merged);
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const updated = await updateTransactionInStorage(id, updates);
    setTransactions(updated);
  };

  const updateTransactions = async (ids: string[], updates: Partial<Transaction>) => {
    const allTransactions = await loadTransactions();
    const updated = allTransactions.map((tx) =>
      ids.includes(tx.id) ? { ...tx, ...updates } : tx
    );
    await saveTransactions(updated);
    setTransactions(updated);
  };

  const deleteTransaction = async (id: string) => {
    const updated = await deleteTransactionFromStorage(id);
    setTransactions(updated);
  };

  const deleteAllTransactions = async () => {
    await clearAllTransactions();
    setTransactions([]);
  };

  const deleteAllDataHandler = async () => {
    await deleteAllData();
    // Clear all state
    setTransactions([]);
    setRules([]);
    setBatches([]);
    setAliases([]);
    setGoals([]);
    setBuckets([]);
    setCategoryRules([]);
    setRecurringState([]);
    setIncomeConfigState(null);
    setCardSafetyState(null);
    setProfileState(null);
    setAccounts([]);
    setBudgets([]);
    // Note: License is preserved
  };

  const splitTransaction = async (
    id: string, 
    splits: { percentage: number; tag: Transaction["tag"] }[]
  ) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error("Split percentages must sum to 100");
    }

    const updatedOriginal = { ...tx, isSplit: true };
    
    const splitTransactions: Transaction[] = splits.map((split, index) => ({
      id: uuidv4(),
      date: tx.date,
      merchant: tx.merchant,
      description: `${tx.description} (Split ${index + 1}: ${split.percentage}%)`,
      amount: (tx.amount * split.percentage) / 100,
      currency: tx.currency,
      tag: split.tag,
      status: split.tag === "reimbursable" ? "draft" : undefined,
      parentId: tx.id,
      splitPercentage: split.percentage,
      category: tx.category,
      createdAt: new Date().toISOString(),
    }));

    const allTransactions = await loadTransactions();
    const updated = allTransactions.map((t) =>
      t.id === id ? updatedOriginal : t
    );
    const withSplits = [...updated, ...splitTransactions];
    await saveTransactions(withSplits);
    setTransactions(withSplits);
  };

  // Rule functions
  const addRule = async (rule: Rule) => {
    const newRules = [...rules, rule];
    await saveRules(newRules);
    setRules(newRules);
  };

  const updateRule = async (id: string, updates: Partial<Rule>) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    await saveRules(updated);
    setRules(updated);
  };

  const deleteRule = async (id: string) => {
    const filtered = rules.filter((r) => r.id !== id);
    await saveRules(filtered);
    setRules(filtered);
  };

  // Batch functions
  const addBatch = async (batch: ClaimBatch) => {
    const newBatches = [...batches, batch];
    await saveBatches(newBatches);
    setBatches(newBatches);
  };

  const updateBatch = async (id: string, updates: Partial<ClaimBatch>) => {
    const updated = batches.map((b) => (b.id === id ? { ...b, ...updates } : b));
    await saveBatches(updated);
    setBatches(updated);
  };

  const deleteBatch = async (id: string) => {
    const updatedTransactions = transactions.map((tx) =>
      tx.batchId === id ? { ...tx, batchId: undefined } : tx
    );
    await saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);

    const filtered = batches.filter((b) => b.id !== id);
    await saveBatches(filtered);
    setBatches(filtered);
  };

  const assignToBatch = async (transactionIds: string[], batchId: string) => {
    const updated = transactions.map((tx) =>
      transactionIds.includes(tx.id) ? { ...tx, batchId } : tx
    );
    await saveTransactions(updated);
    setTransactions(updated);
  };

  const removeFromBatch = async (transactionIds: string[]) => {
    const updated = transactions.map((tx) =>
      transactionIds.includes(tx.id) ? { ...tx, batchId: undefined } : tx
    );
    await saveTransactions(updated);
    setTransactions(updated);
  };

  // Alias functions
  const addAlias = async (alias: MerchantAlias) => {
    const newAliases = [...aliases, alias];
    await saveAliases(newAliases);
    setAliases(newAliases);
  };

  const updateAlias = async (id: string, updates: Partial<MerchantAlias>) => {
    const updated = aliases.map((a) => (a.id === id ? { ...a, ...updates } : a));
    await saveAliases(updated);
    setAliases(updated);
  };

  const deleteAlias = async (id: string) => {
    const filtered = aliases.filter((a) => a.id !== id);
    await saveAliases(filtered);
    setAliases(filtered);
  };

  const applyMerchantNormalization = async (): Promise<number> => {
    let count = 0;
    const updated = transactions.map((tx) => {
      const lowerMerchant = tx.merchant.toLowerCase().trim();
      
      for (const alias of aliases) {
        for (const variant of alias.variants) {
          if (lowerMerchant.includes(variant.toLowerCase())) {
            if (tx.merchant !== alias.normalizedName) {
              count++;
              return { ...tx, merchant: alias.normalizedName };
            }
            break;
          }
        }
      }
      return tx;
    });

    if (count > 0) {
      await saveTransactions(updated);
      setTransactions(updated);
    }

    return count;
  };

  // Goal functions
  const addGoal = async (goal: Goal) => {
    const newGoals = [...goals, goal];
    await saveGoals(newGoals);
    setGoals(newGoals);
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const updated = goals.map((g) => (g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g));
    await saveGoals(updated);
    setGoals(updated);
  };

  const deleteGoal = async (id: string) => {
    const filtered = goals.filter((g) => g.id !== id);
    await saveGoals(filtered);
    setGoals(filtered);
  };

  // Bucket functions
  const addBucket = async (bucket: Bucket) => {
    const newBuckets = [...buckets, bucket];
    await saveBuckets(newBuckets);
    setBuckets(newBuckets);
  };

  const updateBucketFn = async (id: string, updates: Partial<Bucket>) => {
    const updated = buckets.map((b) => (b.id === id ? { ...b, ...updates } : b));
    await saveBuckets(updated);
    setBuckets(updated);
  };

  const deleteBucketFn = async (id: string) => {
    const filtered = buckets.filter((b) => b.id !== id);
    await saveBuckets(filtered);
    setBuckets(filtered);
  };

  // Category rule functions
  const addCategoryRule = async (rule: CategoryRule) => {
    const newRules = [...categoryRules, rule];
    await saveCategoryRules(newRules);
    setCategoryRules(newRules);
  };

  const updateCategoryRule = async (id: string, updates: Partial<CategoryRule>) => {
    const updated = categoryRules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    await saveCategoryRules(updated);
    setCategoryRules(updated);
  };

  const deleteCategoryRule = async (id: string) => {
    const filtered = categoryRules.filter((r) => r.id !== id);
    await saveCategoryRules(filtered);
    setCategoryRules(filtered);
  };

  // Recurring functions
  const addRecurring = async (item: RecurringTransaction) => {
    const newRecurring = [...recurring, item];
    await saveRecurring(newRecurring);
    setRecurringState(newRecurring);
  };

  const updateRecurring = async (id: string, updates: Partial<RecurringTransaction>) => {
    const updated = recurring.map((r) => (r.id === id ? { ...r, ...updates } : r));
    await saveRecurring(updated);
    setRecurringState(updated);
  };

  const deleteRecurring = async (id: string) => {
    const filtered = recurring.filter((r) => r.id !== id);
    await saveRecurring(filtered);
    setRecurringState(filtered);
  };

  const setRecurring = async (items: RecurringTransaction[]) => {
    await saveRecurring(items);
    setRecurringState(items);
  };

  // Income config
  const setIncomeConfig = async (config: IncomeConfig) => {
    await saveIncomeConfig(config);
    setIncomeConfigState(config);
  };

  // Card safety
  const setCardSafety = async (data: CardSafetyData) => {
    await saveCardSafety(data);
    setCardSafetyState(data);
  };

  // Profile functions
  const setProfile = async (newProfile: UserProfile) => {
    await saveProfile(newProfile);
    setProfileState(newProfile);
  };

  // Account functions
  const addAccount = async (account: Account) => {
    const newAccounts = await addAccountToStorage(account);
    setAccounts(newAccounts);
    // Auto-select if it's the first account
    if (newAccounts.length === 1) {
      setSelectedAccountId(account.id);
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    const updated = await updateAccountInStorage(id, updates);
    setAccounts(updated);
  };

  const deleteAccount = async (id: string) => {
    const updated = await deleteAccountFromStorage(id);
    setAccounts(updated);
    // Clear selection if deleted account was selected
    if (selectedAccountId === id) {
      const remaining = updated.filter(a => a.isActive);
      setSelectedAccountId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const setSelectedAccount = (accountId: string | null) => {
    setSelectedAccountId(accountId);
  };

  // Budget functions
  const addBudget = async (budget: Budget) => {
    const newBudgets = await addBudgetToStorage(budget);
    setBudgets(newBudgets);
  };

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    const updated = await updateBudgetInStorage(id, updates);
    setBudgets(updated);
  };

  const deleteBudget = async (id: string) => {
    const updated = await deleteBudgetFromStorage(id);
    setBudgets(updated);
  };

  // License functions
  const setLicense = async (newLicense: License | null) => {
    if (newLicense) {
      await saveLicense(newLicense.key, newLicense.tier, newLicense.email);
    } else {
      await clearLicense();
    }
    setLicenseState(newLicense);
  };

  const verifyLicense = async (key: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: key }),
      });
      const data = await response.json();
      
      if (data.valid) {
        const newLicense: License = {
          key,
          tier: data.tier || "paid",
          validatedAt: new Date().toISOString(),
          email: data.purchase?.email,
        };
        await setLicense(newLicense);
        return { valid: true };
      } else {
        return { valid: false, error: data.error || "Invalid license key" };
      }
    } catch {
      return { valid: false, error: "Failed to verify license" };
    }
  };

  const removeLicense = async () => {
    await clearLicense();
    setLicenseState(null);
  };

  return (
    <AppContext.Provider
      value={{
        transactions,
        rules,
        batches,
        aliases,
        goals,
        buckets,
        categoryRules,
        recurring,
        incomeConfig,
        cardSafety,
        license,
        profile,
        accounts,
        selectedAccountId,
        budgets,
        isLoading,
        tier,
        hasAccess,
        setLicense,
        verifyLicense,
        removeLicense,
        addTransactions,
        updateTransaction,
        updateTransactions,
        deleteTransaction,
        deleteAllTransactions,
        deleteAllData: deleteAllDataHandler,
        splitTransaction,
        addRule,
        updateRule,
        deleteRule,
        addBatch,
        updateBatch,
        deleteBatch,
        assignToBatch,
        removeFromBatch,
        addAlias,
        updateAlias,
        deleteAlias,
        applyMerchantNormalization,
        addGoal,
        updateGoal,
        deleteGoal,
        addBucket,
        updateBucket: updateBucketFn,
        deleteBucket: deleteBucketFn,
        addCategoryRule,
        updateCategoryRule,
        deleteCategoryRule,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        setRecurring,
        setIncomeConfig,
        setCardSafety,
        setProfile,
        addAccount,
        updateAccount,
        deleteAccount,
        setSelectedAccount,
        addBudget,
        updateBudget,
        deleteBudget,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
