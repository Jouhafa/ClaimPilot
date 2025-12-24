"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/context";
import { getAutoTagStats } from "@/lib/autoTagger";

export function AdvisorVoice() {
  const { transactions, goals, cardSafety } = useApp();

  const message = useMemo(() => {
    const today = new Date();
    
    // Priority 1: Card payment overdue
    if (cardSafety?.dueDate) {
      const dueDate = new Date(cardSafety.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const remaining = cardSafety.statementBalance - (cardSafety.paymentsMade || 0);
      
      if (daysUntilDue < 0 && remaining > 0) {
        return {
          text: `Your card payment is overdue. Pay ${remaining.toLocaleString()} AED now to avoid interest charges.`,
          tone: "urgent" as const,
        };
      }
      if (daysUntilDue <= 3 && daysUntilDue >= 0 && remaining > 0) {
        return {
          text: `${remaining.toLocaleString()} AED due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. Pay now to stay interest-free.`,
          tone: "warning" as const,
        };
      }
    }

    // Priority 2: High floating reimbursements
    const floatingReimbursements = transactions.filter(
      t => t.tag === "reimbursable" && t.status !== "paid"
    );
    const floatingAmount = floatingReimbursements.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    if (floatingAmount > 5000) {
      return {
        text: `You're floating ${floatingAmount.toLocaleString()} AED in reimbursements. Let's get it back this week.`,
        tone: "action" as const,
      };
    }

    // Priority 3: Unreviewed transactions
    const autoTagStats = getAutoTagStats(transactions);
    if (autoTagStats.needsReviewCount > 5) {
      return {
        text: `${autoTagStats.needsReviewCount} transactions need your review. Let's tag them in under a minute.`,
        tone: "action" as const,
      };
    }

    // Priority 4: Goal milestone close
    const closestGoal = goals.find(g => {
      const progress = (g.currentAmount / g.targetAmount) * 100;
      return progress >= 85 && progress < 100;
    });
    if (closestGoal) {
      const progress = Math.round((closestGoal.currentAmount / closestGoal.targetAmount) * 100);
      const remaining = closestGoal.targetAmount - closestGoal.currentAmount;
      return {
        text: `You're ${100 - progress}% away from your ${closestGoal.name} goal! Just ${remaining.toLocaleString()} AED to go.`,
        tone: "positive" as const,
      };
    }

    // Priority 5: Stale reimbursements
    const staleReimbursements = transactions.filter(t => {
      if (t.tag !== "reimbursable" || t.status !== "submitted") return false;
      const txDate = new Date(t.createdAt);
      const daysSince = Math.floor((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 14;
    });
    if (staleReimbursements.length > 0) {
      const total = staleReimbursements.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return {
        text: `${total.toLocaleString()} AED in reimbursements submitted over 2 weeks ago. Time to follow up?`,
        tone: "action" as const,
      };
    }

    // Priority 6: No data yet
    if (transactions.length === 0) {
      return {
        text: "Let's start by importing your first bank statement. It takes 30 seconds.",
        tone: "welcome" as const,
      };
    }

    // Default: All good
    const spentThisMonth = transactions
      .filter(t => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === today.getMonth() && 
               txDate.getFullYear() === today.getFullYear() &&
               t.amount < 0;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (spentThisMonth > 0) {
      return {
        text: `You're on track this month. ${spentThisMonth.toLocaleString()} AED spent so far. Keep it up!`,
        tone: "positive" as const,
      };
    }

    return {
      text: "Welcome back! Let's see where your money is going.",
      tone: "welcome" as const,
    };
  }, [transactions, goals, cardSafety]);

  const getToneStyles = (tone: string) => {
    switch (tone) {
      case "urgent":
        return "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300";
      case "warning":
        return "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300";
      case "action":
        return "bg-primary/10 border-primary/30 text-primary";
      case "positive":
        return "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300";
      default:
        return "bg-muted border-border text-muted-foreground";
    }
  };

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case "urgent":
        return "⚠️";
      case "warning":
        return "⏰";
      case "action":
        return "💡";
      case "positive":
        return "✨";
      default:
        return "👋";
    }
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${getToneStyles(message.tone)} animate-in fade-in duration-500`}>
      <p className="text-sm font-medium flex items-center gap-2">
        <span className="text-base">{getToneIcon(message.tone)}</span>
        {message.text}
      </p>
    </div>
  );
}

