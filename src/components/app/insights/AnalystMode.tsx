"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartCard } from "@/components/app/charts/ChartCard";
import { AnimatedPieChart, AnimatedProgressBar, AnimatedCounter } from "@/components/app/AnimatedChart";
import { AnomaliesPanel } from "../AnomaliesPanel";
import { SmartSuggestions } from "../SmartSuggestions";
import { MonthComparisonView } from "../MonthComparisonView";
import { AIHintsPanel } from "./AIHintsPanel";
import { useApp } from "@/lib/context";
import { 
  getCategoryBreakdown, 
  getMonthOverMonthComparison, 
  getTopMerchants
} from "@/lib/categories";
import { CATEGORY_CONFIG, type TransactionCategory } from "@/lib/types";

interface AnalystModeProps {
  selectedMonth: Date;
  aiHints?: any;
  isLoadingAI?: boolean;
}

/**
 * Layer 3: Analyst Mode
 * Deep dive with filters, charts, tables, and AI hints
 */
export function AnalystMode({ selectedMonth, aiHints, isLoadingAI }: AnalystModeProps) {
  const { transactions } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [merchantSearch, setMerchantSearch] = useState("");

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(t => t.amount < 0 && !t.parentId);
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    if (merchantSearch) {
      const searchLower = merchantSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.merchant.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [transactions, selectedCategory, merchantSearch]);

  // Get analytics data
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(filteredTransactions), [filteredTransactions]);
  const monthComparison = useMemo(() => getMonthOverMonthComparison(transactions, selectedMonth), [transactions, selectedMonth]);
  const topMerchants = useMemo(() => getTopMerchants(filteredTransactions, 10), [filteredTransactions]);

  // Get all categories for filter
  const allCategories = useMemo(() => {
    const cats = new Set<TransactionCategory>();
    transactions.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-[16px] font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] text-muted-foreground mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {allCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat]?.label || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-[12px] text-muted-foreground mb-2 block">Merchant Search</label>
              <Input
                placeholder="Search merchants..."
                value={merchantSearch}
                onChange={(e) => setMerchantSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Charts and Tables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Breakdown */}
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

          {/* Month Comparison */}
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
                  {monthComparison.slice(0, 10).map(({ category, label, currentMonth, previousMonth, change, changePercentage }, index) => (
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

          {/* Top Merchants */}
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

          {/* Alerts and Suggestions */}
          <div className="space-y-4">
            <AnomaliesPanel />
            <SmartSuggestions />
          </div>
        </div>

        {/* Right: AI Hints Panel */}
        <div>
          <AIHintsPanel hints={aiHints} isLoading={isLoadingAI} />
        </div>
      </div>
    </div>
  );
}
