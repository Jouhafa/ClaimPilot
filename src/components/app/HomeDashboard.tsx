"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { AdvisorVoice } from "./AdvisorVoice";
import { TopMoves } from "./TopMoves";
import { MonthlyPlanCard } from "./MonthlyPlanCard";
import { MonthGlance } from "./MonthGlance";
import { SetupChecklist } from "./SetupChecklist";
import { QuickStats } from "./QuickStats";
import { AlertsPanel } from "./AlertsPanel";

interface HomeDashboardProps {
  onNavigate: (tab: string) => void;
}

export function HomeDashboard({ onNavigate }: HomeDashboardProps) {
  const { transactions, goals, cardSafety } = useApp();

  // Get greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Check if setup is complete
  const setupStatus = useMemo(() => {
    const hasTransactions = transactions.length > 0;
    const hasReviewedTags = transactions.some(t => t.tag && !t.suggestedTag);
    const hasTrackedReimbursements = transactions.some(t => t.tag === "reimbursable" && t.status !== "draft");
    const hasGoals = goals.length > 0;
    const hasCardSafety = !!cardSafety?.dueDate;
    
    const steps = [hasTransactions, hasReviewedTags, hasTrackedReimbursements, hasGoals, hasCardSafety];
    const completed = steps.filter(Boolean).length;
    
    return {
      isComplete: completed === steps.length,
      completed,
      total: steps.length,
    };
  }, [transactions, goals, cardSafety]);

  // Calculate next check-in date (1st of next month)
  const nextCheckIn = useMemo(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, []);

  // Get next month name for plan generation
  const nextMonthName = useMemo(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString("en-US", { month: "long" });
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header + Advisor Voice */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{greeting}!</h1>
        </div>
        <AdvisorVoice />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Primary (60%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top 3 Moves */}
          <TopMoves onNavigate={onNavigate} />
          
          {/* This Month's Plan */}
          <MonthlyPlanCard onNavigate={onNavigate} />
          
          {/* Alerts */}
          <AlertsPanel onNavigate={onNavigate} />
        </div>

        {/* Right Column - Secondary (40%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* This Month at a Glance */}
          <MonthGlance />
          
          {/* Quick Stats */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Quick Stats</h2>
            <QuickStats onNavigate={onNavigate} />
          </div>
          
          {/* Setup Checklist (only shows if incomplete) */}
          <SetupChecklist onNavigate={onNavigate} />
        </div>
      </div>

      {/* Guided Finish Line - Shows when setup is complete */}
      {setupStatus.isComplete && (
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-500/10 to-transparent" />
          <CardContent className="py-6 relative">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Left: Status */}
              <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <span className="text-2xl">✅</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-600 dark:text-green-400">
                    You&apos;ve got a plan!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    All set for this month. Next check-in: <span className="font-medium text-foreground">{nextCheckIn}</span>
                  </p>
                </div>
              </div>

              {/* Right: Action */}
              <div className="flex flex-col sm:items-end gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("action-plan")}
                  className="border-green-500/30 hover:bg-green-500/10"
                >
                  Generate {nextMonthName} Plan →
                </Button>
                <p className="text-xs text-muted-foreground text-center sm:text-right">
                  Preview your next month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
