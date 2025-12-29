"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { RulesManager } from "./RulesManager";
import { SplitTransactionModal } from "./SplitTransactionModal";
import { DuplicateDetector } from "./DuplicateDetector";
import { MerchantManager } from "./MerchantManager";
import { ManualTransactionTab } from "./ManualTransactionTab";
import { PaginationControls } from "@/components/ui/pagination";
import { v4 as uuidv4 } from "uuid";
import { findDuplicates, calculateCurrencyTotals } from "@/lib/types";
import type { Transaction, TransactionTag } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TransactionsTab() {
  const { transactions, updateTransaction, deleteTransaction, isLoading, rules, addRule, splitTransaction } = useApp();
  const [activeView, setActiveView] = useState<"all" | "manual">("all");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<TransactionTag | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRulesManager, setShowRulesManager] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showMerchants, setShowMerchants] = useState(false);
  const [splitModalTx, setSplitModalTx] = useState<Transaction | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [editingMerchant, setEditingMerchant] = useState<string | null>(null);
  const [editMerchantValue, setEditMerchantValue] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{date?: string; amount?: string; description?: string}>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Responsive items per page: mobile (6), tablet (10), desktop (15)
  useEffect(() => {
    const updateItemsPerPage = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(6);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(10);
      } else {
        setItemsPerPage(15);
      }
    };
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  // Filter out split children from main view (they'll show under parent)
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Hide split children in main list
        if (tx.parentId) return false;
        
        // Search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const matches =
            tx.merchant.toLowerCase().includes(searchLower) ||
            tx.description.toLowerCase().includes(searchLower);
          if (!matches) return false;
        }
        // Tag filter
        if (tagFilter !== "all") {
          if (tagFilter === null && tx.tag !== null) return false;
          if (tagFilter !== null && tx.tag !== tagFilter) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, search, tagFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, tagFilter]);

  // Get split children for a transaction
  const getSplitChildren = (parentId: string) => {
    return transactions.filter((tx) => tx.parentId === parentId);
  };

  // Duplicate count
  const duplicateCount = useMemo(() => {
    return findDuplicates(transactions).size;
  }, [transactions]);

  // Multi-currency totals
  const currencyTotals = useMemo(() => {
    return calculateCurrencyTotals(transactions);
  }, [transactions]);

  const handleTagChange = async (id: string, tag: TransactionTag) => {
    const updates: Partial<Transaction> = { tag };
    if (tag === "reimbursable") {
      updates.status = "draft";
    } else {
      updates.status = undefined;
    }
    await updateTransaction(id, updates);
  };

  const handleBulkTag = async (tag: TransactionTag) => {
    for (const id of selectedIds) {
      await handleTagChange(id, tag);
    }
    setSelectedIds(new Set());
  };

  const handleCreateRuleFromSelection = async () => {
    if (selectedIds.size === 0) return;

    const firstId = Array.from(selectedIds)[0];
    const tx = transactions.find((t) => t.id === firstId);
    if (!tx) return;

    const keyword = tx.merchant.split(" ")[0];
    const promptKeyword = prompt(
      "Create a rule for transactions containing:",
      keyword
    );

    if (!promptKeyword) return;

    const tag = tx.tag || "reimbursable";
    await addRule({
      id: uuidv4(),
      contains: promptKeyword,
      tag: tag as Exclude<TransactionTag, null>,
      conditions: [],
      action: { tag: tag as Exclude<TransactionTag, null> },
    });

    alert(`Rule created: "${promptKeyword}" → ${tag}`);
  };

  const handleSplitTransaction = async (splits: { percentage: number; tag: TransactionTag }[]) => {
    if (!splitModalTx) return;
    await splitTransaction(splitModalTx.id, splits);
    setSplitModalTx(null);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((tx) => tx.id)));
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isInInput = document.activeElement?.tagName === "INPUT" || 
                      document.activeElement?.tagName === "SELECT" ||
                      document.activeElement?.tagName === "TEXTAREA";
    
    if (isInInput && !["ArrowUp", "ArrowDown", "Escape"].includes(e.key)) {
      return;
    }

    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, filteredTransactions.length - 1));
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === " " && focusedIndex >= 0) {
      e.preventDefault();
      const tx = filteredTransactions[focusedIndex];
      if (tx) toggleSelect(tx.id);
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      if (selectedIds.size > 0) {
        handleBulkTag("reimbursable");
      } else if (focusedIndex >= 0) {
        const tx = filteredTransactions[focusedIndex];
        if (tx) handleTagChange(tx.id, "reimbursable");
      }
    } else if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (selectedIds.size > 0) {
        handleBulkTag("personal");
      } else if (focusedIndex >= 0) {
        const tx = filteredTransactions[focusedIndex];
        if (tx) handleTagChange(tx.id, "personal");
      }
    } else if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      if (selectedIds.size > 0) {
        handleBulkTag("ignore");
      } else if (focusedIndex >= 0) {
        const tx = filteredTransactions[focusedIndex];
        if (tx) handleTagChange(tx.id, "ignore");
      }
    } else if (e.key === "/" && !isInInput) {
      e.preventDefault();
      searchRef.current?.focus();
    } else if (e.key === "Escape") {
      setSelectedIds(new Set());
      setFocusedIndex(-1);
      setEditingMerchant(null);
      (document.activeElement as HTMLElement)?.blur();
    }
  }, [filteredTransactions, focusedIndex, selectedIds, handleBulkTag, handleTagChange]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (focusedIndex >= 0 && tableRef.current) {
      const row = tableRef.current.querySelector(`[data-row-index="${focusedIndex}"]`);
      row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedIndex]);

  const startEditingMerchant = (tx: Transaction) => {
    setEditingMerchant(tx.id);
    setEditMerchantValue(tx.merchant);
  };

  const saveEditedMerchant = async () => {
    if (editingMerchant && editMerchantValue.trim()) {
      await updateTransaction(editingMerchant, { merchant: editMerchantValue.trim() });
    }
    setEditingMerchant(null);
    setEditMerchantValue("");
  };

  // Start editing a transaction
  const startEditing = (tx: Transaction) => {
    setEditingTransaction(tx.id);
    setEditValues({
      date: tx.date,
      amount: Math.abs(tx.amount).toString(),
      description: tx.description,
    });
  };

  // Save edited transaction
  const saveEditedTransaction = async () => {
    if (!editingTransaction) return;
    
    const tx = transactions.find(t => t.id === editingTransaction);
    if (!tx) return;

    const updates: Partial<Transaction> = {};
    
    if (editValues.date && editValues.date !== tx.date) {
      updates.date = editValues.date;
    }
    if (editValues.amount) {
      const newAmount = parseFloat(editValues.amount);
      if (!isNaN(newAmount)) {
        // Preserve the sign (expense = negative)
        updates.amount = tx.amount < 0 ? -Math.abs(newAmount) : Math.abs(newAmount);
      }
    }
    if (editValues.description !== undefined && editValues.description !== tx.description) {
      updates.description = editValues.description;
    }

    if (Object.keys(updates).length > 0) {
      await updateTransaction(editingTransaction, updates);
    }
    
    setEditingTransaction(null);
    setEditValues({});
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingTransaction(null);
    setEditValues({});
  };

  // Delete transaction with confirmation
  const handleDeleteTransaction = async (id: string) => {
    if (deleteConfirm === id) {
      await deleteTransaction(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(prev => prev === id ? null : prev), 3000);
    }
  };

  const getTagBadge = (tag: TransactionTag) => {
    switch (tag) {
      case "reimbursable":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Reimbursable</Badge>;
      case "personal":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Personal</Badge>;
      case "ignore":
        return <Badge className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20">Ignore</Badge>;
      default:
        return <Badge variant="outline">Untagged</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-2">
            View, search, and tag all imported transactions
          </p>
        </div>
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
            <p className="text-muted-foreground text-sm">
              Import a statement to see your transactions here
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If manual transactions view, show that component
  if (activeView === "manual") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground mt-2">
              Manage all your transactions
            </p>
          </div>
        </div>
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveView("all")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            All Transactions
          </button>
          <button
            onClick={() => setActiveView("manual")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              "border-primary text-primary"
            )}
          >
            Manual Transactions
          </button>
        </div>
        <ManualTransactionTab />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-2">
            View, search, and tag all imported transactions
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-2 border rounded-lg p-1">
            <button
              onClick={() => setActiveView("all")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded transition-colors",
                "bg-primary text-primary-foreground"
              )}
            >
              All
            </button>
            <button
              onClick={() => setActiveView("manual")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              Manual
            </button>
          </div>
          <Button variant="outline" onClick={() => setShowMerchants(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Merchants
          </Button>
          {duplicateCount > 0 && (
            <Button variant="outline" onClick={() => setShowDuplicates(true)} className="text-yellow-500 border-yellow-500/30">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {duplicateCount} Duplicates
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowRulesManager(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Rules ({rules.length})
          </Button>
        </div>
      </div>

      {/* Multi-Currency Totals */}
      {currencyTotals.size > 1 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium">Reimbursable Totals:</span>
              {Array.from(currencyTotals.entries()).map(([currency, total]) => (
                <Badge key={currency} variant="outline" className="text-sm">
                  {total.toFixed(2)} {currency}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="px-2 py-1 rounded bg-muted">
          <kbd className="font-mono">R</kbd> Reimbursable
        </span>
        <span className="px-2 py-1 rounded bg-muted">
          <kbd className="font-mono">P</kbd> Personal
        </span>
        <span className="px-2 py-1 rounded bg-muted">
          <kbd className="font-mono">I</kbd> Ignore
        </span>
        <span className="px-2 py-1 rounded bg-muted">
          <kbd className="font-mono">↑↓</kbd> Navigate
        </span>
        <span className="px-2 py-1 rounded bg-muted">
          <kbd className="font-mono">Space</kbd> Select
        </span>
        <span className="px-2 py-1 rounded bg-muted">
          <kbd className="font-mono">/</kbd> Search
        </span>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                ref={searchRef}
                placeholder="Search merchants, descriptions... (press / to focus)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={tagFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTagFilter("all")}
              >
                All ({transactions.filter((t) => !t.parentId).length})
              </Button>
              <Button
                variant={tagFilter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setTagFilter(null)}
              >
                Untagged ({transactions.filter((t) => !t.tag && !t.parentId).length})
              </Button>
              <Button
                variant={tagFilter === "reimbursable" ? "default" : "outline"}
                size="sm"
                onClick={() => setTagFilter("reimbursable")}
              >
                Reimbursable ({transactions.filter((t) => t.tag === "reimbursable" && !t.parentId).length})
              </Button>
              <Button
                variant={tagFilter === "personal" ? "default" : "outline"}
                size="sm"
                onClick={() => setTagFilter("personal")}
              >
                Personal ({transactions.filter((t) => t.tag === "personal" && !t.parentId).length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => handleBulkTag("reimbursable")}>
                  <kbd className="mr-1 text-xs opacity-50">R</kbd> Reimbursable
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkTag("personal")}>
                  <kbd className="mr-1 text-xs opacity-50">P</kbd> Personal
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkTag("ignore")}>
                  <kbd className="mr-1 text-xs opacity-50">I</kbd> Ignore
                </Button>
                <Button size="sm" variant="outline" onClick={handleCreateRuleFromSelection}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Create Rule
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">All Transactions</CardTitle>
              <CardDescription>
                {filteredTransactions.length} of {transactions.filter((t) => !t.parentId).length} transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={tableRef} className="rounded-lg border overflow-x-auto table-container -mx-2 md:mx-0">
            <table className="w-full md:min-w-[1000px] table-auto md:table-fixed">
              <colgroup>
                <col style={{ width: '48px' }} />
                <col style={{ width: '112px' }} />
                <col style={{ width: '300px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '260px' }} />
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 md:px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                      onChange={selectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-2 md:px-3 py-3 text-left text-xs md:text-sm font-medium">Date</th>
                  <th className="px-2 md:px-3 py-3 text-left text-xs md:text-sm font-medium">Merchant</th>
                  <th className="px-2 md:px-3 py-3 text-right text-xs md:text-sm font-medium">Amount</th>
                  <th className="px-2 md:px-3 py-3 text-center text-xs md:text-sm font-medium">Tag</th>
                  <th className="px-2 md:px-3 py-3 text-right text-xs md:text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((tx, index) => {
                  const actualIndex = startIndex + index;
                  const splitChildren = getSplitChildren(tx.id);
                  const hasSplits = splitChildren.length > 0;
                  
                  return (
                    <React.Fragment key={tx.id}>
                      <tr 
                        data-row-index={actualIndex}
                        className={`border-b last:border-0 transition-colors cursor-pointer ${
                          focusedIndex === actualIndex 
                            ? "bg-primary/10 ring-1 ring-primary/30" 
                            : selectedIds.has(tx.id)
                            ? "bg-muted/50"
                            : "hover:bg-muted/30"
                        } ${hasSplits ? "bg-muted/20" : ""}`}
                        onClick={() => setFocusedIndex(actualIndex)}
                      >
                        <td className="px-2 md:px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(tx.id)}
                            onChange={() => toggleSelect(tx.id)}
                            className="rounded"
                            disabled={hasSplits}
                          />
                        </td>
                        <td className="px-2 md:px-3 py-3 text-xs md:text-sm text-muted-foreground whitespace-nowrap">
                          {editingTransaction === tx.id ? (
                            <Input
                              type="date"
                              value={editValues.date || tx.date}
                              onChange={(e) => setEditValues(prev => ({ ...prev, date: e.target.value }))}
                              className="h-7 text-sm w-28"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            tx.date
                          )}
                        </td>
                        <td className="px-2 md:px-3 py-3 overflow-hidden max-w-[200px] md:max-w-[300px]">
                          {editingTransaction === tx.id ? (
                            <div className="space-y-1">
                              <Input
                                value={editingMerchant === tx.id ? editMerchantValue : tx.merchant}
                                onChange={(e) => {
                                  setEditingMerchant(tx.id);
                                  setEditMerchantValue(e.target.value);
                                }}
                                className="h-7 text-sm"
                                placeholder="Merchant"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Input
                                value={editValues.description ?? tx.description}
                                onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                                className="h-7 text-sm"
                                placeholder="Description"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          ) : editingMerchant === tx.id ? (
                            <Input
                              value={editMerchantValue}
                              onChange={(e) => setEditMerchantValue(e.target.value)}
                              onBlur={saveEditedMerchant}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditedMerchant();
                                if (e.key === "Escape") setEditingMerchant(null);
                              }}
                              autoFocus
                              className="h-7 text-sm"
                            />
                          ) : (
                            <div 
                              className="cursor-pointer group min-w-0"
                              onDoubleClick={() => startEditingMerchant(tx)}
                              title="Double-click to edit"
                            >
                              <div className="text-xs md:text-sm font-medium group-hover:text-primary transition-colors flex items-center gap-2 min-w-0">
                                <span className="break-words line-clamp-1">{tx.merchant}</span>
                                {hasSplits && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0">Split</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground break-words line-clamp-1" title={tx.description}>
                                {tx.description}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className={`px-2 md:px-3 py-3 text-xs md:text-sm text-right font-mono whitespace-nowrap ${tx.amount >= 0 ? "text-green-500" : "text-foreground"} ${hasSplits ? "line-through text-muted-foreground" : ""}`}>
                          {editingTransaction === tx.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValues.amount || Math.abs(tx.amount).toString()}
                              onChange={(e) => setEditValues(prev => ({ ...prev, amount: e.target.value }))}
                              className="h-7 text-sm w-24 text-right"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>{formatAmount(tx.amount)} {tx.currency}</>
                          )}
                        </td>
                        <td className="px-2 md:px-3 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            {hasSplits ? (
                              <Badge variant="outline" className="text-xs">See splits</Badge>
                            ) : (
                              getTagBadge(tx.tag)
                            )}
                          </div>
                        </td>
                        <td className="px-2 md:px-3 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 flex-shrink-0">
                            {editingTransaction === tx.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveEditedTransaction();
                                  }}
                                  title="Save changes"
                                  className="text-green-500 hover:text-green-600"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelEditing();
                                  }}
                                  title="Cancel"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </Button>
                              </>
                            ) : (
                              <>
                                {!hasSplits && !tx.isSplit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSplitModalTx(tx);
                                    }}
                                    title="Split transaction"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(tx);
                                  }}
                                  title="Edit transaction"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTransaction(tx.id);
                                  }}
                                  title={deleteConfirm === tx.id ? "Click again to confirm delete" : "Delete transaction"}
                                  className={deleteConfirm === tx.id ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive"}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                                {!hasSplits && (
                                  <select
                                    value={tx.tag || ""}
                                    onChange={(e) => handleTagChange(tx.id, (e.target.value || null) as TransactionTag)}
                                    className="text-xs bg-transparent border rounded px-1.5 py-0.5 h-7 min-w-0 max-w-[100px]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="">Untagged</option>
                                    <option value="reimbursable">Reimbursable</option>
                                    <option value="personal">Personal</option>
                                    <option value="ignore">Ignore</option>
                                  </select>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Split children rows */}
                      {splitChildren.map((child) => (
                        <tr 
                          key={child.id}
                          className="border-b last:border-0 bg-muted/10 hover:bg-muted/20"
                        >
                          <td className="px-4 py-2 pl-8">
                            <span className="text-muted-foreground">↳</span>
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">{child.date}</td>
                          <td className="px-4 py-2">
                            <div className="text-sm text-muted-foreground">
                              {child.splitPercentage}% split
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            {formatAmount(child.amount)} {child.currency}
                          </td>
                          <td className="px-4 py-2 text-center">{getTagBadge(child.tag)}</td>
                          <td className="px-4 py-2 text-right">
                            <select
                              value={child.tag || ""}
                              onChange={(e) => handleTagChange(child.id, (e.target.value || null) as TransactionTag)}
                              className="text-sm bg-transparent border rounded px-2 py-1"
                            >
                              <option value="">Untagged</option>
                              <option value="reimbursable">Reimbursable</option>
                              <option value="personal">Personal</option>
                              <option value="ignore">Ignore</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length > itemsPerPage && (
            <div className="mt-4 pt-4 border-t">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredTransactions.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <RulesManager isOpen={showRulesManager} onClose={() => setShowRulesManager(false)} />
      <DuplicateDetector isOpen={showDuplicates} onClose={() => setShowDuplicates(false)} />
      <MerchantManager isOpen={showMerchants} onClose={() => setShowMerchants(false)} />
      {splitModalTx && (
        <SplitTransactionModal
          transaction={splitModalTx}
          onSplit={handleSplitTransaction}
          onClose={() => setSplitModalTx(null)}
        />
      )}
    </div>
  );
}
