"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { CATEGORY_LABELS, type TransactionCategory } from "@/lib/types";

// Category detection based on merchant names
function detectCategory(merchant: string, description: string): TransactionCategory {
  const text = `${merchant} ${description}`.toLowerCase();
  
  if (text.match(/uber|careem|taxi|lyft|grab|bolt/i)) return "transport";
  if (text.match(/hotel|marriott|hilton|hyatt|airbnb|booking/i)) return "accommodation";
  if (text.match(/restaurant|cafe|coffee|starbucks|food|meal|dining|deliveroo|talabat|zomato/i)) return "meals";
  if (text.match(/flight|airline|emirates|etihad|qatar|travel|airport/i)) return "travel";
  if (text.match(/zoom|microsoft|google|adobe|slack|notion|figma|github|aws|netflix|spotify/i)) return "software";
  if (text.match(/phone|mobile|du\b|etisalat|airtel|vodafone/i)) return "communication";
  if (text.match(/office|staples|ikea|supplies/i)) return "office";
  
  return "other";
}

export function AnalyticsDashboard() {
  const { transactions } = useApp();

  // Filter to reimbursable transactions (excluding splits' parents)
  const reimbursables = useMemo(() => {
    return transactions.filter((tx) => 
      tx.tag === "reimbursable" && !tx.isSplit
    );
  }, [transactions]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const stats = new Map<TransactionCategory, { count: number; total: number }>();
    
    reimbursables.forEach((tx) => {
      const category = tx.category || detectCategory(tx.merchant, tx.description);
      const existing = stats.get(category) || { count: 0, total: 0 };
      stats.set(category, {
        count: existing.count + 1,
        total: existing.total + Math.abs(tx.amount),
      });
    });

    return Array.from(stats.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [reimbursables]);

  // Monthly breakdown
  const monthlyStats = useMemo(() => {
    const stats = new Map<string, { count: number; total: number }>();
    
    reimbursables.forEach((tx) => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = stats.get(monthKey) || { count: 0, total: 0 };
      stats.set(monthKey, {
        count: existing.count + 1,
        total: existing.total + Math.abs(tx.amount),
      });
    });

    return Array.from(stats.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6); // Last 6 months
  }, [reimbursables]);

  // Top merchants
  const topMerchants = useMemo(() => {
    const stats = new Map<string, { count: number; total: number }>();
    
    reimbursables.forEach((tx) => {
      const existing = stats.get(tx.merchant) || { count: 0, total: 0 };
      stats.set(tx.merchant, {
        count: existing.count + 1,
        total: existing.total + Math.abs(tx.amount),
      });
    });

    return Array.from(stats.entries())
      .map(([merchant, data]) => ({ merchant, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [reimbursables]);

  // Total stats
  const totals = useMemo(() => {
    const total = reimbursables.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const avgTransaction = reimbursables.length > 0 ? total / reimbursables.length : 0;
    
    return { total, count: reimbursables.length, avg: avgTransaction };
  }, [reimbursables]);

  // Category colors
  const getCategoryColor = (category: TransactionCategory): string => {
    const colors: Record<TransactionCategory, string> = {
      travel: "bg-blue-500",
      meals: "bg-orange-500",
      transport: "bg-green-500",
      accommodation: "bg-purple-500",
      software: "bg-cyan-500",
      office: "bg-yellow-500",
      communication: "bg-pink-500",
      other: "bg-gray-500",
    };
    return colors[category];
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  if (reimbursables.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No reimbursable data yet</h3>
          <p className="text-muted-foreground text-sm">
            Tag transactions as &quot;Reimbursable&quot; to see analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Reimbursable</p>
            <p className="text-3xl font-bold">{totals.total.toFixed(0)} <span className="text-lg font-normal text-muted-foreground">AED</span></p>
            <p className="text-xs text-muted-foreground mt-1">{totals.count} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Average Transaction</p>
            <p className="text-3xl font-bold">{totals.avg.toFixed(0)} <span className="text-lg font-normal text-muted-foreground">AED</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Categories</p>
            <p className="text-3xl font-bold">{categoryStats.length}</p>
            <p className="text-xs text-muted-foreground mt-1">spending categories</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending by Category</CardTitle>
            <CardDescription>Where your reimbursable expenses go</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryStats.map(({ category, count, total }) => {
                const percentage = (total / totals.total) * 100;
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`} />
                        <span className="text-sm font-medium">{CATEGORY_LABELS[category]}</span>
                        <Badge variant="outline" className="text-xs">{count}</Badge>
                      </div>
                      <span className="text-sm font-mono">{total.toFixed(0)} AED</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getCategoryColor(category)} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Trends</CardTitle>
            <CardDescription>Reimbursable spending over time</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            ) : (
              <div className="space-y-3">
                {monthlyStats.map(({ month, count, total }) => {
                  const maxTotal = Math.max(...monthlyStats.map((m) => m.total));
                  const percentage = (total / maxTotal) * 100;
                  return (
                    <div key={month}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{formatMonth(month)}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{count} txns</Badge>
                          <span className="text-sm font-mono">{total.toFixed(0)} AED</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Merchants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Merchants</CardTitle>
          <CardDescription>Your most frequent reimbursable vendors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topMerchants.map(({ merchant, count, total }, index) => (
              <div 
                key={merchant}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{merchant}</p>
                    <p className="text-xs text-muted-foreground">{count} transactions</p>
                  </div>
                </div>
                <span className="text-sm font-mono font-semibold">{total.toFixed(0)} AED</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

