// Storage adapter that switches between IndexedDB and Supabase
// Uses Supabase when user is authenticated, falls back to IndexedDB otherwise

import * as indexedDBStorage from "./storage";
import * as supabaseStorage from "./db/storage";
import type {
  Transaction,
  Rule,
  Goal,
  Bucket,
  ClaimBatch,
  MerchantAlias,
  CategoryRule,
  RecurringTransaction,
  IncomeConfig,
  Account,
  Budget,
  CardSafetyData,
  WrapSnapshot,
} from "./types";
import type { UserProfile } from "./appState";

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  if (typeof window === "undefined") return false;
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// Get storage functions based on authentication state
export function getStorageAdapter(userId: string | null | undefined) {
  const useSupabase = isSupabaseConfigured() && userId;

  if (useSupabase && userId) {
    // Return Supabase storage functions with userId bound
    return {
      // Transactions
      loadTransactions: () => supabaseStorage.loadTransactions(userId),
      saveTransactions: (data: Transaction[]) => supabaseStorage.saveTransactions(userId, data),
      addTransactions: (data: Transaction[]) => supabaseStorage.addTransactions(userId, data),
      updateTransaction: (id: string, updates: Partial<Transaction>) =>
        supabaseStorage.updateTransaction(userId, id, updates),
      deleteTransaction: (id: string) => supabaseStorage.deleteTransaction(userId, id),
      clearAllTransactions: () => supabaseStorage.clearAllTransactions(userId),
      
      // Rules
      loadRules: () => supabaseStorage.loadRules(userId),
      saveRules: (data: Rule[]) => supabaseStorage.saveRules(userId, data),
      
      // Goals
      loadGoals: () => supabaseStorage.loadGoals(userId),
      saveGoals: (data: Goal[]) => supabaseStorage.saveGoals(userId, data),
      
      // Buckets
      loadBuckets: () => supabaseStorage.loadBuckets(userId),
      saveBuckets: (data: Bucket[]) => supabaseStorage.saveBuckets(userId, data),
      
      // Batches
      loadBatches: () => supabaseStorage.loadBatches(userId),
      saveBatches: (data: ClaimBatch[]) => supabaseStorage.saveBatches(userId, data),
      
      // Aliases
      loadAliases: () => supabaseStorage.loadAliases(userId),
      saveAliases: (data: MerchantAlias[]) => supabaseStorage.saveAliases(userId, data),
      
      // Category Rules
      loadCategoryRules: () => supabaseStorage.loadCategoryRules(userId),
      saveCategoryRules: (data: CategoryRule[]) => supabaseStorage.saveCategoryRules(userId, data),
      
      // Recurring
      loadRecurring: () => supabaseStorage.loadRecurring(userId),
      saveRecurring: (data: RecurringTransaction[]) => supabaseStorage.saveRecurring(userId, data),
      
      // Income Config
      loadIncomeConfig: () => supabaseStorage.loadIncomeConfig(userId),
      saveIncomeConfig: (data: IncomeConfig) => supabaseStorage.saveIncomeConfig(userId, data),
      
      // Profile
      loadProfile: () => supabaseStorage.loadProfile(userId),
      saveProfile: (data: UserProfile) => supabaseStorage.saveProfile(userId, data),
      
      // Card Safety
      loadCardSafety: () => supabaseStorage.loadCardSafety(userId),
      saveCardSafety: (data: CardSafetyData) => supabaseStorage.saveCardSafety(userId, data),
      
      // Accounts
      loadAccounts: () => supabaseStorage.loadAccounts(userId),
      saveAccounts: (data: Account[]) => supabaseStorage.saveAccounts(userId, data),
      
      // Budgets
      loadBudgets: () => supabaseStorage.loadBudgets(userId),
      saveBudgets: (data: Budget[]) => supabaseStorage.saveBudgets(userId, data),
      
      // Delete all data
      deleteAllData: () => supabaseStorage.deleteAllData(userId),
      
      // License (still uses IndexedDB - not in Supabase schema)
      loadLicense: indexedDBStorage.loadLicense,
      saveLicense: indexedDBStorage.saveLicense,
      clearLicense: indexedDBStorage.clearLicense,
    };
  } else {
    // Return IndexedDB storage functions (no userId needed)
    return {
      // Transactions
      loadTransactions: indexedDBStorage.loadTransactions,
      saveTransactions: indexedDBStorage.saveTransactions,
      addTransactions: indexedDBStorage.addTransactions,
      updateTransaction: indexedDBStorage.updateTransaction,
      deleteTransaction: indexedDBStorage.deleteTransaction,
      clearAllTransactions: indexedDBStorage.clearAllTransactions,
      
      // Rules
      loadRules: indexedDBStorage.loadRules,
      saveRules: indexedDBStorage.saveRules,
      
      // Goals
      loadGoals: indexedDBStorage.loadGoals,
      saveGoals: indexedDBStorage.saveGoals,
      
      // Buckets
      loadBuckets: indexedDBStorage.loadBuckets,
      saveBuckets: indexedDBStorage.saveBuckets,
      
      // Batches
      loadBatches: indexedDBStorage.loadBatches,
      saveBatches: indexedDBStorage.saveBatches,
      
      // Aliases
      loadAliases: indexedDBStorage.loadAliases,
      saveAliases: indexedDBStorage.saveAliases,
      
      // Category Rules
      loadCategoryRules: indexedDBStorage.loadCategoryRules,
      saveCategoryRules: indexedDBStorage.saveCategoryRules,
      
      // Recurring
      loadRecurring: indexedDBStorage.loadRecurring,
      saveRecurring: indexedDBStorage.saveRecurring,
      
      // Income Config
      loadIncomeConfig: indexedDBStorage.loadIncomeConfig,
      saveIncomeConfig: indexedDBStorage.saveIncomeConfig,
      
      // Profile
      loadProfile: indexedDBStorage.loadProfile,
      saveProfile: indexedDBStorage.saveProfile,
      
      // Card Safety
      loadCardSafety: indexedDBStorage.loadCardSafety,
      saveCardSafety: indexedDBStorage.saveCardSafety,
      
      // Accounts
      loadAccounts: indexedDBStorage.loadAccounts,
      saveAccounts: indexedDBStorage.saveAccounts,
      
      // Budgets
      loadBudgets: indexedDBStorage.loadBudgets,
      saveBudgets: indexedDBStorage.saveBudgets,
      
      // Delete all data
      deleteAllData: indexedDBStorage.deleteAllData,
      
      // License
      loadLicense: indexedDBStorage.loadLicense,
      saveLicense: indexedDBStorage.saveLicense,
      clearLicense: indexedDBStorage.clearLicense,
    };
  }
}
