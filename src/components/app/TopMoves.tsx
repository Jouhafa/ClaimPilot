"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/context";
import { getAutoTagStats } from "@/lib/autoTagger";
import { cn } from "@/lib/utils";

interface TopMovesProps {
  onNavigate: (tab: string) => void;
}

interface MoveItem {
  id: string;
  priority: number;
  icon: string;
  title: string;
  impact: string;
  timeEstimate: string;
  tab: string;
}

export function TopMoves({ onNavigate }: TopMovesProps) {
  const { transactions, goals, cardSafety, tier, recurring } = useApp();

  const moves = useMemo(() => {
    const items: MoveItem[] = [];
    const today = new Date();

    // Calculate key metrics
    const draftReimbursements = transactions.filter(
      t => t.tag === "reimbursable" && t.status === "draft"
    );
    const draftTotal = draftReimbursements.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const autoTagStats = getAutoTagStats(transactions);
    
    const floatingReimbursements = transactions.filter(
      t => t.tag === "reimbursable" && t.status !== "paid"
    );
    const floatingTotal = floatingReimbursements.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate potential subscription savings (rough estimate)
    const subscriptionTotal = transactions
      .filter(t => t.isRecurring && t.category === "subscriptions")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Move 1: Submit reimbursements (if any draft)
    if (draftReimbursements.length > 0) {
      items.push({
        id: "submit-reimbursements",
        priority: 1,
        icon: "💰",
        title: "Submit reimbursements",
        impact: `+${draftTotal.toLocaleString()} AED`,
        timeEstimate: "~2 min",
        tab: "reimbursements",
      });
    }

    // Move 2: Card safety (if payment due soon)
    if (cardSafety?.dueDate) {
      const dueDate = new Date(cardSafety.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const remaining = cardSafety.statementBalance - (cardSafety.paymentsMade || 0);
      
      if (remaining > 0 && daysUntilDue <= 14) {
        items.push({
          id: "pay-card",
          priority: daysUntilDue <= 3 ? 0.5 : 2,
          icon: "💳",
          title: "Pay card safely",
          impact: `Avoid ${Math.round(remaining * 0.02).toLocaleString()} AED interest`,
          timeEstimate: "~1 min",
          tab: "card-safety",
        });
      }
    }

    // Move 3: Review transactions (if unreviewed)
    if (autoTagStats.needsReviewCount > 0) {
      items.push({
        id: "review-tags",
        priority: 3,
        icon: "🏷️",
        title: `Tag ${autoTagStats.needsReviewCount} transactions`,
        impact: "Unlock insights",
        timeEstimate: "~30 sec",
        tab: "review",
      });
    }

    // Move 4: Review subscriptions (if any detected)
    if (subscriptionTotal > 100) {
      const potentialSavings = Math.round(subscriptionTotal * 0.2);
      items.push({
        id: "review-subscriptions",
        priority: 4,
        icon: "🔄",
        title: "Review subscriptions",
        impact: `Save ~${potentialSavings.toLocaleString()} AED/mo`,
        timeEstimate: "~3 min",
        tab: "recurring",
      });
    }

    // Move 5: Set up goals (if none)
    if (goals.length === 0 && transactions.length > 0 && (tier === "paid" || tier === "premium")) {
      items.push({
        id: "set-goals",
        priority: 5,
        icon: "🎯",
        title: "Set your first goal",
        impact: "Get a savings plan",
        timeEstimate: "~1 min",
        tab: "goals",
      });
    }

    // Move 6: Card safety setup (if not set)
    if (!cardSafety && transactions.length > 0 && (tier === "paid" || tier === "premium")) {
      items.push({
        id: "setup-card",
        priority: 6,
        icon: "🛡️",
        title: "Set up card safety",
        impact: "Never pay interest",
        timeEstimate: "~1 min",
        tab: "card-safety",
      });
    }

    // Move 7: Import statement (if no transactions)
    if (transactions.length === 0) {
      items.push({
        id: "import-first",
        priority: 0,
        icon: "📄",
        title: "Import your first statement",
        impact: "See spending truth",
        timeEstimate: "~30 sec",
        tab: "import",
      });
    }

    // Move 8: Explore analytics (fallback)
    if (items.length < 3 && transactions.length > 0) {
      items.push({
        id: "explore-analytics",
        priority: 10,
        icon: "📊",
        title: "Check spending breakdown",
        impact: "Find savings",
        timeEstimate: "~1 min",
        tab: "analytics",
      });
    }

    // Move 9: Import more statements (fallback)
    if (items.length < 3 && transactions.length > 0) {
      items.push({
        id: "import-more",
        priority: 11,
        icon: "➕",
        title: "Import previous months",
        impact: "See trends",
        timeEstimate: "~30 sec",
        tab: "import",
      });
    }

    // Sort by priority and take top 3
    return items.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [transactions, goals, cardSafety, tier, recurring]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Your top 3 moves</h2>
      
      <div className="divide-y divide-border rounded-xl border bg-card overflow-hidden">
        {moves.map((move, index) => (
          <button
            key={move.id}
            onClick={() => onNavigate(move.tab)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3.5 text-left transition-all",
              "hover:bg-muted/50 group",
              index === 0 && "bg-primary/5"
            )}
          >
            {/* Priority number */}
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
              index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {index + 1}
            </div>

            {/* Icon */}
            <span className="text-xl shrink-0 transition-transform group-hover:scale-110">
              {move.icon}
            </span>

            {/* Title */}
            <span className={cn(
              "font-medium flex-1 min-w-0 break-words",
              index === 0 && "text-foreground"
            )}>
              {move.title}
            </span>

            {/* Impact */}
            <span className={cn(
              "text-xs md:text-sm font-semibold shrink-0 whitespace-nowrap ml-2",
              index === 0 ? "text-primary" : "text-green-600 dark:text-green-400"
            )}>
              {move.impact}
            </span>

            {/* Time estimate */}
            <span className="text-xs text-muted-foreground shrink-0 w-12 md:w-16 text-right whitespace-nowrap">
              {move.timeEstimate}
            </span>

            {/* Arrow */}
            <svg 
              className="w-4 h-4 text-muted-foreground/50 shrink-0 transition-transform group-hover:translate-x-0.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
