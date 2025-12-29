"use client";

import { useMemo, useState, useEffect } from "react";
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
import { AnimatedBarChart, AnimatedPieChart, AnimatedProgressBar, AnimatedCounter, ChartCard } from "./AnimatedChart";
import { motion, AnimatePresence } from "framer-motion";

type AnalyticsView = "overview" | "categories" | "trends" | "merchants" | "insights" | "comparison";

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
  const [activeView, setActiveView] = useState<AnalyticsView>(showComparison ? "comparison" : "overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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

  const views: Array<{ id: AnalyticsView; label: string; icon: React.ReactNode }> = [
    {
      id: "overview",
      label: "Overview",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: "categories",
      label: "Categories",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      id: "trends",
      label: "Trends",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: "merchants",
      label: "Merchants",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: "insights",
      label: "Insights",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      id: "comparison",
      label: "Comparison",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  const currentViewIndex = views.findIndex(v => v.id === activeView);
  const canGoPrev = currentViewIndex > 0;
  const canGoNext = currentViewIndex < views.length - 1;

  const handlePrevView = () => {
    if (canGoPrev) {
      setActiveView(views[currentViewIndex - 1].id);
    }
  };

  const handleNextView = () => {
    if (canGoNext) {
      setActiveView(views[currentViewIndex + 1].id);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" && canGoPrev) handlePrevView();
      if (e.key === "ArrowRight" && canGoNext) handleNextView();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentViewIndex, canGoPrev, canGoNext]);

  if (transactions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
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
      </div>
    );
  }

  const renderViewContent = () => {
    switch (activeView) {
      case "overview":
        return (
          <div className="h-full overflow-y-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Overview</h2>
                <p className="text-sm text-muted-foreground">Key financial metrics at a glance</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowSummaryExport(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </Button>
            </div>

            {/* Key Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-1">Monthly Income</p>
                  {showIncomeInput ? (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        placeholder="Monthly salary"
                        value={incomeValue}
                        onChange={(e) => setIncomeValue(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs" onClick={handleSaveIncome}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                          setShowIncomeInput(false);
                          setIncomeValue(incomeConfig?.monthlyIncome?.toString() || "");
                        }}>Cancel</Button>
                      </div>
                    </div>
                  ) : incomeConfig ? (
                    <>
                      <p className="text-xl font-bold text-green-500">
                        <AnimatedCounter value={incomeConfig.monthlyIncome} decimals={0} /> <span className="text-xs font-normal">AED</span>
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
                      <p className="text-xl font-bold text-muted-foreground">—</p>
                      <button 
                        className="text-xs text-primary hover:underline mt-1"
                        onClick={() => setShowIncomeInput(true)}
                      >
                        + Add
                      </button>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-1">Total Spending</p>
                  <p className="text-xl font-bold text-red-500">
                    <AnimatedCounter value={totals.totalSpend} decimals={0} /> <span className="text-xs font-normal">AED</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{totals.count} transactions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-1">Net Cashflow</p>
                  <p className={`text-xl font-bold ${cashflow.netCashflow >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {cashflow.netCashflow >= 0 ? "+" : ""}<AnimatedCounter value={Math.abs(cashflow.netCashflow)} decimals={0} /> <span className="text-xs font-normal">AED</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Income - Expenses</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-1">Savings Rate</p>
                  <p className={`text-xl font-bold ${savingsRate >= 20 ? "text-green-500" : savingsRate >= 0 ? "text-yellow-500" : "text-red-500"}`}>
                    <AnimatedCounter value={savingsRate} decimals={0} />%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {savingsRate >= 20 ? "Great!" : savingsRate >= 10 ? "Good" : "Needs work"}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Fixed vs Variable */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Fixed vs Variable</CardTitle>
                <CardDescription className="text-xs">Recurring bills vs discretionary spending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30"
                  >
                    <p className="text-xs text-blue-500 font-medium">Fixed</p>
                    <p className="text-lg font-bold"><AnimatedCounter value={fixedVsVariable.fixed.total} decimals={0} /></p>
                    <p className="text-xs text-muted-foreground">{fixedVsVariable.fixed.count} txns</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30"
                  >
                    <p className="text-xs text-orange-500 font-medium">Variable</p>
                    <p className="text-lg font-bold"><AnimatedCounter value={fixedVsVariable.variable.total} decimals={0} /></p>
                    <p className="text-xs text-muted-foreground">{fixedVsVariable.variable.count} txns</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="p-3 rounded-lg bg-green-500/10 border border-green-500/30"
                  >
                    <p className="text-xs text-green-500 font-medium">Income</p>
                    <p className="text-lg font-bold"><AnimatedCounter value={fixedVsVariable.income.total} decimals={0} /></p>
                    <p className="text-xs text-muted-foreground">{fixedVsVariable.income.count} txns</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/30"
                  >
                    <p className="text-xs text-gray-500 font-medium">Transfers</p>
                    <p className="text-lg font-bold"><AnimatedCounter value={fixedVsVariable.transfer.total} decimals={0} /></p>
                    <p className="text-xs text-muted-foreground">{fixedVsVariable.transfer.count} txns</p>
                  </motion.div>
                </div>
                <div className="mt-4">
                  <div className="h-3 rounded-full overflow-hidden flex">
                    <motion.div
                      className="bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${totals.totalSpend > 0 ? (fixedVsVariable.fixed.total / totals.totalSpend) * 100 : 0}%` }}
                      transition={{ duration: 1.2, delay: 0.3 }}
                    />
                    <motion.div
                      className="bg-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${totals.totalSpend > 0 ? (fixedVsVariable.variable.total / totals.totalSpend) * 100 : 0}%` }}
                      transition={{ duration: 1.2, delay: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Fixed: {totals.totalSpend > 0 ? ((fixedVsVariable.fixed.total / totals.totalSpend) * 100).toFixed(0) : 0}%</span>
                    <span>Variable: {totals.totalSpend > 0 ? ((fixedVsVariable.variable.total / totals.totalSpend) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "categories":
        return (
          <div className="h-full overflow-y-auto space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Spending by Category</h2>
              <p className="text-sm text-muted-foreground">Where your money goes</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Category List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Category Breakdown</CardTitle>
                  <CardDescription className="text-xs">Top spending categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {categoryBreakdown.slice(0, 10).map(({ category, label, color, total, count, percentage }, index) => (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm font-medium">{label}</span>
                            <Badge variant="outline" className="text-xs">{count}</Badge>
                          </div>
                          <span className="text-sm font-mono font-semibold">{total.toFixed(0)} AED</span>
                        </div>
                        <AnimatedProgressBar
                          value={percentage}
                          max={100}
                          color={color}
                          label=""
                          delay={index * 0.03}
                        />
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="space-y-4">
                <ChartCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Bar Chart</CardTitle>
                    <CardDescription className="text-xs">Top categories comparison</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {categoryBreakdown.length > 0 && (
                      <div className="h-[250px]">
                        <AnimatedBarChart
                          data={categoryBreakdown.slice(0, 6).map(({ label, total, color }) => ({
                            name: label.length > 10 ? label.substring(0, 10) + "..." : label,
                            value: total,
                            color,
                          }))}
                          height={250}
                        />
                      </div>
                    )}
                  </CardContent>
                </ChartCard>

                <ChartCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Distribution</CardTitle>
                    <CardDescription className="text-xs">Pie chart breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {categoryBreakdown.length > 0 && (
                      <div className="h-[250px]">
                        <AnimatedPieChart
                          data={categoryBreakdown.slice(0, 8).map(({ label, total, color }) => ({
                            name: label,
                            value: total,
                            color,
                          }))}
                          height={250}
                        />
                      </div>
                    )}
                  </CardContent>
                </ChartCard>
              </div>
            </div>
          </div>
        );

      case "trends":
        return (
          <div className="h-full overflow-y-auto space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Spending Trends</h2>
              <p className="text-sm text-muted-foreground">Month-over-month changes</p>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Month-over-Month Changes</CardTitle>
                <CardDescription className="text-xs">Spending changes vs last month</CardDescription>
              </CardHeader>
              <CardContent>
                {monthComparison.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Need more data for comparison</p>
                ) : (
                  <div className="space-y-3">
                    {monthComparison.map(({ category, label, currentMonth, previousMonth, change, changePercentage }, index) => (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.03 }}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 border border-transparent hover:border-border transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: CATEGORY_CONFIG[category]?.color || "#6b7280" }}
                          />
                          <div>
                            <span className="text-sm font-medium">{label}</span>
                            <p className="text-xs text-muted-foreground">
                              {previousMonth.toFixed(0)} → {currentMonth.toFixed(0)} AED
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={change > 0 ? "destructive" : change < 0 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {change > 0 ? "+" : ""}{changePercentage.toFixed(0)}%
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "merchants":
        return (
          <div className="h-full overflow-y-auto space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Top Merchants</h2>
              <p className="text-sm text-muted-foreground">Where you spend the most</p>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top 10 Merchants</CardTitle>
                <CardDescription className="text-xs">Ranked by total spending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {topMerchants.map(({ merchant, category, total, count, averageAmount }, index) => (
                    <motion.div
                      key={merchant}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
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
                        <span className="text-sm font-mono font-semibold"><AnimatedCounter value={total} decimals={0} /> AED</span>
                        <p className="text-xs text-muted-foreground">~{averageAmount.toFixed(0)}/txn</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "insights":
        return (
          <div className="h-full overflow-y-auto space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Insights & Alerts</h2>
              <p className="text-sm text-muted-foreground">Smart suggestions and anomalies</p>
            </div>

            <AnomaliesPanel />
            <SmartSuggestions />
            <MonthlyNarrative />
          </div>
        );

      case "comparison":
        return (
          <div className="h-full overflow-y-auto">
            <MonthComparisonView selectedMonth={monthToUse} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">Spending Insights</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="min-w-[44px] min-h-[44px]"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-background">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Analytics Views</h2>
                <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {views.map((view) => (
                <button
                  key={view.id}
                  onClick={() => {
                    setActiveView(view.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors min-h-[44px]",
                    activeView === view.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {view.icon}
                  <span className="font-medium">{view.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-shrink-0 md:border-r md:flex-col md:h-full">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Spending Insights</h1>
          <p className="text-xs text-muted-foreground mt-1">Full visibility into your finances</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                activeView === view.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {view.icon}
              <span className="font-medium text-sm">{view.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSummaryExport(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Summary
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden h-full flex flex-col">
        {/* Navigation Arrows */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevView}
              disabled={!canGoPrev}
              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px]"
              aria-label="Previous view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <div className="flex items-center gap-2 px-3">
              <span className="text-sm text-muted-foreground">
                {currentViewIndex + 1} / {views.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextView}
              disabled={!canGoNext}
              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px]"
              aria-label="Next view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
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
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="h-full p-4 md:p-6"
            >
              {renderViewContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Spending Summary Export Modal */}
      <SpendingSummaryExport 
        isOpen={showSummaryExport} 
        onClose={() => setShowSummaryExport(false)} 
      />
    </div>
  );
}
