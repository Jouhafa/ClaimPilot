"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/context";
import { v4 as uuidv4 } from "uuid";
import type { ReimbursementStatus, ClaimBatch, Transaction } from "@/lib/types";

export function ReimbursementsTab() {
  const { 
    transactions, 
    updateTransaction, 
    isLoading, 
    batches, 
    addBatch, 
    updateBatch, 
    deleteBatch,
    assignToBatch 
  } = useApp();
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [selectedForBatch, setSelectedForBatch] = useState<Set<string>>(new Set());

  const reimbursables = useMemo(() => {
    return transactions
      .filter((tx) => tx.tag === "reimbursable")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const unbatchedReimbursables = useMemo(() => {
    return reimbursables.filter((tx) => !tx.batchId);
  }, [reimbursables]);

  const stats = useMemo(() => {
    const draft = reimbursables.filter((tx) => tx.status === "draft" || !tx.status);
    const submitted = reimbursables.filter((tx) => tx.status === "submitted");
    const paid = reimbursables.filter((tx) => tx.status === "paid");

    return {
      draft: {
        count: draft.length,
        total: draft.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      },
      submitted: {
        count: submitted.length,
        total: submitted.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      },
      paid: {
        count: paid.length,
        total: paid.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      },
    };
  }, [reimbursables]);

  // Float dashboard calculations
  const floatStats = useMemo(() => {
    const outstanding = reimbursables.filter((tx) => tx.status !== "paid");
    const totalFloated = outstanding.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    // Calculate oldest pending
    const oldestDate = outstanding.length > 0 
      ? outstanding.reduce((oldest, tx) => {
          const txDate = new Date(tx.date);
          return txDate < oldest.date ? { date: txDate, tx } : oldest;
        }, { date: new Date(outstanding[0].date), tx: outstanding[0] })
      : null;
    
    const daysOld = oldestDate 
      ? Math.floor((Date.now() - oldestDate.date.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      totalFloated,
      outstandingCount: outstanding.length,
      oldestDays: daysOld,
      oldestMerchant: oldestDate?.tx.merchant || "-",
    };
  }, [reimbursables]);

  const handleStatusChange = async (id: string, status: ReimbursementStatus) => {
    await updateTransaction(id, { status });
  };

  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) return;
    
    const batch: ClaimBatch = {
      id: uuidv4(),
      name: newBatchName.trim(),
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    
    await addBatch(batch);
    
    // Assign selected transactions to this batch
    if (selectedForBatch.size > 0) {
      await assignToBatch(Array.from(selectedForBatch), batch.id);
      setSelectedForBatch(new Set());
    }
    
    setNewBatchName("");
    setShowCreateBatch(false);
  };

  const handleBatchStatusChange = async (batchId: string, status: ReimbursementStatus) => {
    await updateBatch(batchId, { 
      status,
      submittedAt: status === "submitted" ? new Date().toISOString() : undefined,
      paidAt: status === "paid" ? new Date().toISOString() : undefined,
    });
    
    // Also update all transactions in the batch
    const batchTxs = reimbursables.filter((tx) => tx.batchId === batchId);
    for (const tx of batchTxs) {
      await updateTransaction(tx.id, { status });
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (confirm("Delete this batch? Transactions will be kept but unbatched.")) {
      await deleteBatch(batchId);
    }
  };

  const toggleSelectForBatch = (id: string) => {
    const newSet = new Set(selectedForBatch);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedForBatch(newSet);
  };

  const getBatchTransactions = (batchId: string): Transaction[] => {
    return reimbursables.filter((tx) => tx.batchId === batchId);
  };

  const getBatchTotal = (batchId: string): number => {
    return getBatchTransactions(batchId).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  };

  const getStatusBadge = (status: ReimbursementStatus | undefined) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Submitted</Badge>;
      case "paid":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Paid</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Draft</Badge>;
    }
  };

  const getAgingColor = (days: number) => {
    if (days < 7) return "text-green-500";
    if (days < 14) return "text-yellow-500";
    return "text-red-500";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reimbursements</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage your reimbursement claims
        </p>
      </div>

      {/* Float Dashboard - Money You're Floating */}
      {reimbursables.length > 0 && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Money You&apos;re Floating
            </CardTitle>
            <CardDescription>Outstanding reimbursements your company owes you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-card border">
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-3xl font-bold text-primary">
                  {floatStats.totalFloated.toFixed(0)} <span className="text-lg font-normal">AED</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{floatStats.outstandingCount} items pending</p>
              </div>
              <div className="p-4 rounded-lg bg-card border">
                <p className="text-sm text-muted-foreground">Oldest Pending</p>
                <p className={`text-3xl font-bold ${getAgingColor(floatStats.oldestDays)}`}>
                  {floatStats.oldestDays} <span className="text-lg font-normal">days</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate" title={floatStats.oldestMerchant}>
                  {floatStats.oldestMerchant}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card border">
                <p className="text-sm text-muted-foreground">Submitted (Waiting)</p>
                <p className="text-3xl font-bold text-blue-500">
                  {stats.submitted.total.toFixed(0)} <span className="text-lg font-normal">AED</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stats.submitted.count} items submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {stats.draft.total.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">AED</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-muted-foreground">{stats.draft.count}</span>
                <p className="text-xs text-muted-foreground">items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold text-blue-500">
                  {stats.submitted.total.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">AED</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-muted-foreground">{stats.submitted.count}</span>
                <p className="text-xs text-muted-foreground">items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-500">
                  {stats.paid.total.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">AED</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-muted-foreground">{stats.paid.count}</span>
                <p className="text-xs text-muted-foreground">items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Claim Batches */}
      {batches.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Claim Batches</CardTitle>
                <CardDescription>Group expenses by trip, month, or project</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowCreateBatch(true)}>
                + New Batch
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {batches.map((batch) => {
                const batchTxs = getBatchTransactions(batch.id);
                const batchTotal = getBatchTotal(batch.id);
                
                return (
                  <div key={batch.id} className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{batch.name}</h4>
                        {getStatusBadge(batch.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={batch.status}
                          onChange={(e) => handleBatchStatusChange(batch.id, e.target.value as ReimbursementStatus)}
                          className="text-sm bg-transparent border rounded px-2 py-1"
                        >
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="paid">Paid</option>
                        </select>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBatch(batch.id)}>
                          <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {batchTxs.length} items
                      </span>
                      <span className="font-mono font-semibold">
                        {batchTotal.toFixed(2)} AED
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Batch Modal */}
      {showCreateBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Create Claim Batch</CardTitle>
              <CardDescription>Group expenses for easier tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Batch Name</label>
                <Input
                  placeholder="e.g., Dubai Trip Dec 2025"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  autoFocus
                />
              </div>
              {unbatchedReimbursables.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Add transactions ({selectedForBatch.size} selected)
                  </label>
                  <div className="max-h-48 overflow-auto border rounded-lg">
                    {unbatchedReimbursables.map((tx) => (
                      <div
                        key={tx.id}
                        className={`flex items-center gap-3 p-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 ${
                          selectedForBatch.has(tx.id) ? "bg-primary/10" : ""
                        }`}
                        onClick={() => toggleSelectForBatch(tx.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedForBatch.has(tx.id)}
                          onChange={() => {}}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tx.merchant}</p>
                          <p className="text-xs text-muted-foreground">{tx.date}</p>
                        </div>
                        <span className="text-sm font-mono">{Math.abs(tx.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowCreateBatch(false);
                  setNewBatchName("");
                  setSelectedForBatch(new Set());
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBatch} disabled={!newBatchName.trim()}>
                  Create Batch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Unbatched Transactions */}
      {reimbursables.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No reimbursable transactions</h3>
            <p className="text-muted-foreground text-sm">
              Tag transactions as &quot;Reimbursable&quot; in the Transactions tab to see them here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {unbatchedReimbursables.length > 0 ? "Unbatched Transactions" : "All Transactions"}
                </CardTitle>
                <CardDescription>
                  {unbatchedReimbursables.length > 0 
                    ? `${unbatchedReimbursables.length} items not in any batch`
                    : "Track each claim from draft to paid"
                  }
                </CardDescription>
              </div>
              {unbatchedReimbursables.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowCreateBatch(true)}>
                  Create Batch
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Merchant</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Age</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(unbatchedReimbursables.length > 0 ? unbatchedReimbursables : reimbursables).map((item) => {
                    const daysOld = Math.floor((Date.now() - new Date(item.date).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{item.date}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{item.merchant}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {item.description.substring(0, 40)}...
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          {Math.abs(item.amount).toFixed(2)} {item.currency}
                        </td>
                        <td className={`px-4 py-3 text-sm text-center ${getAgingColor(daysOld)}`}>
                          {daysOld}d
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <select
                            value={item.status || "draft"}
                            onChange={(e) => handleStatusChange(item.id, e.target.value as ReimbursementStatus)}
                            className="text-sm bg-transparent border rounded px-2 py-1"
                          >
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="paid">Paid</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
