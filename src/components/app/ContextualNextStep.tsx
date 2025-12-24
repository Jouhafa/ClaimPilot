"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContextualNextStepProps {
  message: string;
  nextAction: string;
  nextTab: string;
  onNavigate: (tab: string) => void;
  variant?: "success" | "info" | "celebrate";
  autoDismiss?: number; // milliseconds
  showConfetti?: boolean;
}

export function ContextualNextStep({
  message,
  nextAction,
  nextTab,
  onNavigate,
  variant = "success",
  autoDismiss,
  showConfetti = false,
}: ContextualNextStepProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Trigger entrance animation
    const animTimer = setTimeout(() => setIsAnimating(false), 500);
    
    // Auto-dismiss if specified
    let dismissTimer: NodeJS.Timeout;
    if (autoDismiss) {
      dismissTimer = setTimeout(() => {
        setIsVisible(false);
      }, autoDismiss);
    }

    return () => {
      clearTimeout(animTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [autoDismiss]);

  if (!isVisible) return null;

  const variantStyles = {
    success: {
      bg: "bg-gradient-to-r from-green-500/10 to-emerald-500/5 border-green-500/30",
      icon: "text-green-500",
      iconBg: "bg-green-500/20",
    },
    info: {
      bg: "bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border-blue-500/30",
      icon: "text-blue-500",
      iconBg: "bg-blue-500/20",
    },
    celebrate: {
      bg: "bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-orange-500/10 border-amber-500/30",
      icon: "text-amber-500",
      iconBg: "bg-amber-500/20",
    },
  };

  const styles = variantStyles[variant];

  const getIcon = () => {
    switch (variant) {
      case "success":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "celebrate":
        return <span className="text-2xl">🎉</span>;
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <Card 
      className={cn(
        styles.bg,
        "border transition-all duration-500",
        isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
      )}
    >
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className={cn("p-2.5 rounded-xl", styles.iconBg, styles.icon)}>
            {getIcon()}
          </div>
          <div className="flex-1">
            <p className="font-semibold">{message}</p>
            <p className="text-sm text-muted-foreground mt-0.5">What&apos;s next?</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => onNavigate(nextTab)}>
              {nextAction}
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1.5 rounded-lg hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Specific next step components for common flows
interface FlowNextStepProps {
  onNavigate: (tab: string) => void;
  count?: number;
  total?: number;
}

export function AfterImportNextStep({ onNavigate, count }: FlowNextStepProps) {
  return (
    <ContextualNextStep
      message={`${count} transactions imported successfully!`}
      nextAction="Review Suggestions"
      nextTab="review"
      onNavigate={onNavigate}
      variant="success"
    />
  );
}

export function AfterReviewNextStep({ onNavigate, count }: FlowNextStepProps) {
  return (
    <ContextualNextStep
      message={`All ${count} suggestions approved!`}
      nextAction="Track Reimbursements"
      nextTab="reimbursements"
      onNavigate={onNavigate}
      variant="success"
    />
  );
}

export function AfterTaggingNextStep({ onNavigate, count }: FlowNextStepProps) {
  return (
    <ContextualNextStep
      message={`${count} items marked as reimbursable`}
      nextAction="View Claims"
      nextTab="reimbursements"
      onNavigate={onNavigate}
      variant="info"
    />
  );
}

export function AfterSubmitNextStep({ onNavigate, total }: FlowNextStepProps) {
  return (
    <ContextualNextStep
      message={`Batch submitted! ${total?.toLocaleString()} AED pending`}
      nextAction="Check Card Safety"
      nextTab="card-safety"
      onNavigate={onNavigate}
      variant="success"
    />
  );
}

export function AfterGoalSetNextStep({ onNavigate }: FlowNextStepProps) {
  return (
    <ContextualNextStep
      message="Goal created! Let's plan how to reach it"
      nextAction="View Action Plan"
      nextTab="action-plan"
      onNavigate={onNavigate}
      variant="celebrate"
    />
  );
}

export function AllDoneNextStep({ onNavigate }: FlowNextStepProps) {
  return (
    <ContextualNextStep
      message="You're all caught up! Great job 🌟"
      nextAction="Explore Analytics"
      nextTab="analytics"
      onNavigate={onNavigate}
      variant="celebrate"
    />
  );
}

