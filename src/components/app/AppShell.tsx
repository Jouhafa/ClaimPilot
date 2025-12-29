"use client";

import { useState, useCallback, useMemo, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppProvider, useApp } from "@/lib/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TopNav } from "./TopNav";
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
import { CoachTab } from "./CoachTab";
import { PaywallGate } from "./PaywallGate";
import { DevTierTester } from "./DevTierTester";
import { AppTour } from "./AppTour";
import { DemoModeIndicator } from "./DemoDataLoader";
import { HomeDashboard } from "./HomeDashboard";
import { OnboardingWizard } from "./OnboardingWizard";
import { MonthlyRecapJourney } from "./MonthlyRecapJourney";
import { CustomWrapBuilder } from "./CustomWrapBuilder";
import { RecapsLibrary } from "./RecapsLibrary";
import { SettingsTab } from "./SettingsTab";
// import { ROITrackerTab } from "./ROITrackerTab"; // Locked - WIP
import { RemindersTab } from "./RemindersTab";
import { ReminderAlerts } from "./ReminderAlerts";
// import { ExpenseCoverageTab } from "./ExpenseCoverageTab"; // Locked - WIP
import { MobileNavModal } from "./MobileNavModal";
import { NotificationPanel, type Notification } from "./NotificationPanel";
import { getAutoTagStats } from "@/lib/autoTagger";
import type { LicenseTier, WrapSnapshot } from "@/lib/types";
import { generateMonthlyWrap } from "@/lib/wrapComputation";
import { saveWrapSnapshot } from "@/lib/storage";

type TabId = "hub" | "review" | "plan" | "coach" | "import" | "transactions" | "reimbursements" | "recurring" | "analytics" | "goals" | "buckets" | "action-plan" | "investments" | "card-safety" | "export" | "learn" | "create-wrap" | "recaps" | "settings" | "roi-tracker" | "reminders" | "expense-coverage";

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

function AppContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get initial tab from URL or default to hub
  const getInitialTab = (): TabId => {
    const tabFromUrl = searchParams.get("tab") as TabId | null;
    if (tabFromUrl && ["hub", "review", "plan", "coach", "import", "transactions", "reimbursements", "recurring", "analytics", "goals", "buckets", "action-plan", "investments", "card-safety", "export", "learn", "create-wrap", "recaps", "settings", "roi-tracker", "reminders", "expense-coverage"].includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return "hub";
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab());
  const [showMonthlyRecap, setShowMonthlyRecap] = useState(false);
  const [wrapSnapshot, setWrapSnapshot] = useState<WrapSnapshot | null>(null);
  const [wrapMonthKey, setWrapMonthKey] = useState<string | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [showMobileNavModal, setShowMobileNavModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { transactions, goals, buckets, tier, hasAccess } = useApp();

  // Track if we're updating from URL to prevent loops
  const isUpdatingFromUrl = useRef(false);

  // Sync URL when tab changes (only if not updating from URL)
  useEffect(() => {
    if (isUpdatingFromUrl.current) {
      isUpdatingFromUrl.current = false;
      return;
    }

    const currentTabFromUrl = searchParams.get("tab");
    const expectedTab = activeTab === "hub" ? null : activeTab;
    
    // Only update URL if it's different
    if (currentTabFromUrl !== expectedTab) {
      const params = new URLSearchParams(searchParams.toString());
      if (activeTab === "hub") {
        params.delete("tab");
      } else {
        params.set("tab", activeTab);
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      
      // Only replace if URL is actually different
      if (newUrl !== currentUrl) {
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [activeTab, pathname, router]);

  // Update tab when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as TabId | null;
    const validTabs: TabId[] = ["hub", "review", "plan", "coach", "import", "transactions", "reimbursements", "recurring", "analytics", "goals", "buckets", "action-plan", "investments", "card-safety", "export", "learn", "create-wrap", "recaps", "settings", "roi-tracker", "reminders", "expense-coverage"];
    
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      isUpdatingFromUrl.current = true;
      setActiveTab(tabFromUrl);
    } else if (!tabFromUrl && activeTab !== "hub") {
      isUpdatingFromUrl.current = true;
      setActiveTab("hub");
    }
  }, [searchParams, activeTab]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

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
          setActiveTab("hub");
          break;
        case "r":
          setActiveTab("review");
          break;
        case "p":
          setActiveTab("plan");
          break;
        case "c":
          setActiveTab("coach");
          break;
        case "i":
          setActiveTab("import");
          break;
        case "t":
          setActiveTab("transactions");
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

  // Navigation callback - updates both state and URL
  const handleNavigate = useCallback((tab: string) => {
    const tabId = tab as TabId;
    setActiveTab(tabId);
    // URL update is handled by the useEffect above
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

  // Wio-style minimal navigation: Hub, Review, Plan, Coach
  const primaryNavItems: NavItem[] = [
    {
      id: "hub",
      label: "Hub",
      unlockCondition: "always",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "review",
      label: "Review",
      badge: reviewBadgeCount > 0 ? reviewBadgeCount : undefined,
      unlockCondition: "hasTransactions",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "plan",
      label: "Plan",
      unlockCondition: "always",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "coach",
      label: "Coach",
      unlockCondition: "always",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ];

  const moreNavItems: NavItem[] = [
    {
      id: "transactions",
      label: "Transactions",
      unlockCondition: "hasTransactions",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: "buckets",
      label: "Buckets",
      requiredTier: "paid",
      unlockCondition: "hasGoals",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
    },
    {
      id: "analytics",
      label: "Insights",
      unlockCondition: "hasTransactions",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
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
      id: "recurring",
      label: "Subscriptions",
      unlockCondition: "hasTransactions",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
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
    {
      id: "create-wrap",
      label: "Create Wrap",
      unlockCondition: "hasTransactions",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      id: "recaps",
      label: "Recaps",
      unlockCondition: "hasTransactions",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: "reminders",
      label: "Reminders",
      unlockCondition: "hasTransactions",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
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
  ];

  // Handle import success - trigger monthly recap journey
  const handleImportSuccess = useCallback(() => {
    // Generate wrap for current month
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setWrapMonthKey(monthKey);
    setShowMonthlyRecap(true);
  }, []);

  const handleRecapComplete = useCallback(() => {
    setShowMonthlyRecap(false);
    setWrapSnapshot(null);
    setWrapMonthKey(undefined);
    handleNavigate("hub");
  }, [handleNavigate]);

  // Handle wrap playback from saved snapshot
  const handlePlayWrap = useCallback((snapshot: WrapSnapshot) => {
    setWrapSnapshot(snapshot);
    setShowMonthlyRecap(true);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "hub":
        return <HomeDashboard onNavigate={handleNavigate} onPlayWrap={handlePlayWrap} />;
      case "import":
        return <ImportTab onImportSuccess={handleImportSuccess} />;
      case "plan":
        return (
          <div className="space-y-4">
            <div>
              <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>Plan</h1>
              <p className="text-[15px] text-muted-foreground mt-2" style={{ lineHeight: 1.6 }}>Goals, Buckets, and Monthly Planning</p>
            </div>
            {/* One-screen summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PaywallGate
                feature="goals"
                requiredTier="paid"
                title="Financial Goals"
                description="Set goals, track progress, and get feasibility calculations"
              >
                <Card className="card-lift">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-[18px] font-semibold mb-1" style={{ fontWeight: 600 }}>Goals</h2>
                        <p className="text-[13px] text-muted-foreground">{goals.length} active goals</p>
                      </div>
                      <button
                        onClick={() => handleNavigate("goals")}
                        className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        View details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    {goals.length > 0 ? (
                      <div className="space-y-2">
                        {goals.slice(0, 2).map((goal) => (
                          <div key={goal.id} className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[14px] font-medium" style={{ fontWeight: 500 }}>{goal.name}</span>
                              <span className="text-[13px] text-muted-foreground">
                                {((goal.currentAmount / goal.targetAmount) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary progress-animated"
                                style={{ width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                        {goals.length > 2 && (
                          <p className="text-[12px] text-muted-foreground text-center">
                            +{goals.length - 2} more goals
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">No goals set yet</p>
                    )}
                  </CardContent>
                </Card>
              </PaywallGate>
              <PaywallGate
                feature="buckets"
                requiredTier="paid"
                title="Budget Buckets"
                description="Organize your money into Needs, Wants, and Goals"
              >
                <Card className="card-lift">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-[18px] font-semibold mb-1" style={{ fontWeight: 600 }}>Buckets</h2>
                        <p className="text-[13px] text-muted-foreground">{buckets.length} buckets configured</p>
                      </div>
                      <button
                        onClick={() => handleNavigate("buckets")}
                        className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        View details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    {buckets.length > 0 ? (
                      <div className="space-y-2">
                        {buckets.slice(0, 3).map((bucket) => (
                          <div key={bucket.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: bucket.color }}
                              />
                              <span className="text-[14px] font-medium" style={{ fontWeight: 500 }}>{bucket.name}</span>
                            </div>
                            <span className="text-[13px] text-muted-foreground">{bucket.targetPercentage}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">No buckets configured yet</p>
                    )}
                  </CardContent>
                </Card>
              </PaywallGate>
              {/* ROI Tracker Card - Locked (WIP) */}
              <Card className="card-lift opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[18px] font-semibold mb-1" style={{ fontWeight: 600 }}>ROI Tracker</h2>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                      <p className="text-[13px] text-muted-foreground">Track value recovered</p>
                    </div>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">This feature is currently under development</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {/* Expense Coverage Card - Locked (WIP) */}
              <Card className="card-lift opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[18px] font-semibold mb-1" style={{ fontWeight: 600 }}>Expense Coverage</h2>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                      <p className="text-[13px] text-muted-foreground">Find missing claims</p>
                    </div>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">This feature is currently under development</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case "review":
        return <ReviewTab onNavigate={handleNavigate} />;
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
            <AnalyticsDashboard onNavigate={handleNavigate} />
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
            <GoalsTab onNavigate={handleNavigate} />
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
            <BucketsTab onNavigate={handleNavigate} />
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
      case "create-wrap":
        return (
          <CustomWrapBuilder
            onComplete={(wrapId) => {
              // Load and play the wrap
              import("@/lib/storage").then(({ getWrapSnapshot }) => {
                getWrapSnapshot(wrapId).then((snapshot) => {
                  if (snapshot) {
                    handlePlayWrap(snapshot);
                  }
                });
              });
            }}
          />
        );
      case "recaps":
        return <RecapsLibrary onPlayWrap={handlePlayWrap} onNavigate={handleNavigate} />;
      case "settings":
        return <SettingsTab onNavigate={handleNavigate} />;
      case "roi-tracker":
        return (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
                ROI Tracker
              </h1>
              <p className="text-[15px] text-muted-foreground mt-2" style={{ lineHeight: 1.6 }}>
                Track value recovered from your financial tools
              </p>
            </div>
            <Card style={{ borderRadius: "16px" }} className="opacity-60">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Badge variant="secondary" className="mb-4">Coming Soon</Badge>
                  <p className="text-muted-foreground text-sm">
                    ROI Tracker is currently under development and will be available in a future update.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "reminders":
        return <RemindersTab />;
      case "expense-coverage":
        return (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
                Expense Coverage
              </h1>
              <p className="text-[15px] text-muted-foreground mt-2" style={{ lineHeight: 1.6 }}>
                Detect work expenses you forgot to claim
              </p>
            </div>
            <Card style={{ borderRadius: "16px" }} className="opacity-60">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Badge variant="secondary" className="mb-4">Coming Soon</Badge>
                  <p className="text-muted-foreground text-sm">
                    Expense Coverage is currently under development and will be available in a future update.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "learn":
      case "coach":
        return <CoachTab onNavigate={handleNavigate} />;
      default:
        return <HomeDashboard onNavigate={handleNavigate} onPlayWrap={handlePlayWrap} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar - Hidden on mobile */}
      <div className="hidden md:block">
        <TopNav 
          activeTab={activeTab} 
          onNavigate={handleNavigate}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onPlayWrap={(monthKey) => {
            setWrapMonthKey(monthKey);
            setWrapSnapshot(null);
            setShowMonthlyRecap(true);
          }}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-background h-screen md:h-screen">
        {/* Coach page - full screen */}
        {activeTab === "coach" || activeTab === "learn" ? (
          <div className="relative h-full overflow-hidden">
            {renderContent()}
          </div>
        ) : (
          <div className="h-full overflow-hidden">
            {/* Mobile: account for bottom nav (approx 88px), Desktop: full height */}
            <div className="h-full overflow-y-auto px-2 py-3 md:p-6 lg:p-8 max-w-[1120px] mx-auto pb-24 md:pb-8">
              {renderContent()}
            </div>
          </div>
        )}
      </main>
      
      {/* Mobile Bottom Navigation - Enhanced with rounded pill design */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 pb-6">
        <div className="relative">
          {/* Rounded pill container */}
          <div className="bg-background/95 backdrop-blur-md border-2 border-border rounded-full shadow-2xl px-2 py-2">
            <div className="grid grid-cols-4 gap-1">
              {primaryNavItems.map((item) => {
                const isUnlocked = isNavItemUnlocked(item.unlockCondition);
                if (!isUnlocked) return null;
                
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1 p-2 rounded-full transition-all duration-200",
                      isActive 
                        ? "bg-primary text-primary-foreground scale-105" 
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <span className={cn(
                      "transition-transform duration-200",
                      isActive ? "scale-110" : ""
                    )}>
                      {item.icon}
                    </span>
                    <span className="text-[9px] font-medium leading-tight">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-background shadow-md">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Floating buttons - Import and More */}
          <div className="absolute -top-12 left-0 right-0 flex items-center justify-center gap-3">
            {/* Import Button */}
            <button
              onClick={() => handleNavigate("import" as TabId)}
              className={cn(
                "w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-200",
                "hover:scale-110 active:scale-95",
                activeTab === "import" && "ring-4 ring-primary/30"
              )}
              aria-label="Import"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            
            {/* More/All Tabs Button */}
            <button
              onClick={() => setShowMobileNavModal(true)}
              className={cn(
                "w-12 h-12 rounded-full bg-muted border-2 border-border text-foreground shadow-lg flex items-center justify-center transition-all duration-200",
                "hover:scale-110 active:scale-95 hover:bg-muted/80",
                showMobileNavModal && "ring-4 ring-primary/30 bg-primary text-primary-foreground"
              )}
              aria-label="All tabs"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Modal */}
      <MobileNavModal
        isOpen={showMobileNavModal}
        onClose={() => setShowMobileNavModal(false)}
        onNavigate={handleNavigate}
        activeTab={activeTab}
        items={[...primaryNavItems, ...moreNavItems]}
        isNavItemUnlocked={isNavItemUnlocked}
        hasAccess={hasAccess}
      />

      {/* Dev tier tester - only shows with ?dev=1 */}
      {isDevMode && <DevTierTester />}
      
      {/* Guided app tour */}
      <AppTour onNavigate={handleNavigate} currentTab={activeTab} />
      
      {/* Onboarding wizard */}
      <OnboardingWizard onComplete={() => {}} />
      
      {/* Monthly Recap Journey */}
      {showMonthlyRecap && (
        <MonthlyRecapJourney 
          onComplete={handleRecapComplete}
          onSkip={handleRecapComplete}
          wrapSnapshot={wrapSnapshot}
          monthKey={wrapMonthKey}
        />
      )}

      {/* Reminder Alerts - checks and shows browser notifications */}
      <ReminderAlerts />

      {/* Notification Panel */}
      <NotificationPanel
        notifications={notifications}
        onDismiss={dismissNotification}
        onNavigate={handleNavigate}
      />
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
