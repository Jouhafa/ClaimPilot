"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Transaction, Rule, ClaimBatch } from "./types";
import {
  loadTransactions,
  saveTransactions,
  addTransactions as addTransactionsToStorage,
  updateTransaction as updateTransactionInStorage,
  clearAllTransactions,
  loadRules,
  saveRules,
  loadBatches,
  saveBatches,
} from "./storage";

interface AppContextType {
  transactions: Transaction[];
  rules: Rule[];
  batches: ClaimBatch[];
  isLoading: boolean;
  addTransactions: (newTransactions: Transaction[]) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  updateTransactions: (ids: string[], updates: Partial<Transaction>) => Promise<void>;
  deleteAllTransactions: () => Promise<void>;
  addRule: (rule: Rule) => Promise<void>;
  updateRule: (id: string, updates: Partial<Rule>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  addBatch: (batch: ClaimBatch) => Promise<void>;
  updateBatch: (id: string, updates: Partial<ClaimBatch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  assignToBatch: (transactionIds: string[], batchId: string) => Promise<void>;
  removeFromBatch: (transactionIds: string[]) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [batches, setBatches] = useState<ClaimBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedTransactions, loadedRules, loadedBatches] = await Promise.all([
        loadTransactions(),
        loadRules(),
        loadBatches(),
      ]);
      setTransactions(loadedTransactions);
      setRules(loadedRules);
      setBatches(loadedBatches);
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

  const deleteAllTransactions = async () => {
    await clearAllTransactions();
    setTransactions([]);
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

  return (
    <AppContext.Provider
      value={{
        transactions,
        rules,
        batches,
        isLoading,
        addTransactions,
        updateTransaction,
        updateTransactions,
        deleteAllTransactions,
        addRule,
        updateRule,
        deleteRule,
        addBatch,
        updateBatch,
        deleteBatch,
        assignToBatch,
        removeFromBatch,
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
