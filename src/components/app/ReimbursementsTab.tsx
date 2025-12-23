"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import type { ReimbursementStatus } from "@/lib/types";

export function ReimbursementsTab() {
  const { transactions, updateTransaction, isLoading } = useApp();

  const reimbursables = useMemo(() => {
    return transactions
      .filter((tx) => tx.tag === "reimbursable")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

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

  const handleStatusChange = async (id: string, status: ReimbursementStatus) => {
    await updateTransaction(id, { status });
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

      {/* Pipeline */}
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
                <CardTitle className="text-lg">Reimbursement Pipeline</CardTitle>
                <CardDescription>
                  Track each claim from draft to paid
                </CardDescription>
              </div>
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
                    <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reimbursables.map((item) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
