"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppProvider, useApp } from "@/lib/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ImportTab } from "./ImportTab";
import { TransactionsTab } from "./TransactionsTab";
import { ReviewTab } from "./ReviewTab";
import { ReimbursementsTab } from "./ReimbursementsTab";
import { CardSafetyTab } from "./CardSafetyTab";
import { ExportTab } from "./ExportTab";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { RecurringTab } from "./RecurringTab";
import { GoalsTab } from "./GoalsTab";
import { BucketsTab } from "./BucketsTab";
import { ActionPlanTab } from "./ActionPlanTab";
import { InvestmentPolicyTab } from "./InvestmentPolicyTab";
import { PaywallGate } from "./PaywallGate";
import { DevTierTester } from "./DevTierTester";
import { AppTour } from "./AppTour";
import { DemoModeIndicator } from "./DemoDataLoader";
import { HomeDashboard } from "./HomeDashboard";
import { getAutoTagStats } from "@/lib/autoTagger";
import type { LicenseTier } from "@/lib/types";

type TabId = "home" | "import" | "review" | "transactions" | "reimbursements" | "recurring" | "analytics" | "goals" | "buckets" | "action-plan" | "investments" | "card-safety" | "export";

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  requiredTier?: LicenseTier;
  unlockCondition?: "always" | "hasTransactions" | "hasReviewed" | "hasGoals";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Month selector component
