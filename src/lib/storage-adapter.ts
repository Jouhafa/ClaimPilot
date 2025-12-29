// Storage adapter that switches between IndexedDB and Supabase
// Uses Supabase when user is authenticated, falls back to IndexedDB otherwise

import { useSession } from "next-auth/react";
import * as indexedDBStorage from "./storage";
import * as supabaseStorage from "./db/storage";

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// Get storage functions based on authentication state
export function getStorageAdapter(userId: string | null | undefined) {
  const useSupabase = isSupabaseConfigured() && userId;

  if (useSupabase) {
    // Return Supabase storage functions with userId bound
    return {
      loadTransactions: () => supabaseStorage.loadTransactions(userId!),
      saveTransactions: (data: any) => supabaseStorage.saveTransactions(userId!, data),
      addTransactions: (data: any) => supabaseStorage.addTransactions(userId!, data),
      updateTransaction: (id: string, updates: any) =>
        supabaseStorage.updateTransaction(userId!, id, updates),
      deleteTransaction: (id: string) => supabaseStorage.deleteTransaction(userId!, id),
      clearAllTransactions: () => supabaseStorage.clearAllTransactions(userId!),
      loadRules: () => supabaseStorage.loadRules(userId!),
      saveRules: (data: any) => supabaseStorage.saveRules(userId!, data),
      loadGoals: () => supabaseStorage.loadGoals(userId!),
      saveGoals: (data: any) => supabaseStorage.saveGoals(userId!, data),
      loadBuckets: () => supabaseStorage.loadBuckets(userId!),
      saveBuckets: (data: any) => supabaseStorage.saveBuckets(userId!, data),
      loadBatches: () => supabaseStorage.loadBatches(userId!),
      saveBatches: (data: any) => supabaseStorage.saveBatches(userId!, data),
      loadAliases: () => supabaseStorage.loadAliases(userId!),
      saveAliases: (data: any) => supabaseStorage.saveAliases(userId!, data),
      // Add other functions as needed
    };
  } else {
    // Return IndexedDB storage functions (no userId needed)
    return {
      loadTransactions: indexedDBStorage.loadTransactions,
      saveTransactions: indexedDBStorage.saveTransactions,
      addTransactions: indexedDBStorage.addTransactions,
      updateTransaction: indexedDBStorage.updateTransaction,
      deleteTransaction: indexedDBStorage.deleteTransaction,
      clearAllTransactions: indexedDBStorage.clearAllTransactions,
      loadRules: indexedDBStorage.loadRules,
      saveRules: indexedDBStorage.saveRules,
      loadGoals: indexedDBStorage.loadGoals,
      saveGoals: indexedDBStorage.saveGoals,
      loadBuckets: indexedDBStorage.loadBuckets,
      saveBuckets: indexedDBStorage.saveBuckets,
      loadBatches: indexedDBStorage.loadBatches,
      saveBatches: indexedDBStorage.saveBatches,
      loadAliases: indexedDBStorage.loadAliases,
      saveAliases: indexedDBStorage.saveAliases,
      // Add other functions as needed
    };
  }
}

