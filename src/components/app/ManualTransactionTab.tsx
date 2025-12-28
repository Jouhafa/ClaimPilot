"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, TransactionCategory, TransactionStatus } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";
import { reconcilePendingTransactions, mergeTransaction } from "@/lib/reconciliation";

export function ManualTransactionTab() {
  const { transactions, accounts, selectedAccountId, profile, addTransactions, updateTransaction } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split("T")[0],
    merchant: "",
    description: "",
    amount: 0,
    currency: profile?.currency || "AED",
    category: undefined,
    tag: null,
    note: "",
    transactionStatus: "pending" as TransactionStatus,
    isManual: true,
    accountId: selectedAccountId || undefined,
  });

  const currency = profile?.currency || "AED";

  // Get pending transactions
  const pendingTransactions = useMemo(() => {
    return transactions.filter(
      (tx) => tx.transactionStatus === "pending" || (tx.isManual && !tx.transactionStatus)
    );
  }, [transactions]);

  // Get confirmed transactions (for reconciliation check)
  const confirmedTransactions = useMemo(() => {
    return transactions.filter(
      (tx) => tx.transactionStatus === "confirmed" || (!tx.isManual && !tx.transactionStatus)
    );
  }, [transactions]);

  // Reconcile pending with confirmed
  const reconciliation = useMemo(() => {
    return reconcilePendingTransactions(pendingTransactions, confirmedTransactions);
  }, [pendingTransactions, confirmedTransactions]);

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      merchant: "",
      description: "",
      amount: 0,
      currency: currency,
      category: undefined,
      tag: null,
      note: "",
      transactionStatus: "pending" as TransactionStatus,
      isManual: true,
      accountId: selectedAccountId || undefined,
    });
  };

  const handleSave = async () => {
    if (!formData.merchant?.trim() || !formData.amount || formData.amount === 0) {
      alert("Please enter a merchant name and amount");
      return;
    }

    const transaction: Transaction = {
      id: uuidv4(),
      date: formData.date || new Date().toISOString().split("T")[0],
      merchant: formData.merchant.trim(),
      description: formData.description?.trim() || formData.merchant.trim(),
      amount: formData.amount || 0,
      currency: formData.currency || currency,
      category: formData.category,
      tag: formData.tag || null,
      note: formData.note?.trim(),
      transactionStatus: "pending" as TransactionStatus,
      isManual: true,
      accountId: formData.accountId,
      kind: formData.amount > 0 ? "income" : "spend",
      createdAt: new Date().toISOString(),
    };

    await addTransactions([transaction]);
    setIsAdding(false);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      merchant: "",
      description: "",
      amount: 0,
      currency: currency,
      category: undefined,
      tag: null,
      note: "",
      transactionStatus: "pending" as TransactionStatus,
      isManual: true,
      accountId: selectedAccountId || undefined,
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      merchant: "",
      description: "",
      amount: 0,
      currency: currency,
      category: undefined,
      tag: null,
      note: "",
      transactionStatus: "pending" as TransactionStatus,
      isManual: true,
      accountId: selectedAccountId || undefined,
    });
  };

  const handleMarkConfirmed = async (id: string) => {
    await updateTransaction(id, { transactionStatus: "confirmed" });
  };

  const handleReconcile = async () => {
    if (reconciliation.matched.length === 0) {
      alert("No pending transactions matched with imported transactions");
      return;
    }

    if (
      !confirm(
        `Found ${reconciliation.matched.length} matching transaction(s). This will merge pending transactions with imported ones. Continue?`
      )
    ) {
      return;
    }

    for (const { pending, imported } of reconciliation.matched) {
      const merged = mergeTransaction(pending, imported);
      // Update the imported transaction with merged data
      await updateTransaction(imported.id, merged);
      // Delete the pending transaction
      await updateTransaction(pending.id, { transactionStatus: "confirmed", isManual: false });
    }

    alert(`Reconciled ${reconciliation.matched.length} transaction(s)`);
  };

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingTransactions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Waiting for statement import
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ready to Reconcile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{reconciliation.matched.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Matched with imported transactions
            </p>
            {reconciliation.matched.length > 0 && (
              <Button
                size="sm"
                className="mt-2 w-full"
                onClick={handleReconcile}
              >
                Reconcile Now
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{reconciliation.alerts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pending for 30+ days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Add Manual Transaction</CardTitle>
            <CardDescription>
              Add a transaction that hasn't appeared on your statement yet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Date *</label>
                <Input
                  type="date"
                  value={formData.date || ""}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Account</label>
                <select
                  value={formData.accountId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, accountId: e.target.value || undefined })
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">No account</option>
                  {accounts
                    .filter((a) => a.isActive)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Merchant *</label>
                <Input
                  value={formData.merchant || ""}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  placeholder="e.g., Starbucks"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Amount *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use negative for expenses, positive for income
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select
                  value={formData.category || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: (e.target.value || undefined) as TransactionCategory | undefined,
                    })
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">No category</option>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tag</label>
                <select
                  value={formData.tag || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tag: (e.target.value || null) as Transaction["tag"],
                    })
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">None</option>
                  <option value="reimbursable">Reimbursable</option>
                  <option value="personal">Personal</option>
                  <option value="ignore">Ignore</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Input
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">Note</label>
                <Input
                  value={formData.note || ""}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Optional note"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>Add Transaction</Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Transactions List */}
      <div className="space-y-4">
        {!isAdding && (
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Pending Transactions</h2>
            <Button onClick={handleAdd}>+ Add Transaction</Button>
          </div>
        )}

        {pendingTransactions.length === 0 && !isAdding ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No pending transactions</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add transactions manually to track them before they appear on your statement
              </p>
              <Button onClick={handleAdd}>Add Transaction</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingTransactions.map((tx) => {
              const isMatched = reconciliation.matched.some((m) => m.pending.id === tx.id);
              const alert = reconciliation.alerts.find((a) => a.pending.id === tx.id);
              const daysSince = Math.floor(
                (new Date().getTime() - new Date(tx.date).getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <Card
                  key={tx.id}
                  className={cn(
                    "relative transition-all",
                    isMatched && "border-green-500 bg-green-50/50 dark:bg-green-950/20",
                    alert && "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{tx.merchant}</h3>
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                          {isMatched && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              Matched
                            </Badge>
                          )}
                          {alert && (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                              {alert.reason}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {new Date(tx.date).toLocaleDateString()} • {daysSince} day{daysSince !== 1 ? "s" : ""} ago
                        </p>
                        {tx.description && (
                          <p className="text-sm text-muted-foreground">{tx.description}</p>
                        )}
                        {tx.category && (
                          <div className="flex items-center gap-2 mt-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: CATEGORY_CONFIG[tx.category]?.color || "#6b7280",
                              }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {CATEGORY_CONFIG[tx.category]?.label}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-lg font-bold",
                            tx.amount < 0 ? "text-red-600" : "text-green-600"
                          )}
                        >
                          {tx.currency} {Math.abs(tx.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkConfirmed(tx.id)}
                          >
                            Mark Confirmed
                          </Button>
                        </div>
                      </div>
                    </div>
                    {tx.note && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                        <span className="text-muted-foreground">Note: </span>
                        {tx.note}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

