"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { computeAppState } from "@/lib/appState";
import { cn } from "@/lib/utils";
import { TopMoves } from "./TopMoves";
import { MonthlyPlanCard } from "./MonthlyPlanCard";
import { MonthGlance } from "./MonthGlance";
import { SetupChecklist } from "./SetupChecklist";
import { AlertsPanel } from "./AlertsPanel";
import { ROICard } from "./ROICard";
import { getMonthlyWrap } from "@/lib/storage";
import { getMonthOverMonthComparison } from "@/lib/categories";
import type { WrapSnapshot } from "@/lib/types";

interface HomeDashboardProps {
  onNavigate: (tab: string) => void;
  onPlayWrap?: (wrapSnapshot: WrapSnapshot) => void;
}

export function HomeDashboard({ onNavigate, onPlayWrap }: HomeDashboardProps) {
  const { transactions, goals, profile, buckets } = useApp();
  const [selectedMonth] = useState(() => new Date());
  const [planExpanded, setPlanExpanded] = useState(false);
  const [currentWrap, setCurrentWrap] = useState<WrapSnapshot | null>(null);

  // Load current month's wrap
  useEffect(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    getMonthlyWrap(monthKey).then(setCurrentWrap);
  }, [transactions]); // Reload when transactions change
  
  // Compute app state
  const appState = useMemo(() => 
    computeAppState(transactions, goals, buckets, profile, selectedMonth),
    [transactions, goals, buckets, profile, selectedMonth]
  );

  // Get greeting based on time and profile
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let timeGreeting = "Good morning";
    if (hour >= 17) timeGreeting = "Good evening";
    else if (hour >= 12) timeGreeting = "Good afternoon";
    
    const name = profile?.nickname || "there";
    return `${timeGreeting}, ${name}`;
  }, [profile]);
  
  // One sentence summary
  const summarySentence = useMemo(() => {
    const reimbursable = transactions.filter(t => t.tag === "reimbursable" && t.status === "draft");
    const totalReimbursable = reimbursable.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const currency = profile?.currency || "AED";
    
    if (totalReimbursable > 0) {
      return `You're floating ${currency} ${totalReimbursable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in reimbursements`;
    }
    return "You're all set for this month";
  }, [transactions, profile]);

  // Month-over-month comparison
  const monthComparison = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const currentMonthTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= currentMonthStart && txDate <= now && t.amount < 0 && !t.parentId;
    });

    const previousMonthTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= previousMonthStart && txDate <= previousMonthEnd && t.amount < 0 && !t.parentId;
    });

    const currentTotal = currentMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const previousTotal = previousMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const change = currentTotal - previousTotal;
    const changePercent = previousTotal > 0 ? ((change / previousTotal) * 100) : (currentTotal > 0 ? 100 : 0);

    // Get top category changes
    const categoryComparison = getMonthOverMonthComparison(transactions, now);
    const topChanges = categoryComparison
      .filter(c => Math.abs(c.changePercentage) > 5) // Only significant changes (>5%)
      .slice(0, 3);

    return {
      currentTotal,
      previousTotal,
      change,
      changePercent,
      topChanges,
      hasData: previousTotal > 0 || currentTotal > 0,
    };
  }, [transactions]);

  // Quick action tiles (Wio-style)
  const quickActions = [
    {
      id: "review",
      label: "Review",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      action: () => onNavigate("review"),
    },
    {
      id: "buckets",
      label: "Buckets",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      action: () => onNavigate("buckets"),
    },
    {
      id: "goals",
      label: "Goals",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      action: () => onNavigate("goals"),
    },
    {
      id: "export",
      label: "Export",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: () => onNavigate("export"),
    },
  ];

  return (
    <div className="space-y-4 page-transition max-w-[1120px] mx-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
            {greeting}!
          </h1>
          <p className="text-[15px] text-muted-foreground mt-1" style={{ lineHeight: 1.6 }}>{summarySentence}</p>
        </div>
      </div>

      {/* Status Strip - Compact */}
      {appState.state === "NEEDS_IMPORT" ? (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Import this month</p>
                  <p className="text-[13px] text-muted-foreground">Upload your statement to get started</p>
                </div>
              </div>
              <Button
                onClick={() => onNavigate("import")}
                size="lg"
                className="h-10 px-6"
              >
                Import
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>This month is ready</p>
                  <p className="text-[13px] text-muted-foreground">All transactions imported and reviewed</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate("review")}
                className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Review transactions
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 3 Moves - Primary Focus */}
      {appState.state !== "NEEDS_IMPORT" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => onNavigate("plan")}
              className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <TopMoves onNavigate={onNavigate} />
        </div>
      )}

      {/* Month at a Glance - Compact */}
      {appState.state !== "NEEDS_IMPORT" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-semibold" style={{ fontWeight: 600 }}>Month at a glance</h2>
            <button
              onClick={() => onNavigate("analytics")}
              className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View details
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <MonthGlance />
        </div>
      )}

      {/* Month-over-Month Comparison */}
      {appState.state !== "NEEDS_IMPORT" && monthComparison.hasData && (
        <Card className="border border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[16px] font-semibold mb-1" style={{ fontWeight: 600 }}>This month vs last month</h3>
                <p className="text-[13px] text-muted-foreground">Spending comparison</p>
              </div>
              <button
                onClick={() => onNavigate("analytics")}
                className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Full comparison
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Total Spending Delta */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-[13px] text-muted-foreground">Total spending</p>
                  <p className="text-[18px] font-bold mt-1">
                    {monthComparison.currentTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {profile?.currency || "AED"}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-[14px] font-semibold",
                    monthComparison.change >= 0 ? "text-red-500" : "text-green-500"
                  )}>
                    {monthComparison.change >= 0 ? "+" : ""}{monthComparison.change.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {profile?.currency || "AED"}
                  </p>
                  <p className={cn(
                    "text-[12px]",
                    monthComparison.changePercent >= 0 ? "text-red-500" : "text-green-500"
                  )}>
                    {monthComparison.changePercent >= 0 ? "+" : ""}{monthComparison.changePercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Top Category Changes */}
              {monthComparison.topChanges.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[13px] font-medium" style={{ fontWeight: 500 }}>Biggest changes</p>
                  {monthComparison.topChanges.map((change) => (
                    <div key={change.category} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <span className="text-[13px]">{change.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-muted-foreground">
                          {change.previousMonth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} →
                        </span>
                        <span className={cn(
                          "text-[13px] font-semibold",
                          change.change >= 0 ? "text-red-500" : "text-green-500"
                        )}>
                          {change.currentMonth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className={cn(
                          "text-[11px] font-medium",
                          change.changePercentage >= 0 ? "text-red-500" : "text-green-500"
                        )}>
                          ({change.changePercentage >= 0 ? "+" : ""}{change.changePercentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ROI Card - Locked (WIP) */}
      {/* {appState.state !== "NEEDS_IMPORT" && (
        <ROICard onNavigate={onNavigate} />
      )} */}

      {/* This Month's Wrap Card */}
      {appState.state !== "NEEDS_IMPORT" && currentWrap && (
        <Card className="border border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>This month's Wrap</p>
                    {!currentWrap.watchedAt && (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {currentWrap.wrapData.heroNumber} {currentWrap.wrapData.heroLabel}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onPlayWrap?.(currentWrap)}
                size="sm"
                className="h-9 px-4"
              >
                Watch →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts - Only if they exist */}
      {appState.state !== "NEEDS_IMPORT" && (
        <AlertsPanel onNavigate={onNavigate} />
      )}

      {/* Setup Checklist - Only show if not complete */}
      {appState.state === "FIRST_RUN_SETUP" && (
        <SetupChecklist onNavigate={onNavigate} />
      )}
    </div>
  );
}
