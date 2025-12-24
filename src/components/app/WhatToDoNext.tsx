"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { getAutoTagStats } from "@/lib/autoTagger";

interface WhatToDoNextProps {
  onNavigate: (tab: string) => void;
}

interface ActionCard {
  id: string;
  priority: number;
  title: string;
  description: string;
  action: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  badge?: string | number;
  tab: string;
}

export function WhatToDoNext({ onNavigate }: WhatToDoNextProps) {
  const { transactions, goals, cardSafety, tier } = useApp();

  const actionCards = useMemo(() => {
    const cards: ActionCard[] = [];
    const autoTagStats = getAutoTagStats(transactions);

    // Priority 1: No transactions - import first
    if (transactions.length === 0) {
      cards.push({
        id: "import",
        priority: 1,
        title: "Import your first statement",
        description: "Upload a bank statement to get started with expense tracking",
        action: "Import Now",
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        ),
        color: "text-primary",
        bgColor: "bg-primary/10",
        tab: "import",
      });
    }

    // Priority 2: Unreviewed tags
    if (autoTagStats.needsReviewCount > 0) {
      cards.push({
        id: "review",
        priority: 2,
        title: "Review smart suggestions",
        description: `${autoTagStats.needsReviewCount} transactions need your approval`,
        action: "Review Now",
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        badge: autoTagStats.needsReviewCount,
        tab: "review",
      });
    }

    // Priority 3: Draft reimbursements
    const draftReimbursements = transactions.filter(
      t => t.tag === "reimbursable" && t.status === "draft"
    );
    if (draftReimbursements.length > 0) {
      const total = draftReimbursements.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      cards.push({
        id: "reimbursements",
        priority: 3,
        title: "Submit reimbursements",
        description: `${draftReimbursements.length} claims worth ${total.toLocaleString()} AED ready to submit`,
        action: "Track Claims",
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        badge: draftReimbursements.length,
        tab: "reimbursements",
      });
    }

    // Priority 4: No goals set
    if (goals.length === 0 && transactions.length > 0 && (tier === "paid" || tier === "premium")) {
      cards.push({
        id: "goals",
        priority: 4,
        title: "Set your first goal",
        description: "Create a savings goal to track your progress",
        action: "Set Goal",
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        ),
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        tab: "goals",
      });
    }

    // Priority 5: Card safety not set
    if (!cardSafety && transactions.length > 0 && (tier === "paid" || tier === "premium")) {
      cards.push({
        id: "card-safety",
        priority: 5,
        title: "Set up card safety",
        description: "Enter your card details to avoid interest charges",
        action: "Set Up",
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        tab: "card-safety",
      });
    }

    // Priority 6: Card payment due soon
    if (cardSafety?.dueDate) {
      const dueDate = new Date(cardSafety.dueDate);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const remaining = cardSafety.statementBalance - (cardSafety.paymentsMade || 0);
      
      if (daysUntilDue <= 7 && daysUntilDue > 0 && remaining > 0) {
        cards.push({
          id: "card-due",
          priority: 2.5, // High priority if due soon
          title: "Card payment due soon",
          description: `Pay ${remaining.toLocaleString()} AED in ${daysUntilDue} days to avoid interest`,
          action: "View Details",
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          badge: `${daysUntilDue}d`,
          tab: "card-safety",
        });
      }
    }

    // Priority 7: Explore insights (when everything is done)
    if (cards.length === 0 && transactions.length > 0) {
      cards.push({
        id: "analytics",
        priority: 7,
        title: "Explore your spending",
        description: "See detailed breakdowns and trends",
        action: "View Analytics",
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        color: "text-indigo-500",
        bgColor: "bg-indigo-500/10",
        tab: "analytics",
      });

      // Add import more if they want
      cards.push({
        id: "import-more",
        priority: 8,
        title: "Import more statements",
        description: "Add previous months for better insights",
        action: "Import",
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
        color: "text-gray-500",
        bgColor: "bg-gray-500/10",
        tab: "import",
      });
    }

    // Sort by priority
    return cards.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [transactions, goals, cardSafety, tier]);

  if (actionCards.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">What to do next</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actionCards.map((card, index) => (
          <Card
            key={card.id}
            className={`group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
              index === 0 ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" : ""
            }`}
            onClick={() => onNavigate(card.tab)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.color} transition-transform group-hover:scale-110`}>
                  {card.icon}
                </div>
                {card.badge && (
                  <Badge variant="secondary" className={`${card.bgColor} ${card.color} border-0`}>
                    {card.badge}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold mb-1">{card.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{card.description}</p>
              <Button 
                variant={index === 0 ? "default" : "outline"} 
                size="sm" 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              >
                {card.action}
                <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