function MonthSelector({ selectedMonth, onMonthChange }: { 
  selectedMonth: Date; 
  onMonthChange: (date: Date) => void;
}) {
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const goToPrevMonth = () => {
    const prev = new Date(selectedMonth);
    prev.setMonth(prev.getMonth() - 1);
    onMonthChange(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(selectedMonth);
    next.setMonth(next.getMonth() + 1);
    onMonthChange(next);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedMonth.getMonth() === now.getMonth() && 
           selectedMonth.getFullYear() === now.getFullYear();
  };

  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-1">
      <button
        onClick={goToPrevMonth}
        className="p-1.5 hover:bg-muted rounded transition-colors"
        title="Previous month"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="px-2 py-1 text-sm font-medium min-w-[90px] text-center">
        {formatMonth(selectedMonth)}
      </span>
      <button
        onClick={goToNextMonth}
        disabled={isCurrentMonth()}
        className={cn(
          "p-1.5 rounded transition-colors",
          isCurrentMonth() ? "opacity-30 cursor-not-allowed" : "hover:bg-muted"
        )}
        title="Next month"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { transactions, goals, tier, hasAccess } = useApp();
  const searchParams = useSearchParams();

  // Check if dev mode is enabled via ?dev=1
  const isDevMode = searchParams.get("dev") === "1";

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Single key shortcuts
      switch (e.key.toLowerCase()) {
        case "h":
          setActiveTab("home");
          break;
        case "i":
          setActiveTab("import");
          break;
        case "r":
          setActiveTab("reimbursements");
          break;
        case "t":
          setActiveTab("transactions");
          break;
        case "a":
          setActiveTab("analytics");
          break;
        case "g":
          setActiveTab("goals");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Calculate unlock states for progressive nav
  const unlockState = useMemo(() => {
    const hasTransactions = transactions.length > 0;
    const autoTagStats = getAutoTagStats(transactions);
    const hasReviewed = transactions.some(t => t.tag && !t.suggestedTag);
    const hasGoals = goals.length > 0;
    const hasReimbursements = transactions.some(t => t.tag === "reimbursable" && t.status !== "draft");

    return {
      hasTransactions,
      hasReviewed,
      hasGoals,
      hasReimbursements,
    };
  }, [transactions, goals]);

  // Calculate badge for Review tab
  const autoTagStats = getAutoTagStats(transactions);
  const reviewBadgeCount = autoTagStats.needsReviewCount;

  // Draft reimbursements count
  const draftReimbursementsCount = transactions.filter(
    t => t.tag === "reimbursable" && t.status === "draft"
  ).length;

  // Navigation callback - also closes sidebar on mobile
  const handleNavigate = useCallback((tab: string) => {
    setActiveTab(tab as TabId);
    setSidebarOpen(false);
  }, []);

  // Check if nav item is unlocked
  const isNavItemUnlocked = (condition?: string) => {
    if (!condition || condition === "always") return true;
    switch (condition) {
      case "hasTransactions":
        return unlockState.hasTransactions;
      case "hasReviewed":
        return unlockState.hasReviewed;
      case "hasGoals":
        return unlockState.hasGoals;
      default:
        return true;
    }
  };

  // Grouped navigation structure with progressive unlock
  const navGroups: NavGroup[] = [
    {
      label: "",
      items: [
        {
          id: "home",
          label: "Home",
          unlockCondition: "always",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          id: "import",
          label: "Import",
          unlockCondition: "always",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "MANAGE",
      items: [
        {
          id: "review",
          label: "Tag & Categorize",
          badge: reviewBadgeCount > 0 ? reviewBadgeCount : undefined,
          unlockCondition: "hasTransactions",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          ),
        },
        {
          id: "transactions",
          label: "All Transactions",
          unlockCondition: "hasTransactions",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "TRACK",
      items: [
        {
          id: "reimbursements",
          label: "Reimbursements",
          badge: draftReimbursementsCount > 0 ? draftReimbursementsCount : undefined,
          requiredTier: "paid",
          unlockCondition: "hasReviewed",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
        },
        {
          id: "card-safety",
          label: "Card Safety",
          requiredTier: "paid",
          unlockCondition: "hasReviewed",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
        {
          id: "recurring",
          label: "Subscriptions",
          unlockCondition: "hasTransactions",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "PLAN",
      items: [
        {
          id: "analytics",
          label: "Spending Insights",
          unlockCondition: "hasTransactions",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          id: "goals",
          label: "Goals",
          requiredTier: "paid",
          unlockCondition: "hasReviewed",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          ),
        },
        {
          id: "buckets",
          label: "Budget Buckets",
          requiredTier: "paid",
          unlockCondition: "hasGoals",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "PREMIUM",
      items: [
        {
          id: "action-plan",
          label: "Monthly Playbook",
          requiredTier: "premium",
          unlockCondition: "hasGoals",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
        },
        {
          id: "investments",
          label: "Investment Policy",
          requiredTier: "premium",
          unlockCondition: "hasGoals",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "",
      items: [
        {
          id: "export",
          label: "Export & Settings",
          unlockCondition: "hasTransactions",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeDashboard onNavigate={handleNavigate} />;
      case "import":
        return <ImportTab onImportSuccess={() => handleNavigate("review")} />;
      case "review":
        return <ReviewTab />;
      case "transactions":
        return <TransactionsTab />;
      case "reimbursements":
        return (
          <PaywallGate
            feature="reimbursement-tracker"
            requiredTier="paid"
            title="Reimbursements"
            description="Track claim status and batch submissions"
          >
            <ReimbursementsTab />
          </PaywallGate>
        );
      case "recurring":
        return <RecurringTab />;
      case "analytics":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Spending Insights</h1>
              <p className="text-muted-foreground mt-2">
                Full visibility into where your money goes
              </p>
            </div>
            <AnalyticsDashboard />
          </div>
        );
      case "goals":
        return (
          <PaywallGate
            feature="goals"
            requiredTier="paid"
            title="Financial Goals"
            description="Set goals, track progress, and get feasibility calculations"
          >
            <GoalsTab />
          </PaywallGate>
        );
      case "buckets":
        return (
          <PaywallGate
            feature="buckets"
            requiredTier="paid"
            title="Budget Buckets"
            description="Organize your money into Needs, Wants, and Goals"
          >
            <BucketsTab />
          </PaywallGate>
        );
      case "action-plan":
        return (
          <PaywallGate
            feature="action-plan"
            requiredTier="premium"
            title="Monthly Playbook"
            description="Your personalized 30-day financial action plan"
          >
            <ActionPlanTab />
          </PaywallGate>
        );
      case "investments":
        return (
          <PaywallGate
            feature="investment-policy"
            requiredTier="premium"
            title="Investment Policy"
            description="Build your investment strategy with risk-appropriate allocation"
          >
            <InvestmentPolicyTab />
          </PaywallGate>
        );
      case "card-safety":
        return (
          <PaywallGate
            feature="card-safety"
            requiredTier="paid"
            title="Card Safety"
            description="Calculate exactly what to pay to avoid interest"
          >
            <CardSafetyTab />
          </PaywallGate>
        );
      case "export":
        return <ExportTab />;
      default:
        return <HomeDashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col",
        "transform transition-transform duration-300 ease-in-out",
        "md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="font-semibold text-sidebar-foreground">ClaimPilot</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {/* Close button - mobile only */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <DemoModeIndicator />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {navGroups.map((group, groupIndex) => {
            // Check if any items in this group are unlocked
            const hasUnlockedItems = group.items.some(item => isNavItemUnlocked(item.unlockCondition));
            
            // Hide entire group if nothing is unlocked (except first group)
            if (!hasUnlockedItems && groupIndex > 0) return null;

            return (
              <div key={groupIndex} className={group.label ? "mb-4" : "mb-2"}>
                {group.label && hasUnlockedItems && (
                  <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3 mb-2">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isUnlocked = isNavItemUnlocked(item.unlockCondition);
                    
                    // Don't show locked items at all (progressive disclosure)
                    if (!isUnlocked) return null;

                    const itemFeature = item.id === "reimbursements" ? "reimbursement-tracker" 
                      : item.id === "investments" ? "investment-policy"
                      : item.id === "action-plan" ? "action-plan"
                      : item.id;
                    const isPaywallLocked = item.requiredTier && !hasAccess(itemFeature);
                    const isActive = activeTab === item.id;
                    
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            setActiveTab(item.id);
                            setSidebarOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary shadow-sm"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                            item.id === "home" && isActive && "bg-primary text-primary-foreground"
                          )}
                        >
                          <span className={cn(
                            "transition-colors",
                            isActive ? (item.id === "home" ? "text-primary-foreground" : "text-primary") : "text-sidebar-foreground/50"
                          )}>
                            {item.icon}
                          </span>
                          <span className="font-medium flex-1 text-sm">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className={cn(
                              "px-1.5 py-0.5 text-[10px] font-bold rounded-full min-w-[20px] text-center",
                              isActive 
                                ? "bg-primary-foreground/20 text-primary-foreground" 
                                : "bg-amber-500/20 text-amber-500"
                            )}>
                              {item.badge}
                            </span>
                          )}
                          {isPaywallLocked && item.requiredTier && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[9px] px-1.5 py-0 h-4",
                                item.requiredTier === "premium" 
                                  ? "bg-purple-500/10 text-purple-500 border-purple-500/20" 
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              )}
                            >
                              {item.requiredTier === "premium" ? "PRO" : "PAID"}
                            </Badge>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {groupIndex < navGroups.length - 1 && group.label && hasUnlockedItems && (
                  <div className="h-px bg-sidebar-border/50 mt-4" />
                )}
              </div>
            );
          })}
        </nav>

        {/* Keyboard shortcuts hint */}
        <div className="px-4 py-2 border-t border-sidebar-border/50">
          <p className="text-[10px] text-sidebar-foreground/40 text-center">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">H</kbd> Home · 
            <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] ml-1">T</kbd> Transactions · 
            <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] ml-1">R</kbd> Reimburse
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-transparent text-xs text-sidebar-foreground/70">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="font-medium text-sidebar-foreground">100% Local</p>
            </div>
            <p>Your data never leaves this device</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background md:ml-0">
        {/* Header with month selector */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 md:px-8 py-3">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              {/* Hamburger menu button - mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <MonthSelector 
                selectedMonth={selectedMonth} 
                onMonthChange={setSelectedMonth} 
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="hidden sm:inline">{transactions.length} transactions</span>
              <span className="sm:hidden">{transactions.length}</span>
            </div>
          </div>
        </header>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
      
      {/* Dev tier tester - only shows with ?dev=1 */}
      {isDevMode && <DevTierTester />}
      
      {/* Guided app tour */}
      <AppTour onNavigate={handleNavigate} currentTab={activeTab} />
    </div>
  );
}

export function AppShell() {
  return (
    <AppProvider>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }>
        <AppContent />
      </Suspense>
    </AppProvider>
  );
}
