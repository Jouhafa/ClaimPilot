"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/context";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAutoTagStats } from "@/lib/autoTagger";
import type { LicenseTier } from "@/lib/types";

type TabId = "hub" | "review" | "plan" | "coach" | "import" | "transactions" | "buckets" | "analytics" | "reimbursements" | "recurring" | "action-plan" | "investments" | "card-safety" | "export" | "create-wrap" | "recaps" | "goals" | "settings";

interface NavItem {
  id: TabId;
  label: string;
  description?: string;
  icon: React.ReactNode;
  badge?: number;
  requiredTier?: LicenseTier;
  unlockCondition?: "always" | "hasTransactions" | "hasReviewed" | "hasGoals";
  section?: string;
}

interface TopNavProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  onPlayWrap?: (monthKey: string) => void;
}

// Month selector component
function MonthSelector({ 
  selectedMonth, 
  onMonthChange,
}: { 
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
    <div className="flex items-center gap-1 bg-muted/30 rounded-lg px-1 border border-border">
      <button
        onClick={goToPrevMonth}
        className="p-1.5 hover:bg-muted rounded transition-colors"
        title="Previous month"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="px-3 py-1.5 text-sm font-medium min-w-[100px] text-center">
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

// Mega-menu panel component
function MegaMenu({
  items,
  activeTab,
  onNavigate,
  isOpen,
  onClose,
  isNavItemUnlocked,
  hasAccess,
  triggerRef,
}: {
  items: NavItem[];
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
  isOpen: boolean;
  onClose: () => void;
  isNavItemUnlocked: (condition?: string) => boolean;
  hasAccess: (feature: string) => boolean;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleNavClick = (tab: TabId) => {
    onNavigate(tab);
    onClose();
  };

  // Filter unlocked items
  const unlockedItems = items.filter(item => {
    if (!isNavItemUnlocked(item.unlockCondition)) return false;
    if (item.requiredTier) {
      const itemFeature = item.id === "reimbursements" ? "reimbursement-tracker" 
        : item.id === "investments" ? "investment-policy"
        : item.id === "action-plan" ? "action-plan"
        : item.id;
      return hasAccess(itemFeature);
    }
    return true;
  });

  // All items in Navigate dropdown (no section grouping needed)
  const allItems = unlockedItems;

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/5" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        ref={menuRef}
        className="fixed left-0 right-0 top-[68px] z-50 bg-background border-b border-border shadow-lg h-20 animate-in fade-in slide-in-from-top-2 duration-200"
        onMouseEnter={() => {}} // Keep open on hover
        onMouseLeave={onClose}
      >
        <div className="max-w-[1400px] mx-auto px-6 h-full">
          <div className="flex items-stretch gap-0 overflow-x-auto scrollbar-hide h-full">
            {allItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <NavTile
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  onClick={() => handleNavClick(item.id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// Navigation tile component
function NavTile({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col justify-center gap-1.5 px-6 text-left transition-all duration-150 group min-w-[160px] flex-shrink-0 h-full",
        "hover:bg-primary/5",
        isActive
          ? "bg-primary/10 border-l-2 border-primary"
          : "border-l border-border/50 hover:border-l-2 hover:border-primary/30"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn(
          "w-5 h-5 flex-shrink-0 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
        )}>
          {item.icon}
        </span>
        {item.badge && item.badge > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
            {item.badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0">
        <span className={cn(
          "text-sm font-semibold leading-tight",
          isActive ? "text-foreground" : "text-foreground"
        )}>
          {item.label}
        </span>
        {item.description && (
          <span className="text-xs text-muted-foreground leading-tight">
            {item.description}
          </span>
        )}
      </div>
    </button>
  );
}

export function TopNav({ activeTab, onNavigate, selectedMonth, onMonthChange, onPlayWrap }: TopNavProps) {
  const { transactions, goals, tier, hasAccess } = useApp();
  const [navigateMenuOpen, setNavigateMenuOpen] = useState(false);
  const navigateRef = useRef<HTMLDivElement>(null);

  // Calculate unlock states
  const unlockState = useMemo(() => {
    const hasTransactions = transactions.length > 0;
    const hasReviewed = transactions.some(t => t.tag && !t.suggestedTag);
    const hasGoals = goals.length > 0;
    return { hasTransactions, hasReviewed, hasGoals };
  }, [transactions, goals]);

  // Calculate badges
  const autoTagStats = getAutoTagStats(transactions);
  const reviewBadgeCount = autoTagStats.needsReviewCount;
  const draftReimbursementsCount = transactions.filter(
    t => t.tag === "reimbursable" && t.status === "draft"
  ).length;

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

  // Navigation items for Navigate dropdown (Review, Plan, Insights, Coach, Recaps, Export)
  const navigateItems: NavItem[] = [
    {
      id: "review",
      label: "Review",
      description: "Tag transactions",
      badge: reviewBadgeCount > 0 ? reviewBadgeCount : undefined,
      unlockCondition: "hasTransactions",
      section: "Core",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "plan",
      label: "Plan",
      description: "Goals & buckets",
      unlockCondition: "always",
      section: "Core",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "analytics",
      label: "Insights",
      description: "Spending analytics",
      unlockCondition: "hasTransactions",
      section: "Core",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: "coach",
      label: "Coach",
      description: "Learn & stories",
      unlockCondition: "always",
      section: "Core",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      id: "recaps",
      label: "Recaps",
      description: "Saved wraps",
      unlockCondition: "hasTransactions",
      section: "Core",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: "export",
      label: "Export",
      description: "Generate reports",
      unlockCondition: "hasTransactions",
      section: "Core",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const handleNavClick = useCallback((tab: TabId) => {
    onNavigate(tab);
    setNavigateMenuOpen(false);
  }, [onNavigate]);


  // Home icon for Hub
  const homeIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );

  const wrapIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const navigateIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );

  const importIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center justify-between h-[68px]">
          {/* Left: ClaimPilot Logo | Hub | Wrap | Navigate */}
          <div className="flex items-center gap-6">
            {/* ClaimPilot Logo - links to landing page */}
            <Link 
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="font-semibold text-base text-foreground">ClaimPilot</span>
            </Link>

            {/* Hub - separate button with home icon */}
            <button
              onClick={() => handleNavClick("hub")}
              className={cn(
                "relative flex items-center gap-2 text-base font-medium transition-colors",
                activeTab === "hub"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {homeIcon}
              <span>Hub</span>
              {activeTab === "hub" && (
                <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-primary rounded-t-full" />
              )}
            </button>
            
            <button
              onClick={() => {
                const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`;
                onPlayWrap?.(monthKey);
              }}
              className={cn(
                "relative flex items-center gap-2 text-base font-medium transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              {wrapIcon}
              <span>Wrap</span>
            </button>

            <div 
              ref={navigateRef}
              className="relative"
              onMouseEnter={() => setNavigateMenuOpen(true)}
              onMouseLeave={() => setNavigateMenuOpen(false)}
            >
              <button
                onClick={() => setNavigateMenuOpen(!navigateMenuOpen)}
                className={cn(
                  "relative flex items-center gap-2 text-base font-medium transition-colors",
                  navigateMenuOpen || navigateItems.some(item => item.id === activeTab)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {navigateIcon}
                <span>Navigate</span>
                <svg 
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    navigateMenuOpen && "rotate-180"
                  )} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <MegaMenu
                items={navigateItems}
                activeTab={activeTab}
                onNavigate={handleNavClick}
                isOpen={navigateMenuOpen}
                onClose={() => setNavigateMenuOpen(false)}
                isNavItemUnlocked={isNavItemUnlocked}
                hasAccess={hasAccess}
                triggerRef={navigateRef}
              />
            </div>
          </div>

          {/* Center: Month Selector */}
          <div className="flex-1 flex justify-center">
            <MonthSelector 
              selectedMonth={selectedMonth} 
              onMonthChange={onMonthChange}
            />
          </div>

          {/* Right: Import | Setting | Mode */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleNavClick("import" as TabId)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-base font-medium hover:bg-primary/90 transition-colors",
                activeTab === "import" && "ring-2 ring-primary/50"
              )}
            >
              {importIcon}
              <span>Import</span>
            </button>

            <button
              onClick={() => handleNavClick("settings" as TabId)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                activeTab === "settings"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              aria-label="Settings"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
