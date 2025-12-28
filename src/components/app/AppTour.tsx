"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface TourStep {
  id: string;
  title: string;
  description: string;
  targetTab?: string;
  highlight?: string;
  position: "center" | "bottom-right" | "top-right";
  action?: "click" | "view";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to ClaimPilot! 👋",
    description: "Your personal financial co-pilot. Let me show you around in 60 seconds.",
    position: "center",
  },
  {
    id: "import",
    title: "1️⃣ Import Your Statements",
    description: "Upload bank statements (PDF, CSV, Excel) from any bank. We'll auto-detect the format and parse your transactions.",
    targetTab: "import",
    position: "bottom-right",
  },
  {
    id: "review",
    title: "2️⃣ Review Smart Suggestions",
    description: "Our AI auto-tags transactions as reimbursable, personal, or needs review. Approve with one click or customize.",
    targetTab: "review",
    position: "bottom-right",
  },
  {
    id: "analytics",
    title: "3️⃣ Understand Your Spending",
    description: "See where your money goes with category breakdowns, trends, and anomaly detection. This is your spending truth.",
    targetTab: "analytics",
    position: "bottom-right",
  },
  {
    id: "recurring",
    title: "4️⃣ Track Subscriptions",
    description: "We automatically detect recurring charges like Netflix, gym, and utilities. Never miss a subscription again.",
    targetTab: "recurring",
    position: "bottom-right",
  },
  {
    id: "goals",
    title: "5️⃣ Set Financial Goals",
    description: "Plan for a car, emergency fund, or vacation. We'll tell you if you're on track and how much to save monthly.",
    targetTab: "goals",
    position: "bottom-right",
  },
  {
    id: "buckets",
    title: "6️⃣ Budget with Buckets",
    description: "Organize spending into Needs (50%), Wants (30%), and Savings (20%). The classic 50/30/20 rule, automated.",
    targetTab: "buckets",
    position: "bottom-right",
  },
  {
    id: "reimbursements",
    title: "7️⃣ Track Reimbursements",
    description: "Group business expenses into batches, track submission status, and never lose track of money owed to you.",
    targetTab: "reimbursements",
    position: "bottom-right",
  },
  {
    id: "card-safety",
    title: "8️⃣ Avoid Interest Charges",
    description: "Input your credit card statement and due date. We'll calculate exactly what to pay to avoid interest.",
    targetTab: "card-safety",
    position: "bottom-right",
  },
  {
    id: "export",
    title: "9️⃣ Export Reports",
    description: "Download finance-ready reports in CSV, Excel, or PDF format. Perfect for expense reports or record keeping.",
    targetTab: "export",
    position: "bottom-right",
  },
  {
    id: "complete",
    title: "You're Ready! 🎉",
    description: "Start by importing a statement or explore the demo data. Your financial clarity journey begins now.",
    position: "center",
  },
];

interface AppTourProps {
  onNavigate: (tab: string) => void;
  currentTab: string;
}

export function AppTour({ onNavigate, currentTab }: AppTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(true); // Start hidden, will check localStorage

  useEffect(() => {
    // Check if user has seen the tour
    const seen = localStorage.getItem("claimpilot_tour_seen");
    if (!seen) {
      setHasSeenTour(false);
    }
  }, []);

  const startTour = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
    onNavigate("import");
  }, [onNavigate]);

  const endTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem("claimpilot_tour_seen", "true");
    setHasSeenTour(true);
  }, []);

  const nextStep = useCallback(() => {
    const next = currentStep + 1;
    if (next >= TOUR_STEPS.length) {
      endTour();
    } else {
      setCurrentStep(next);
      const step = TOUR_STEPS[next];
      if (step.targetTab) {
        onNavigate(step.targetTab);
      }
    }
  }, [currentStep, endTour, onNavigate]);

  const prevStep = useCallback(() => {
    const prev = currentStep - 1;
    if (prev >= 0) {
      setCurrentStep(prev);
      const step = TOUR_STEPS[prev];
      if (step.targetTab) {
        onNavigate(step.targetTab);
      }
    }
  }, [currentStep, onNavigate]);

  const skipTour = useCallback(() => {
    endTour();
  }, [endTour]);

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  // Show tour prompt for new users
  if (!hasSeenTour && !isActive) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full animate-in fade-in zoom-in duration-300">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🚀</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to ClaimPilot!</h2>
            <p className="text-muted-foreground mb-6">
              Take a quick 60-second tour to learn how to track expenses, manage reimbursements, and reach your financial goals.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={skipTour}>
                Skip for now
              </Button>
              <Button className="flex-1" onClick={startTour}>
                Start Tour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tour is not active
  if (!isActive) {
    return (
      <button
        onClick={startTour}
        className="hidden md:flex fixed bottom-4 left-4 z-40 items-center gap-2 px-3 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg hover:bg-primary/90 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Take a Tour
      </button>
    );
  }

  // Active tour overlay
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40"
        onClick={skipTour}
      />
      
      {/* Tour card */}
      <div 
        className={`fixed z-50 w-96 max-w-[calc(100vw-2rem)] ${
          step.position === "center" 
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            : step.position === "bottom-right"
            ? "bottom-24 right-4"
            : "top-24 right-4"
        }`}
      >
        <Card className="shadow-2xl border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardContent className="pt-4">
            {/* Progress */}
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="text-xs">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </Badge>
              <button 
                onClick={skipTour}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Skip
              </button>
            </div>
            <Progress value={progress} className="h-1 mb-4" />
            
            {/* Content */}
            <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
            <p className="text-muted-foreground text-sm mb-4">{step.description}</p>
            
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                ← Back
              </Button>
              <Button size="sm" onClick={nextStep}>
                {currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next →"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Highlight indicator */}
      {step.targetTab && (
        <div className="fixed left-64 top-0 w-[calc(100%-16rem)] h-full pointer-events-none z-45">
          <div className="absolute inset-4 border-2 border-primary/30 rounded-xl animate-pulse" />
        </div>
      )}
    </>
  );
}

// Mini tour for specific features
interface FeatureTipProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function FeatureTip({ id, title, description, children }: FeatureTipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(`tip_${id}_dismissed`);
    if (!dismissed) {
      setIsDismissed(false);
      // Show tip after a delay
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [id]);

  const dismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem(`tip_${id}_dismissed`, "true");
  };

  if (isDismissed) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      {isVisible && (
        <div className="absolute top-full left-0 mt-2 z-50 w-64">
          <Card className="shadow-lg border-primary/20 animate-in fade-in slide-in-from-top-2">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </div>
                <button 
                  onClick={dismiss}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Quick tips that show contextually
export const QUICK_TIPS = {
  import: "💡 Drag & drop files or click to browse. We support CSV, Excel, and PDF from any bank.",
  review: "💡 Click 'Approve All High Confidence' to quickly tag trusted suggestions.",
  transactions: "💡 Press 'R' for Reimbursable, 'P' for Personal, or 'I' for Ignore while a row is selected.",
  analytics: "💡 This is your 'spending truth' - see exactly where money goes each month.",
  goals: "💡 Start with an emergency fund (3-6 months expenses), then add other goals.",
  buckets: "💡 The 50/30/20 rule: 50% Needs, 30% Wants, 20% Savings. We auto-calculate based on your spending.",
  reimbursements: "💡 Create batches to group expenses by trip or project. Makes tracking and submission easier.",
  "card-safety": "💡 Pay the full statement balance by due date to avoid interest. We'll calculate exactly what you need.",
  export: "💡 Use the Simple preset for basic reports, or Finance Team preset for detailed breakdowns.",
};

