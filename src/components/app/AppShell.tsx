"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AppProvider, useApp } from "@/lib/context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ImportTab } from "./ImportTab";
import { TransactionsTab } from "./TransactionsTab";
import { ReviewTab } from "./ReviewTab";
import { ReimbursementsTab } from "./ReimbursementsTab";
import { CardSafetyTab } from "./CardSafetyTab";
import { ExportTab } from "./ExportTab";
import { OnboardingWizard } from "./OnboardingWizard";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { getAutoTagStats } from "@/lib/autoTagger";

type TabId = "import" | "review" | "transactions" | "reimbursements" | "analytics" | "card-safety" | "export";

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
  badge?: number;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("import");
  const { transactions } = useApp();

  // Calculate badge for Review tab
  const autoTagStats = getAutoTagStats(transactions);
  const reviewBadgeCount = autoTagStats.needsReviewCount;

  // Navigation callback for ImportTab
  const navigateToReview = useCallback(() => {
    setActiveTab("review");
  }, []);

  const navItems: NavItem[] = [
    {
      id: "import",
      label: "Import",
      description: "Upload your bank statement",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
    {
      id: "review",
      label: "Review",
      description: "Approve smart suggestions",
      badge: reviewBadgeCount > 0 ? reviewBadgeCount : undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "transactions",
      label: "All Transactions",
      description: "View and edit all items",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: "reimbursements",
      label: "Reimbursements",
      description: "Track claim status",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "analytics",
      label: "Analytics",
      description: "Spending insights & trends",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: "card-safety",
      label: "Card Safety",
      description: "Calculate payment to avoid interest",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: "export",
      label: "Export",
      description: "Download reports for finance",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "import":
        return <ImportTab onImportSuccess={navigateToReview} />;
      case "review":
        return <ReviewTab />;
      case "transactions":
        return <TransactionsTab />;
      case "reimbursements":
        return <ReimbursementsTab />;
      case "analytics":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
              <p className="text-muted-foreground mt-2">
                Insights into your reimbursable spending
              </p>
            </div>
            <AnalyticsDashboard />
          </div>
        );
      case "card-safety":
        return <CardSafetyTab />;
      case "export":
        return <ExportTab />;
      default:
        return <ImportTab onImportSuccess={navigateToReview} />;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <span className="font-semibold text-sidebar-foreground">ClaimPilot</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                    activeTab === item.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <span className={cn(
                    activeTab === item.id ? "text-primary" : "text-sidebar-foreground/50"
                  )}>
                    {item.icon}
                  </span>
                  <span className="font-medium flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-500">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="p-3 rounded-lg bg-sidebar-accent/50 text-xs text-sidebar-foreground/70">
            <p className="font-medium text-sidebar-foreground mb-1">100% Local</p>
            <p>Your data never leaves this device</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <OnboardingWizard />
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export function AppShell() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
