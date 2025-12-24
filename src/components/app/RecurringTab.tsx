"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { detectRecurringTransactions, getRecurringSummary, getUpcomingRecurring } from "@/lib/recurringDetector";
import { CATEGORY_CONFIG } from "@/lib/types";
import type { RecurringTransaction } from "@/lib/types";

export function RecurringTab() {
  const { transactions, recurring, setRecurring, updateRecurring, deleteRecurring } = useApp();
  const [isDetecting, setIsDetecting] = useState(false);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring & Subscriptions</h1>
          <p className="text-muted-foreground mt-2">
            Track your recurring bills and subscriptions
          </p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Monthly Total</p>
            <p className="text-2xl font-bold">{summary.totalMonthly.toFixed(0)} AED</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.activeCount} active subscriptions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Yearly Projection</p>
            <p className="text-2xl font-bold">{summary.totalYearly.toFixed(0)} AED</p>
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
                    <p className="font-mono font-semibold">{item.averageAmount.toFixed(0)} AED</p>
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
                      <p className="font-mono font-semibold">{item.averageAmount.toFixed(0)} AED</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_CONFIG[item.category]?.label}
                      </p>
                    </div>
                    <div className="flex gap-1">
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
                  <span className="font-mono text-sm">{monthly.toFixed(0)} AED/mo</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

