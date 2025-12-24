"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";

interface MonthlyPlanCardProps {
  onNavigate: (tab: string) => void;
}

interface PlanItem {
  id: string;
  type: "save" | "invest" | "pay" | "action";
  label: string;
  amount: number;
  target: string;
  urgent?: boolean;
  dueDate?: string;
  completed?: boolean;
}

export function MonthlyPlanCard({ onNavigate }: MonthlyPlanCardProps) {
  const { transactions, goals, cardSafety, buckets, tier, incomeConfig } = useApp();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [undoCountdown, setUndoCountdown] = useState(0);

  const plan = useMemo(() => {
    const items: PlanItem[] = [];
    const today = new Date();
    
    // Get monthly income (from config or estimate from transactions)
    const monthlyIncome = incomeConfig?.monthlyIncome || 
      transactions
        .filter(t => t.category === "income" && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0) || 45000;

    // Calculate savings allocation (20% of income or from buckets)
    const savingsBucket = buckets.find(b => b.name.toLowerCase().includes("goal") || b.name.toLowerCase().includes("saving"));
    const savingsTarget = savingsBucket 
      ? Math.round(monthlyIncome * (savingsBucket.targetPercentage / 100))
      : Math.round(monthlyIncome * 0.2);

    // Add savings items for each goal
    if (goals.length > 0) {
      const topGoal = goals.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })[0];
      
      const monthlyContribution = topGoal.monthlyContribution || 
        Math.round((topGoal.targetAmount - topGoal.currentAmount) / 12);
      
      items.push({
        id: "save-goal",
        type: "save",
        label: "Save",
        amount: monthlyContribution,
        target: topGoal.name,
        completed: false,
      });
    } else {
      // Default savings suggestion
      items.push({
        id: "save-default",
        type: "save",
        label: "Save",
        amount: Math.round(savingsTarget * 0.6),
        target: "Emergency Fund",
        completed: false,
      });
    }

    // Add investment allocation (from bucket or 10% of income)
    const investTarget = Math.round(monthlyIncome * 0.1);
    if (investTarget > 1000) {
      items.push({
        id: "invest",
        type: "invest",
        label: "Invest",
        amount: investTarget,
        target: "ETFs (moderate risk)",
        completed: false,
      });
    }

    // Add card payment (if card safety is set)
    if (cardSafety?.dueDate) {
      const dueDate = new Date(cardSafety.dueDate);
      const remaining = cardSafety.statementBalance - (cardSafety.paymentsMade || 0);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (remaining > 0) {
        items.push({
          id: "pay-card",
          type: "pay",
          label: "Pay credit card",
          amount: remaining,
          target: `by ${dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
          urgent: daysUntilDue <= 5,
          dueDate: cardSafety.dueDate,
          completed: false,
        });
      }
    }

    return items;
  }, [transactions, goals, cardSafety, buckets, tier, incomeConfig]);

  const isLocked = tier === "free";

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "save": return "💰";
      case "invest": return "📈";
      case "pay": return "💳";
      default: return "✓";
    }
  };

  const getTypeColor = (type: string, urgent?: boolean) => {
    if (urgent) return "text-red-500";
    switch (type) {
      case "save": return "text-green-500";
      case "invest": return "text-blue-500";
      case "pay": return "text-amber-500";
      default: return "text-muted-foreground";
    }
  };

  // Handle apply plan
  const handleApplyPlan = () => {
    setShowConfirmation(true);
  };

  // Confirm and apply
  const confirmApply = () => {
    setShowConfirmation(false);
    setIsApplied(true);
    setUndoCountdown(60);
    
    // Start countdown
    const interval = setInterval(() => {
      setUndoCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Set undo timeout
    const timeout = setTimeout(() => {
      setUndoCountdown(0);
    }, 60000);
    
    setUndoTimeout(timeout);
  };

  // Handle undo
  const handleUndo = () => {
    setIsApplied(false);
    setUndoCountdown(0);
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (undoTimeout) clearTimeout(undoTimeout);
    };
  }, [undoTimeout]);

  if (plan.length === 0 && !isLocked) {
    return null;
  }

  // Get what the plan will do
  const planActions = useMemo(() => {
    const actions: string[] = [];
    const saveItems = plan.filter(p => p.type === "save");
    const investItems = plan.filter(p => p.type === "invest");
    const payItems = plan.filter(p => p.type === "pay");
    
    if (saveItems.length > 0) {
      actions.push(`Create ${saveItems.length} savings transfer${saveItems.length > 1 ? 's' : ''}`);
    }
    if (investItems.length > 0) {
      actions.push(`Set ${investItems.length} investment target${investItems.length > 1 ? 's' : ''}`);
    }
    if (payItems.length > 0) {
      actions.push(`Schedule ${payItems.length} payment reminder${payItems.length > 1 ? 's' : ''}`);
    }
    return actions;
  }, [plan]);

  return (
    <Card className={cn(
      "relative overflow-hidden",
      isLocked && "border-dashed"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">This month&apos;s plan</CardTitle>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {isApplied ? "Applied" : "Auto-generated"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={cn(isLocked && "blur-[2px]")}>
        {/* Undo Banner */}
        {isApplied && undoCountdown > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-green-600 dark:text-green-400">Plan applied!</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleUndo} className="text-xs">
              Undo ({undoCountdown}s)
            </Button>
          </div>
        )}

        {/* Confirmation Drawer */}
        {showConfirmation && (
          <div className="mb-4 p-4 rounded-lg bg-muted/80 border space-y-3">
            <p className="text-sm font-medium">This will:</p>
            <ul className="space-y-1.5">
              {planActions.map((action, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {action}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={confirmApply}>
                Confirm
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowConfirmation(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Plan Items */}
        <div className="space-y-3">
          {plan.map((item) => (
            <div 
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                item.urgent ? "bg-red-500/10" : "bg-muted/50",
                isApplied && "opacity-70"
              )}
            >
              <Checkbox 
                checked={isApplied || item.completed}
                className={cn(
                  "border-2",
                  item.urgent && "border-red-500"
                )}
                disabled={isLocked || !isApplied}
              />
              <span className="text-lg">{getTypeIcon(item.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  {item.urgent && (
                    <Badge variant="destructive" className="text-[9px] px-1 py-0">
                      Urgent
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn("font-bold", getTypeColor(item.type, item.urgent))}>
                    {item.amount.toLocaleString()} AED
                  </span>
                  <span className="text-sm text-muted-foreground">
                    → {item.target}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Action Buttons */}
        {!showConfirmation && !isApplied && (
          <div className="flex gap-2 mt-4">
            <Button 
              className="flex-1" 
              size="sm"
              disabled={isLocked}
              onClick={handleApplyPlan}
            >
              Apply plan
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              disabled={isLocked}
              onClick={() => onNavigate("goals")}
            >
              Edit plan
            </Button>
          </div>
        )}

        {isApplied && undoCountdown === 0 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Plan is active for this month
          </p>
        )}
      </CardContent>

      {/* Lock overlay for free tier */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[1px]">
          <div className="text-center p-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="font-semibold text-sm mb-1">Unlock your monthly plan</p>
            <p className="text-xs text-muted-foreground mb-3">Get a personalized financial playbook</p>
            <Button size="sm" onClick={() => onNavigate("export")}>
              Upgrade for $54
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
