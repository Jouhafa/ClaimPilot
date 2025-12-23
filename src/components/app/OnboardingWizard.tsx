"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
}

const ONBOARDING_KEY = "claimpilot_onboarding_dismissed";

export function OnboardingWizard() {
  const { transactions } = useApp();
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash
  const [isVisible, setIsVisible] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(ONBOARDING_KEY);
    if (!dismissed) {
      setIsDismissed(false);
      setIsVisible(true);
    }
  }, []);

  const taggedCount = transactions.filter((t) => t.tag).length;
  const reimbursableCount = transactions.filter((t) => t.tag === "reimbursable").length;

  const steps: OnboardingStep[] = [
    {
      id: "import",
      title: "Import Statement",
      description: "Upload your credit card statement or try demo data",
      isComplete: transactions.length > 0,
    },
    {
      id: "tag",
      title: "Tag 10 Transactions",
      description: "Mark items as Reimbursable, Personal, or Ignore",
      isComplete: taggedCount >= 10,
    },
    {
      id: "review",
      title: "Review Claims",
      description: "Check your reimbursables in the pipeline",
      isComplete: reimbursableCount >= 1,
    },
    {
      id: "export",
      title: "Export Report",
      description: "Download finance-ready CSV or Excel",
      isComplete: false, // We can't easily track this
    },
  ];

  const completedSteps = steps.filter((s) => s.isComplete).length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsVisible(false);
    setTimeout(() => setIsDismissed(true), 300); // Wait for animation
  };

  if (isDismissed) return null;

  return (
    <div className={`transition-all duration-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}>
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Start Guide
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Complete these steps to get the most out of ClaimPilot
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-primary">{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`relative p-3 rounded-lg border transition-colors ${
                  step.isComplete 
                    ? "border-green-500/30 bg-green-500/5" 
                    : "border-border bg-card/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.isComplete 
                      ? "bg-green-500 text-white" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {step.isComplete ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${step.isComplete ? "text-green-500" : ""}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {completedSteps === steps.length - 1 && (
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-center">
                <span className="font-semibold text-primary">Almost there!</span>
                {" "}Export your report to complete the workflow.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

