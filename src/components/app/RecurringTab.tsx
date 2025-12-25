"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/context";
import { detectRecurringTransactions, getRecurringSummary, getUpcomingRecurring } from "@/lib/recurringDetector";
import { CATEGORY_CONFIG } from "@/lib/types";
import type { RecurringTransaction, TransactionCategory, Transaction } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export function RecurringTab() {
  const { transactions, recurring, setRecurring, updateRecurring, deleteRecurring, addRecurring } = useApp();
  const [isDetecting, setIsDetecting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkedTransactions, setShowLinkedTransactions] = useState<string | null>(null);

  // Auto-detect recurring on mount if empty
  useEffect(() => {
    if (transactions.length > 0 && recurring.length === 0) {
      handleDetectRecurring();
    }
  }, [transactions.length]);

  const handleDetectRecurring = async () => {
    setIsDetecting(true);
    try {
      const detected = detectRecurringTransactions(transactions);
      await setRecurring(detected);
    } finally {
      setIsDetecting(false);
    }
  };

  const summary = useMemo(() => getRecurringSummary(recurring), [recurring]);
  const upcoming = useMemo(() => getUpcomingRecurring(recurring, 30), [recurring]);

  const handleToggleActive = async (item: RecurringTransaction) => {
    await updateRecurring(item.id, { isActive: !item.isActive });
  };

  const handleConfirm = async (item: RecurringTransaction) => {
    await updateRecurring(item.id, { isUserConfirmed: true });
  };

  const handleDelete = async (id: string) => {
    await deleteRecurring(id);
  };

  const formatFrequency = (freq: string) => {
    switch (freq) {
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      case "quarterly": return "Quarterly";
      case "yearly": return "Yearly";
      default: return freq;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AE", {
      day: "numeric",
      month: "short",
    });
  };

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring & Subscriptions</h1>
          <p className="text-muted-foreground mt-2">
            Track your recurring bills and subscriptions
          </p>
        </div>
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
            <p className="text-muted-foreground text-sm">
              Import your statement to detect recurring payments
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring & Subscriptions</h1>
          <p className="text-muted-foreground mt-2">
            Track your recurring bills and subscriptions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Subscription
          </Button>
          <Button onClick={handleDetectRecurring} disabled={isDetecting}>
            {isDetecting ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Detecting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-detect
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Monthly Total</p>
            <p className="text-2xl font-bold">{summary.totalMonthly.toLocaleString("en-US", { maximumFractionDigits: 0 })} AED</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.activeCount} active subscriptions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Yearly Projection</p>
            <p className="text-2xl font-bold">{summary.totalYearly.toLocaleString("en-US", { maximumFractionDigits: 0 })} AED</p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on current recurring
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Coming Up (30 days)</p>
            <p className="text-2xl font-bold">{upcoming.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Expected charges
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payments */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Payments</CardTitle>
            <CardDescription>Expected recurring charges in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcoming.slice(0, 5).map(({ item, daysUntil }) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: CATEGORY_CONFIG[item.category]?.color || "#6b7280" }}
                    >
                      {item.normalizedMerchant.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{item.normalizedMerchant}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFrequency(item.frequency)} • {CATEGORY_CONFIG[item.category]?.label}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold">{item.averageAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })} AED</p>
                    <p className={`text-xs ${daysUntil <= 7 ? "text-yellow-500 font-medium" : "text-muted-foreground"}`}>
                      {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Recurring */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">All Recurring Payments</CardTitle>
              <CardDescription>{recurring.length} detected patterns</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recurring.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recurring patterns detected yet.</p>
              <p className="text-sm mt-1">Click "Re-detect" to scan your transactions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recurring.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    item.isActive ? "bg-card" : "bg-muted/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: CATEGORY_CONFIG[item.category]?.color || "#6b7280" }}
                    >
                      {item.normalizedMerchant.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.normalizedMerchant}</p>
                        {item.isUserConfirmed && (
                          <Badge variant="outline" className="text-xs">Confirmed</Badge>
                        )}
                        {!item.isActive && (
                          <Badge variant="secondary" className="text-xs">Paused</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFrequency(item.frequency)} • {item.occurrences} occurrences • Last: {formatDate(item.lastOccurrence)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono font-semibold">{item.averageAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })} AED</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_CONFIG[item.category]?.label}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLinkedTransactions(item.id)}
                        title="View transactions"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Button>
                      {!item.isUserConfirmed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConfirm(item)}
                          title="Confirm this is recurring"
                        >
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(item)}
                        title={item.isActive ? "Pause" : "Resume"}
                      >
                        {item.isActive ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                      >
                        <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {summary.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Category</CardTitle>
            <CardDescription>Monthly recurring spend by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.byCategory.map(({ category, monthly, count }) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CATEGORY_CONFIG[category]?.color || "#6b7280" }}
                    />
                    <span className="text-sm">{CATEGORY_CONFIG[category]?.label || category}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                  <span className="font-mono text-sm">{monthly.toLocaleString("en-US", { maximumFractionDigits: 0 })} AED/mo</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Subscription Modal */}
      {showAddModal && (
        <AddSubscriptionModal 
          transactions={transactions}
          onAdd={addRecurring}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Linked Transactions Modal */}
      {showLinkedTransactions && (
        <LinkedTransactionsModal
          subscription={recurring.find(r => r.id === showLinkedTransactions)!}
          transactions={transactions}
          onClose={() => setShowLinkedTransactions(null)}
        />
      )}
    </div>
  );
}

// Add Subscription Modal Component
function AddSubscriptionModal({
  transactions,
  onAdd,
  onClose,
}: {
  transactions: Transaction[];
  onAdd: (item: RecurringTransaction) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [category, setCategory] = useState<TransactionCategory>("subscriptions");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  // Search for matching transactions
  const matchingTransactions = useMemo(() => {
    if (!searchTerm && !name) return [];
    const term = (searchTerm || name).toLowerCase();
    return transactions
      .filter(tx => 
        tx.amount < 0 && 
        !tx.parentId &&
        (tx.merchant.toLowerCase().includes(term) || 
         tx.description.toLowerCase().includes(term))
      )
      .slice(0, 10);
  }, [transactions, searchTerm, name]);

  // Auto-fill from selected transactions
  useEffect(() => {
    if (selectedTransactions.length > 0) {
      const selected = transactions.filter(tx => selectedTransactions.includes(tx.id));
      const avgAmount = selected.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / selected.length;
      if (!amount) setAmount(avgAmount.toFixed(2));
      if (!name && selected.length > 0) setName(selected[0].merchant);
    }
  }, [selectedTransactions, transactions, amount, name]);

  const handleSubmit = async () => {
    if (!name || !amount) return;

    const nextDate = new Date();
    switch (frequency) {
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    const newSubscription: RecurringTransaction = {
      id: uuidv4(),
      merchantPattern: name.toLowerCase(),
      normalizedMerchant: name,
      category,
      averageAmount: parseFloat(amount),
      frequency,
      lastOccurrence: new Date().toISOString().split("T")[0],
      nextExpected: nextDate.toISOString().split("T")[0],
      occurrences: selectedTransactions.length || 1,
      transactionIds: selectedTransactions,
      isActive: true,
      isUserConfirmed: true,
    };

    await onAdd(newSubscription);
    onClose();
  };

  const toggleTransaction = (id: string) => {
    setSelectedTransactions(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Add Subscription</CardTitle>
          <CardDescription>Manually add a recurring payment and link transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Subscription Name</Label>
            <Input
              id="name"
              placeholder="e.g., Netflix, Spotify"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (AED)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TransactionCategory)}
              className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm"
            >
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Link Transactions */}
          <div className="space-y-2">
            <Label>Link Transactions (optional)</Label>
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {matchingTransactions.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {matchingTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer ${
                      selectedTransactions.includes(tx.id) ? "bg-primary/10" : ""
                    }`}
                    onClick={() => toggleTransaction(tx.id)}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(tx.id)}
                        onChange={() => {}}
                        className="rounded"
                      />
                      <div>
                        <p className="text-sm font-medium">{tx.merchant}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm">{Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} AED</span>
                  </div>
                ))}
              </div>
            )}
            {selectedTransactions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedTransactions.length} transaction(s) selected
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!name || !amount}>
              Add Subscription
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Linked Transactions Modal
function LinkedTransactionsModal({
  subscription,
  transactions,
  onClose,
}: {
  subscription: RecurringTransaction;
  transactions: Transaction[];
  onClose: () => void;
}) {
  const linkedTransactions = useMemo(() => {
    return transactions.filter(tx => 
      subscription.transactionIds.includes(tx.id) ||
      tx.merchant.toLowerCase().includes(subscription.merchantPattern.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [subscription, transactions]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{subscription.normalizedMerchant}</CardTitle>
              <CardDescription>{linkedTransactions.length} related transactions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {linkedTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="font-medium">{tx.merchant}</p>
                  <p className="text-sm text-muted-foreground">{tx.date}</p>
                </div>
                <span className="font-mono">{Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} AED</span>
              </div>
            ))}
            {linkedTransactions.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No linked transactions found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

