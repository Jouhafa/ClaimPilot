"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Transaction, Rule } from "./types";
import {
  loadTransactions,
  saveTransactions,
  addTransactions as addTransactionsToStorage,
  updateTransaction as updateTransactionInStorage,
  clearAllTransactions,
  loadRules,
  saveRules,
} from "./storage";

interface AppContextType {
  transactions: Transaction[];
  rules: Rule[];
  isLoading: boolean;
  addTransactions: (newTransactions: Transaction[]) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteAllTransactions: () => Promise<void>;
  addRule: (rule: Rule) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedTransactions, loadedRules] = await Promise.all([
        loadTransactions(),
        loadRules(),
      ]);
      setTransactions(loadedTransactions);
      setRules(loadedRules);
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

  const deleteAllTransactions = async () => {
    await clearAllTransactions();
    setTransactions([]);
  };

  const addRule = async (rule: Rule) => {
    const newRules = [...rules, rule];
    await saveRules(newRules);
    setRules(newRules);
  };

  const deleteRule = async (id: string) => {
    const filtered = rules.filter((r) => r.id !== id);
    await saveRules(filtered);
    setRules(filtered);
  };

  return (
    <AppContext.Provider
      value={{
        transactions,
        rules,
        isLoading,
        addTransactions,
        updateTransaction,
        deleteAllTransactions,
        addRule,
        deleteRule,
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

