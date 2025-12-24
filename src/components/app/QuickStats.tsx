"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";

interface QuickStatsProps {
  onNavigate: (tab: string) => void;
}

// Standardized stat card component
interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  helper: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  highlight?: boolean;
  progress?: number;
  onClick: () => void;
}

function StatCard({ title, value, unit, helper, icon, color, bgColor, highlight, progress, onClick }: StatCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md group",
        highlight && "border-amber-500/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Row 1: Title + Icon */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate max-w-[100px]">
            {title}
          </span>
          <div className={cn(
            "p-1.5 rounded-md transition-transform group-hover:scale-110",
            bgColor, color
          )}>
            {icon}
          </div>
        </div>
        
        {/* Row 2: Big Metric */}
        <p className={cn(
          "text-xl font-bold",
          highlight && "text-amber-500"
        )}>
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </p>
        
        {/* Row 3: Progress bar (optional) */}
        {progress !== undefined && (
          <Progress value={progress} className="h-1.5 mt-2" />
        )}
        
        {/* Row 4: Helper text */}
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {helper}
        </p>
      </CardContent>
    </Card>
  );
}

export function QuickStats({ onNavigate }: QuickStatsProps) {
  const { transactions, goals, cardSafety } = useApp();

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Filter this month's spending
    const monthlyTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= startOfMonth && 
             t.amount < 0 && 
             t.category !== "transfer" && 
             t.category !== "savings" && 
             t.category !== "investment";
    });
    const totalSpent = monthlyTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Compare to last month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= lastMonthStart && 
             txDate <= lastMonthEnd && 
             t.amount < 0 &&
             t.category !== "transfer";
    });
    const lastMonthTotal = lastMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const spentChange = lastMonthTotal > 0 
      ? Math.round(((totalSpent - lastMonthTotal) / lastMonthTotal) * 100) 
      : 0;

    // Work spend pending (reimbursable not paid)
    const floatingReimbursements = transactions.filter(
      t => t.tag === "reimbursable" && t.status !== "paid"
    );
    const floatingAmount = floatingReimbursements.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Nearest goal
    let nearestGoal = null;
    let goalProgress = 0;
    if (goals.length > 0) {
      const sortedGoals = [...goals].sort((a, b) => {
        const aProgress = a.currentAmount / a.targetAmount;
        const bProgress = b.currentAmount / b.targetAmount;
        return bProgress - aProgress;
      });
      nearestGoal = sortedGoals[0];
      goalProgress = Math.round((nearestGoal.currentAmount / nearestGoal.targetAmount) * 100);
    }

    // Card due
    let daysToDue = null;
    let dueDate = null;
    if (cardSafety?.dueDate) {
      dueDate = new Date(cardSafety.dueDate);
      const today = new Date();
      daysToDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      totalSpent,
      spentChange,
      floatingAmount,
      floatingCount: floatingReimbursements.length,
      nearestGoal,
      goalProgress,
      daysToDue,
      dueDate,
    };
  }, [transactions, goals, cardSafety]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Stat 1: Spent (MTD) */}
      <StatCard
        title="Spent (MTD)"
        value={stats.totalSpent.toLocaleString()}
        unit="AED"
        helper={`${stats.spentChange > 0 ? "↑" : stats.spentChange < 0 ? "↓" : "→"} ${Math.abs(stats.spentChange)}% vs last month`}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
        color="text-blue-500"
        bgColor="bg-blue-500/10"
        onClick={() => onNavigate("analytics")}
      />

      {/* Stat 2: Work spend pending */}
      <StatCard
        title="Work pending"
        value={stats.floatingAmount.toLocaleString()}
        unit="AED"
        helper={stats.floatingCount > 0 
          ? `${stats.floatingCount} item${stats.floatingCount !== 1 ? 's' : ''} awaiting`
          : "✓ All reimbursed"}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color={stats.floatingAmount > 0 ? "text-amber-500" : "text-green-500"}
        bgColor={stats.floatingAmount > 0 ? "bg-amber-500/10" : "bg-green-500/10"}
        highlight={stats.floatingAmount > 5000}
        onClick={() => onNavigate("reimbursements")}
      />

      {/* Stat 3: Goal progress (named) */}
      <StatCard
        title={stats.nearestGoal ? stats.nearestGoal.name : "Goals"}
        value={stats.nearestGoal ? `${stats.goalProgress}%` : "—"}
        helper={stats.nearestGoal 
          ? `${stats.nearestGoal.currentAmount.toLocaleString()} / ${stats.nearestGoal.targetAmount.toLocaleString()}`
          : "Set your first goal →"}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        }
        color={stats.goalProgress >= 75 ? "text-green-500" : "text-purple-500"}
        bgColor={stats.goalProgress >= 75 ? "bg-green-500/10" : "bg-purple-500/10"}
        progress={stats.nearestGoal ? stats.goalProgress : undefined}
        onClick={() => onNavigate("goals")}
      />

      {/* Stat 4: Card due */}
      <StatCard
        title="Card due"
        value={stats.daysToDue !== null ? stats.daysToDue : "—"}
        unit={stats.daysToDue !== null ? "days" : undefined}
        helper={stats.dueDate 
          ? stats.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          : "Set up card safety →"}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        }
        color={stats.daysToDue !== null && stats.daysToDue <= 5 ? "text-red-500" : "text-emerald-500"}
        bgColor={stats.daysToDue !== null && stats.daysToDue <= 5 ? "bg-red-500/10" : "bg-emerald-500/10"}
        highlight={stats.daysToDue !== null && stats.daysToDue <= 5}
        onClick={() => onNavigate("card-safety")}
      />
    </div>
  );
}
