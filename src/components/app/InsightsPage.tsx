"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { SmartSuggestions } from "./SmartSuggestions";
import { MonthlyNarrative } from "./MonthlyNarrative";
import { MonthComparisonView } from "./MonthComparisonView";
import { AnimatedPieChart, AnimatedProgressBar, AnimatedCounter, ChartCard } from "./AnimatedChart";
import { motion } from "framer-motion";

type InsightsView = "overview" | "categories" | "trends" | "merchants" | "alerts" | "compare";

interface InsightsPageProps {
  onNavigate?: (tab: string) => void;
  selectedMonth?: Date;
  showComparison?: boolean;
}

export function InsightsPage({ onNavigate, selectedMonth, showComparison = false }: InsightsPageProps = {}) {
  const { transactions, incomeConfig } = useApp();
  const [activeView, setActiveView] = useState<InsightsView>(showComparison ? "compare" : "overview");
  
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

  // Biggest delta (month over month)
  const biggestDelta = useMemo(() => {
    if (monthComparison.length === 0) return null;
    return monthComparison
      .filter(c => Math.abs(c.changePercentage) > 0)
      .sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage))[0];
  }, [monthComparison]);

  // Top category
  const topCategory = useMemo(() => {
    if (categoryBreakdown.length === 0) return null;
    return categoryBreakdown[0];
  }, [categoryBreakdown]);


  const views: Array<{ id: InsightsView; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "categories", label: "Categories" },
    { id: "trends", label: "Trends" },
    { id: "merchants", label: "Merchants" },
    { id: "alerts", label: "Alerts" },
    { id: "compare", label: "Compare" },
  ];

  const currentViewIndex = views.findIndex(v => v.id === activeView);
  const canGoPrev = currentViewIndex > 0;
  const canGoNext = currentViewIndex < views.length - 1;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" && canGoPrev) {
        setActiveView(views[currentViewIndex - 1].id);
      }
      if (e.key === "ArrowRight" && canGoNext) {
        setActiveView(views[currentViewIndex + 1].id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentViewIndex, canGoPrev, canGoNext]);

  if (transactions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md border border-border/50">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No data yet</h3>
            <p className="text-sm text-muted-foreground">
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
          <div className="space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border border-border/50">
                <CardContent className="pt-6">
                  <p className="text-[13px] text-muted-foreground mb-1">Total Spending</p>
                  <p className="text-[20px] font-bold text-red-500">
                    <AnimatedCounter value={totals.totalSpend} decimals={0} /> <span className="text-xs font-normal">AED</span>
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1">{totals.count} transactions</p>
                </CardContent>
              </Card>

              <Card className="border border-border/50">
                <CardContent className="pt-6">
                  <p className="text-[13px] text-muted-foreground mb-1">Net Cashflow</p>
                  <p className={`text-[20px] font-bold ${cashflow.netCashflow >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {cashflow.netCashflow >= 0 ? "+" : ""}
                    <AnimatedCounter value={Math.abs(cashflow.netCashflow)} decimals={0} /> <span className="text-xs font-normal">AED</span>
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1">Income - Expenses</p>
                </CardContent>
              </Card>

              <Card className="border border-border/50">
                <CardContent className="pt-6">
                  <p className="text-[13px] text-muted-foreground mb-1">Savings Rate</p>
                  <p className={`text-[20px] font-bold ${savingsRate >= 20 ? "text-green-500" : savingsRate >= 0 ? "text-yellow-500" : "text-red-500"}`}>
                    <AnimatedCounter value={savingsRate} decimals={1} />%
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {savingsRate >= 20 ? "Great!" : savingsRate >= 10 ? "Good" : "Needs work"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/50">
                <CardContent className="pt-6">
                  <p className="text-[13px] text-muted-foreground mb-1">Top Category</p>
                  {topCategory ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: topCategory.color }} />
                        <p className="text-[13px] font-medium truncate">{topCategory.label}</p>
                      </div>
                      <p className="text-[20px] font-bold">
                        <AnimatedCounter value={topCategory.total} decimals={0} /> <span className="text-xs font-normal">AED</span>
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-1">{topCategory.percentage.toFixed(1)}% of total</p>
                    </>
                  ) : (
                    <p className="text-[16px] font-medium text-muted-foreground">—</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Fixed vs Variable */}
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-[16px] font-semibold">Fixed vs Variable</CardTitle>
                <CardDescription className="text-[13px]">Recurring bills vs discretionary spending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-[12px] text-blue-500 font-medium">Fixed</p>
                    <p className="text-[16px] font-bold"><AnimatedCounter value={fixedVsVariable.fixed.total} decimals={0} /></p>
                    <p className="text-[11px] text-muted-foreground">{fixedVsVariable.fixed.count} txns</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <p className="text-[12px] text-orange-500 font-medium">Variable</p>
                    <p className="text-[16px] font-bold"><AnimatedCounter value={fixedVsVariable.variable.total} decimals={0} /></p>
                    <p className="text-[11px] text-muted-foreground">{fixedVsVariable.variable.count} txns</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-[12px] text-green-500 font-medium">Income</p>
                    <p className="text-[16px] font-bold"><AnimatedCounter value={fixedVsVariable.income.total} decimals={0} /></p>
                    <p className="text-[11px] text-muted-foreground">{fixedVsVariable.income.count} txns</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/30">
                    <p className="text-[12px] text-gray-500 font-medium">Transfers</p>
                    <p className="text-[16px] font-bold"><AnimatedCounter value={fixedVsVariable.transfer.total} decimals={0} /></p>
                    <p className="text-[11px] text-muted-foreground">{fixedVsVariable.transfer.count} txns</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Categories Preview */}
            {categoryBreakdown.length > 0 && (
              <Card className="border border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[16px] font-semibold">Top Categories</CardTitle>
                  <CardDescription className="text-[13px]">Your biggest spending areas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryBreakdown.slice(0, 5).map(({ category, label, total, percentage, color }, index) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[13px] font-medium truncate">{label}</span>
                        </div>
                        <div className="text-right ml-4">
                          <span className="text-[13px] font-semibold">
                            {total.toFixed(0)} AED
                          </span>
                          <span className="text-[11px] text-muted-foreground ml-2">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "categories":
        return (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Category List with Bars */}
              <ChartCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[16px] font-semibold">Category Breakdown</CardTitle>
                  <CardDescription className="text-[13px]">Top spending categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryBreakdown.slice(0, 10).map(({ category, label, total, count, percentage, color }, index) => (
                      <div key={category} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-[13px] font-medium truncate">{label}</span>
                            <Badge variant="outline" className="text-[11px]">{count}</Badge>
                          </div>
                          <div className="text-right ml-4">
                            <span className="text-[13px] font-semibold">{total.toFixed(0)} AED</span>
                            <span className="text-[11px] text-muted-foreground ml-2">{percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <AnimatedProgressBar
                          value={percentage}
                          max={100}
                          color={color}
                          label=""
                          height={6}
                          delay={index * 0.03}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </ChartCard>

              {/* Compact Donut Chart */}
              <ChartCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[16px] font-semibold">Distribution</CardTitle>
                  <CardDescription className="text-[13px]">Visual breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryBreakdown.length > 0 && (
                    <div className="h-[300px]">
                      <AnimatedPieChart
                        data={categoryBreakdown.slice(0, 8).map(({ label, total, color }) => ({
                          name: label,
                          value: total,
                          color,
                        }))}
                        height={300}
                        innerRadius={60}
                        outerRadius={100}
                      />
                    </div>
                  )}
                </CardContent>
              </ChartCard>
            </div>
          </div>
        );

      case "trends":
        return (
          <div className="space-y-4">
            <ChartCard>
              <CardHeader className="pb-3">
                <CardTitle className="text-[16px] font-semibold">Month-over-Month Changes</CardTitle>
                <CardDescription className="text-[13px]">Spending changes vs last month</CardDescription>
              </CardHeader>
              <CardContent>
                {monthComparison.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Need more data for comparison</p>
                ) : (
                  <div className="space-y-2">
                    {monthComparison
                      .filter((c) => c.currentMonth > 0 || c.previousMonth > 0)
                      .slice(0, 10)
                      .map(({ category, label, currentMonth, previousMonth, change, changePercentage }, index) => (
                        <div
                          key={category}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 border border-transparent hover:border-border transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: CATEGORY_CONFIG[category]?.color || "#6b7280" }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-medium">{label}</span>
                              <p className="text-[11px] text-muted-foreground">
                                {previousMonth.toFixed(0)} → {currentMonth.toFixed(0)} AED
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={change > 0 ? "destructive" : change < 0 ? "default" : "secondary"}
                            className="text-[11px] ml-4"
                          >
                            {change > 0 ? "+" : ""}{changePercentage.toFixed(0)}%
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </ChartCard>
          </div>
        );

      case "merchants":
        return (
          <div className="space-y-4">
            <ChartCard>
              <CardHeader className="pb-3">
                <CardTitle className="text-[16px] font-semibold">Top Merchants</CardTitle>
                <CardDescription className="text-[13px]">Ranked by total spending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {topMerchants.map(({ merchant, category, total, count, averageAmount }, index) => (
                    <div
                      key={merchant}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[12px] font-bold text-primary flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">{merchant}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className="text-[11px]"
                              style={{ 
                                borderColor: CATEGORY_CONFIG[category]?.color,
                                color: CATEGORY_CONFIG[category]?.color 
                              }}
                            >
                              {CATEGORY_CONFIG[category]?.label || category}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">{count} txns</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <span className="text-[13px] font-semibold">
                          <AnimatedCounter value={total} decimals={0} /> AED
                        </span>
                        <p className="text-[11px] text-muted-foreground">~{averageAmount.toFixed(0)}/txn</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </ChartCard>
          </div>
        );

      case "alerts":
        return (
          <div className="space-y-4">
            <AnomaliesPanel />
            <SmartSuggestions />
            <MonthlyNarrative />
          </div>
        );

      case "compare":
        return (
          <div className="space-y-4">
            <MonthComparisonView selectedMonth={monthToUse} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Tabs */}
      <div className="border-b border-border/50 bg-background">
        <div className="max-w-[1120px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
                Spending Insights
              </h1>
              <p className="text-[15px] text-muted-foreground mt-1" style={{ lineHeight: 1.6 }}>Full visibility into your finances</p>
            </div>
          </div>
          
          {/* Tab Navigation - Matching Hub style */}
          <div className="flex items-center gap-1 border-b border-border/50">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={cn(
                  "px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px",
                  activeView === view.id
                    ? "text-foreground border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1120px] mx-auto px-4 py-4">
          <motion.div
            key={activeView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {renderViewContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
