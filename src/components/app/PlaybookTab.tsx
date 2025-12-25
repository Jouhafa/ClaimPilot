"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DemoDataLoader } from "./DemoDataLoader";

interface PlaybookTabProps {
  onNavigate?: (tab: string) => void;
}

interface PlaybookSection {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function PlaybookTab({ onNavigate }: PlaybookTabProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["home"]));

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const navigateTo = (tab: string) => {
    if (onNavigate) {
      // Extract just the tab name (before any ? or /)
      const tabName = tab.split("?")[0].split("/")[0];
      onNavigate(tabName);
    }
  };

  const sections: PlaybookSection[] = [
    {
      id: "home",
      title: "Your Money Playbook",
      subtitle: "A simple system: statements → clarity → goals → monthly plan",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-lg p-6 border border-primary/20">
            <h3 className="text-lg font-semibold mb-4">Quick Start (5 min)</h3>
            <ol className="space-y-3 list-decimal list-inside text-sm text-muted-foreground">
              <li className="text-foreground">Import statement</li>
              <li className="text-foreground">Tag reimbursements</li>
              <li className="text-foreground">Set 1 goal</li>
              <li className="text-foreground">Generate your plan</li>
            </ol>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigateTo("import")} className="flex-1 min-w-[140px]">
              Import statement →
            </Button>
            <DemoDataLoader variant="button" />
            <Button onClick={() => navigateTo("action-plan")} variant="outline" className="flex-1 min-w-[140px]">
              Generate first plan →
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "spending-truth",
      title: "What your statement is really telling you",
      subtitle: "Your statement is basically a story about your habits. We're just translating it.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              In 2 minutes you want to know:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>What are my top 3 categories?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>What are my top 10 merchants?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>What's recurring/subscriptions?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Am I spending more than I earn?</span>
              </li>
            </ul>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs">Example</Badge>
              <span className="text-sm font-medium">Alex, 26, Dubai</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3 italic">
              "I earn well but still feel broke sometimes."
            </p>
            <ul className="space-y-1.5 text-sm">
              <li>Rent: <span className="font-semibold">6,900 AED</span></li>
              <li>Dining + coffee: <span className="font-semibold">3,400 AED</span></li>
              <li>Transport: <span className="font-semibold">2,100 AED</span></li>
              <li>Subscriptions: <span className="font-semibold">220 AED</span></li>
              <li>Reimbursable travel pending: <span className="font-semibold text-amber-600">7,500 AED</span></li>
            </ul>
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs font-semibold mb-2">What ClaimPilot highlights:</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Biggest leak: Dining/Coffee (10% of income)</li>
                <li>• Floating reimbursements: 7,500 AED (money owed to you)</li>
                <li>• 1–2 subscriptions likely unused</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigateTo("analytics")} className="flex-1 min-w-[140px]">
              Open Analytics →
            </Button>
            <Button onClick={() => navigateTo("analytics")} variant="outline" className="flex-1 min-w-[140px]">
              See Top Merchants →
            </Button>
            <Button onClick={() => navigateTo("recurring")} variant="outline" className="flex-1 min-w-[140px]">
              Find Recurring Charges →
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "reimbursements",
      title: "Reimbursements are money you're owed",
      subtitle: "If you pay work stuff on your personal card, you're basically lending money.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Goal: keep everything in 3 states
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Draft</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="outline">Submitted</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Paid</Badge>
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-900/50">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-800">Example</Badge>
              <span className="text-sm font-medium">The interest trap</span>
            </div>
            <div className="space-y-2 text-sm">
              <p>Card due in 10 days: <span className="font-semibold">8,457 AED</span></p>
              <p>Pending reimbursements: <span className="font-semibold text-amber-600">7,500 AED</span></p>
              <p className="text-xs text-muted-foreground mt-3">
                If you ignore this, you might pay interest for no reason.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigateTo("reimbursements")} className="flex-1 min-w-[140px]">
              Open Reimbursements →
            </Button>
            <Button onClick={() => navigateTo("card-safety")} variant="outline" className="flex-1 min-w-[140px]">
              Check Card Safety →
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "buckets",
      title: "Buckets beat budgets",
      subtitle: "Budgets feel restrictive. Buckets feel like structure.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium mb-3">Starter buckets</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {["Bills", "Living", "Fun", "Buffer", "Goals", "Investing", "Debt payoff"].map((bucket) => (
                <Badge key={bucket} variant="outline" className="justify-center py-1.5">
                  {bucket}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-medium">Pick a template</p>
            <div className="grid gap-3">
              {[
                { name: "Balanced", desc: "Bills+Living 60% | Fun 15% | Buffer 10% | Goals 10% | Investing 5%" },
                { name: "Aggressive", desc: "Bills+Living 55% | Fun 10% | Buffer 10% | Goals 15% | Investing 10%" },
                { name: "Chill", desc: "Bills+Living 70% | Fun 15% | Buffer 10% | Goals/Invest 5%" },
              ].map((template) => (
                <div key={template.name} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                  <p className="text-sm font-semibold mb-1">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigateTo("buckets")} className="flex-1 min-w-[140px]">
              Set up buckets →
            </Button>
            <Button onClick={() => navigateTo("buckets")} variant="outline" className="flex-1 min-w-[140px]">
              Apply template →
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "credit-cards",
      title: "The Card Safety rule",
      subtitle: "Before the due date, pay enough to avoid interest. Then you can optimize.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium mb-3">Simple checklist</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>What is your statement balance?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>How much have you already paid?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Do you expect reimbursements before the due date?</span>
              </li>
            </ul>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs">Example</Badge>
              <span className="text-sm font-medium">Taxi → car isn't always cheaper</span>
            </div>
            <div className="space-y-2 text-sm">
              <p>Before car: Taxi 300/week ≈ <span className="font-semibold">1,200/month</span></p>
              <p>After car: fuel + parking + salik ≈ <span className="font-semibold">1,000–1,500/month</span></p>
              <p className="text-xs text-muted-foreground mt-3">
                It's not always a saving — it's a cost shift. Plan for it.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigateTo("card-safety")} className="flex-1 min-w-[140px]">
              Open Card Safety →
            </Button>
            <Button onClick={() => navigateTo("goals")} variant="outline" className="flex-1 min-w-[140px]">
              Add a car goal →
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "goals",
      title: "Goal math (no drama)",
      subtitle: "Every goal needs: target amount, deadline, monthly contribution",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-lg p-4 border border-primary/20">
            <p className="text-sm font-medium mb-2">Monthly needed = (Target − Current saved) ÷ Months</p>
            <p className="text-xs text-muted-foreground">
              Simple formula, honest results.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs">Example</Badge>
              <span className="text-sm font-medium">Home goal reality check</span>
            </div>
            <div className="space-y-2 text-sm">
              <p>Goal: <span className="font-semibold">200,000 AED</span> in 36 months</p>
              <p>Needed: <span className="font-semibold text-primary">~5,550 AED/month</span></p>
              <p className="text-xs text-muted-foreground mt-3 mb-2">If you can't hit it, adjust one lever:</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• extend timeline</li>
                <li>• reduce target</li>
                <li>• reduce fun spend a bit</li>
                <li>• increase income</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigateTo("goals")} className="flex-1 min-w-[140px]">
              Create a goal →
            </Button>
            <Button onClick={() => navigateTo("goals")} variant="outline" className="flex-1 min-w-[140px]">
              Run feasibility →
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "investing",
      title: "Boring investing wins",
      subtitle: "This isn't stock-picking. It's building a machine.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium mb-3">3 questions</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>When do you need the money?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Can you handle a dip without panic-selling?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Are you diversified?</span>
              </li>
            </ul>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground italic">
              Educational only. Not financial advice.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigateTo("investments")} className="flex-1 min-w-[140px]">
              Set investment policy →
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "monthly-routine",
      title: "The 30-minute monthly reset",
      subtitle: "Your monthly financial routine",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="grid gap-4">
            {[
              { week: "Week 1", task: "Review spend" },
              { week: "Week 2", task: "Cancel leaks + check recurring" },
              { week: "Week 3", task: "Submit reimbursements + Card Safety" },
              { week: "Week 4", task: "Fund goals + invest + plan next month" },
            ].map((item) => (
              <div key={item.week} className="flex items-center gap-4 bg-muted/30 rounded-lg p-3 border border-border/50">
                <Badge variant="outline" className="shrink-0">{item.week}</Badge>
                <span className="text-sm flex-1">{item.task}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigateTo("action-plan")} className="flex-1 min-w-[140px]">
              Generate this month's plan →
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "what-to-expect",
      title: "What to expect",
      subtitle: "Trust builder",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-base">What happens after you import</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0 bg-green-500/10 text-green-600 border-green-500/20">Instant</Badge>
                <span>spending breakdown + top merchants + recurring detection</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">2 min</Badge>
                <span>tag reimbursable/personal/ignore</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">5 min</Badge>
                <span>set goals + bucket targets</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0">10 min</Badge>
                <span>monthly plan with exact numbers</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">What the app won't do</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>won't magically raise your income</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>won't pick stocks like a wizard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>won't be perfect day 1 — your rules make it smarter over time</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Money Playbook</h1>
        <p className="text-muted-foreground mt-2">
          A simple system: statements → clarity → goals → monthly plan
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const isHome = section.id === "home";

          return (
            <Card
              key={section.id}
              className={cn(
                "transition-all duration-300 overflow-hidden",
                isExpanded && "shadow-md",
                isHome && "border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent"
              )}
            >
              <CardHeader
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => !isHome && toggleSection(section.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      isHome ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {section.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      {section.subtitle && (
                        <CardDescription className="mt-1.5">
                          {section.subtitle}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  {!isHome && (
                    <button
                      className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(section.id);
                      }}
                    >
                      <svg
                        className={cn(
                          "w-5 h-5 transition-transform duration-300",
                          isExpanded && "rotate-180"
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
              </CardHeader>
              {(isExpanded || isHome) && (
                <CardContent
                  className={cn(
                    "transition-all duration-300",
                    isExpanded || isHome ? "opacity-100 max-h-[2000px]" : "opacity-0 max-h-0 overflow-hidden"
                  )}
                >
                  {section.content}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

