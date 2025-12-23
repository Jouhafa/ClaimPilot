"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, Rule, ClaimBatch, MerchantAlias } from "./types";
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
} from "./storage";

interface AppContextType {
  transactions: Transaction[];
  rules: Rule[];
  batches: ClaimBatch[];
  aliases: MerchantAlias[];
  isLoading: boolean;
  addTransactions: (newTransactions: Transaction[]) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  updateTransactions: (ids: string[], updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteAllTransactions: () => Promise<void>;
  splitTransaction: (id: string, splits: { percentage: number; tag: Transaction["tag"] }[]) => Promise<void>;
  addRule: (rule: Rule) => Promise<void>;
  updateRule: (id: string, updates: Partial<Rule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  addBatch: (batch: ClaimBatch) => Promise<void>;
  updateBatch: (id: string, updates: Partial<ClaimBatch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  assignToBatch: (transactionIds: string[], batchId: string) => Promise<void>;
  removeFromBatch: (transactionIds: string[]) => Promise<void>;
  addAlias: (alias: MerchantAlias) => Promise<void>;
  updateAlias: (id: string, updates: Partial<MerchantAlias>) => Promise<void>;
  deleteAlias: (id: string) => Promise<void>;
  applyMerchantNormalization: () => Promise<number>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [batches, setBatches] = useState<ClaimBatch[]>([]);
  const [aliases, setAliases] = useState<MerchantAlias[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedTransactions, loadedRules, loadedBatches, loadedAliases] = await Promise.all([
        loadTransactions(),
        loadRules(),
        loadBatches(),
        loadAliases(),
      ]);
      setTransactions(loadedTransactions);
      setRules(loadedRules);
      setBatches(loadedBatches);
      setAliases(loadedAliases);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

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

  // Split a transaction into multiple parts
  const splitTransaction = async (
    id: string, 
    splits: { percentage: number; tag: Transaction["tag"] }[]
  ) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    // Validate percentages sum to 100
    const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error("Split percentages must sum to 100");
    }

    // Mark original as split
    const updatedOriginal = { ...tx, isSplit: true };
    
    // Create split children
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
      createdAt: new Date().toISOString(),
    }));

    // Update storage
    const allTransactions = await loadTransactions();
    const updated = allTransactions.map((t) =>
      t.id === id ? updatedOriginal : t
    );
    const withSplits = [...updated, ...splitTransactions];
    await saveTransactions(withSplits);
    setTransactions(withSplits);
  };

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
    // Also remove batch reference from transactions
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

  // Apply merchant normalization to all transactions
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

  return (
    <AppContext.Provider
      value={{
        transactions,
        rules,
        batches,
        aliases,
        isLoading,
        addTransactions,
        updateTransaction,
        updateTransactions,
        deleteTransaction,
        deleteAllTransactions,
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
