"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/context";
import { CATEGORY_CONFIG, type TransactionCategory } from "@/lib/types";
import { 
  getCategoryBreakdown, 
  getFixedVsVariable, 
  getMonthOverMonthComparison, 
  getCashflowSummary,
  getTopMerchants 
} from "@/lib/categories";
import { AnomaliesPanel } from "./AnomaliesPanel";
import { SpendingSummaryExport } from "./SpendingSummaryExport";
import { SmartSuggestions } from "./SmartSuggestions";
import { MonthlyNarrative } from "./MonthlyNarrative";
import { MonthComparisonView } from "./MonthComparisonView";

interface AnalyticsDashboardProps {
  onNavigate?: (tab: string) => void;
  selectedMonth?: Date;
  showComparison?: boolean;
}

export function AnalyticsDashboard({ onNavigate, selectedMonth, showComparison = false }: AnalyticsDashboardProps = {}) {
  const { transactions, incomeConfig, setIncomeConfig } = useApp();
  const [showIncomeInput, setShowIncomeInput] = useState(false);
  const [incomeValue, setIncomeValue] = useState(incomeConfig?.monthlyIncome?.toString() || "");
  const [showSummaryExport, setShowSummaryExport] = useState(false);
  const [activeView, setActiveView] = useState<"overview" | "comparison">(showComparison ? "comparison" : "overview");
  
  const monthToUse = selectedMonth || new Date();

  // Filter to expenses only (excluding split parents)
  const expenses = useMemo(() => {
    return transactions.filter((tx) => tx.amount < 0 && !tx.isSplit);
  }, [transactions]);

  // Get all analytics data
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(transactions), [transactions]);
  const fixedVsVariable = useMemo(() => getFixedVsVariable(transactions), [transactions]);
  const monthComparison = useMemo(() => getMonthOverMonthComparison(transactions, monthToUse), [transactions, monthToUse]);
  const cashflow = useMemo(() => getCashflowSummary(transactions), [transactions]);
  const topMerchants = useMemo(() => getTopMerchants(transactions, 10), [transactions]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalSpend = expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalIncome = transactions
      .filter(tx => tx.amount > 0 && !tx.parentId)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    return {
      totalSpend,
      totalIncome: incomeConfig?.monthlyIncome || totalIncome,
      count: expenses.length,
      avgTransaction: expenses.length > 0 ? totalSpend / expenses.length : 0,
    };
  }, [expenses, transactions, incomeConfig]);

  // Savings rate
  const savingsRate = useMemo(() => {
    if (totals.totalIncome <= 0) return 0;
    return ((totals.totalIncome - totals.totalSpend) / totals.totalIncome) * 100;
  }, [totals]);

  const handleSaveIncome = async () => {
    const value = parseFloat(incomeValue);
    if (!isNaN(value) && value > 0) {
      await setIncomeConfig({
        monthlyIncome: value,
        currency: "AED",
        lastUpdated: new Date().toISOString(),
      });
      setShowIncomeInput(false);
    }
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No data yet</h3>
          <p className="text-muted-foreground text-sm">
            Import transactions to see your spending insights
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show comparison view if requested
  if (activeView === "comparison" || showComparison) {
    return <MonthComparisonView selectedMonth={monthToUse} />;
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView("overview")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeView === "overview"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView("comparison")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeView === "comparison"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Month Comparison
          </button>
        </div>
      </div>

      {/* Export Button + Coach Chip */}
      <div className="flex justify-between items-center">
        {onNavigate && (
          <button
            onClick={() => onNavigate("playbook")}
            className="text-xs px-2 py-1 rounded-md border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Coach
          </button>
        )}
        <Button variant="outline" onClick={() => setShowSummaryExport(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Summary (Free)
        </Button>
      </div>

      {/* Anomalies Alert */}
      <AnomaliesPanel />

      {/* Smart Suggestions */}
      <SmartSuggestions />

      {/* Monthly Narrative */}
      <MonthlyNarrative />

      {/* Cashflow Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Monthly Income</p>
            {showIncomeInput ? (
              <div className="space-y-2 mt-2">
                <Input
                  type="number"
                  placeholder="Monthly salary"
                  value={incomeValue}
                  onChange={(e) => setIncomeValue(e.target.value)}
                  className="h-8"
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleSaveIncome}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setShowIncomeInput(false);
                    // Reset to original value if canceling
                    setIncomeValue(incomeConfig?.monthlyIncome?.toString() || "");
                  }}>Cancel</Button>
                </div>
              </div>
            ) : incomeConfig ? (
              <>
                <p className="text-2xl font-bold text-green-500">
                  {incomeConfig.monthlyIncome.toLocaleString()} <span className="text-sm font-normal">AED</span>
                </p>
                <button 
                  className="text-xs text-muted-foreground hover:text-primary mt-1"
                  onClick={() => {
                    setIncomeValue(incomeConfig.monthlyIncome.toString());
                    setShowIncomeInput(true);
                  }}
                >
                  Edit
                </button>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <button 
                  className="text-xs text-primary hover:underline mt-1"
                  onClick={() => setShowIncomeInput(true)}
                >
                  + Add income
                </button>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Spending</p>
            <p className="text-2xl font-bold text-red-500">
              {totals.totalSpend.toLocaleString()} <span className="text-sm font-normal">AED</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{totals.count} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Net Cashflow</p>
            <p className={`text-2xl font-bold ${cashflow.netCashflow >= 0 ? "text-green-500" : "text-red-500"}`}>
              {cashflow.netCashflow >= 0 ? "+" : ""}{cashflow.netCashflow.toLocaleString()} <span className="text-sm font-normal">AED</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Income - Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Savings Rate</p>
            <p className={`text-2xl font-bold ${savingsRate >= 20 ? "text-green-500" : savingsRate >= 0 ? "text-yellow-500" : "text-red-500"}`}>
              {savingsRate.toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {savingsRate >= 20 ? "Great!" : savingsRate >= 10 ? "Good" : "Needs work"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fixed vs Variable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fixed vs Variable Spending</CardTitle>
          <CardDescription>Recurring bills vs discretionary spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-blue-500 font-medium">Fixed</p>
              <p className="text-2xl font-bold">{fixedVsVariable.fixed.total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{fixedVsVariable.fixed.count} transactions</p>
              <p className="text-xs text-blue-500 mt-1">Rent, utilities, subscriptions</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <p className="text-sm text-orange-500 font-medium">Variable</p>
              <p className="text-2xl font-bold">{fixedVsVariable.variable.total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{fixedVsVariable.variable.count} transactions</p>
              <p className="text-xs text-orange-500 mt-1">Dining, shopping, transport</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm text-green-500 font-medium">Income</p>
              <p className="text-2xl font-bold">{fixedVsVariable.income.total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{fixedVsVariable.income.count} transactions</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/30">
              <p className="text-sm text-gray-500 font-medium">Transfers</p>
              <p className="text-2xl font-bold">{fixedVsVariable.transfer.total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{fixedVsVariable.transfer.count} transactions</p>
            </div>
          </div>
          
          {/* Visual breakdown bar */}
          <div className="mt-6">
            <div className="h-4 rounded-full overflow-hidden flex">
              <div 
                className="bg-blue-500 transition-all"
                style={{ 
                  width: `${(fixedVsVariable.fixed.total / totals.totalSpend) * 100}%` 
                }}
              />
              <div 
                className="bg-orange-500 transition-all"
                style={{ 
                  width: `${(fixedVsVariable.variable.total / totals.totalSpend) * 100}%` 
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Fixed: {((fixedVsVariable.fixed.total / totals.totalSpend) * 100).toFixed(0)}%</span>
              <span>Variable: {((fixedVsVariable.variable.total / totals.totalSpend) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending by Category</CardTitle>
            <CardDescription>Where your money goes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryBreakdown.slice(0, 8).map(({ category, label, color, total, count, percentage }) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-medium">{label}</span>
                      <Badge variant="outline" className="text-xs">{count}</Badge>
                    </div>
                    <span className="text-sm font-mono">{total.toFixed(0)} AED</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Month-over-Month Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Month-over-Month Changes</CardTitle>
            <CardDescription>Spending changes vs last month</CardDescription>
          </CardHeader>
          <CardContent>
            {monthComparison.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Need more data for comparison</p>
            ) : (
              <div className="space-y-3">
                {monthComparison.slice(0, 6).map(({ category, label, currentMonth, previousMonth, change, changePercentage }) => (
                  <div key={category} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CATEGORY_CONFIG[category]?.color || "#6b7280" }}
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono">{currentMonth.toFixed(0)} AED</span>
                      <Badge 
                        variant={change > 0 ? "destructive" : change < 0 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {change > 0 ? "+" : ""}{changePercentage.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Merchants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Merchants</CardTitle>
          <CardDescription>Where you spend the most</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topMerchants.map(({ merchant, category, total, count, averageAmount }, index) => (
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
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: CATEGORY_CONFIG[category]?.color,
                          color: CATEGORY_CONFIG[category]?.color 
                        }}
                      >
                        {CATEGORY_CONFIG[category]?.label || category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{count} txns</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-semibold">{total.toFixed(0)} AED</span>
                  <p className="text-xs text-muted-foreground">~{averageAmount.toFixed(0)}/txn</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Spending Summary Export Modal */}
      <SpendingSummaryExport 
        isOpen={showSummaryExport} 
        onClose={() => setShowSummaryExport(false)} 
      />
    </div>
  );
}
