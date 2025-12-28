"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { LicenseTier } from "@/lib/types";

type TabId = "hub" | "review" | "plan" | "coach" | "import" | "transactions" | "buckets" | "analytics" | "reimbursements" | "recurring" | "action-plan" | "investments" | "card-safety" | "export" | "create-wrap" | "recaps" | "goals" | "learn" | "settings" | "roi-tracker" | "reminders" | "expense-coverage";

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  requiredTier?: LicenseTier;
  unlockCondition?: "always" | "hasTransactions" | "hasReviewed" | "hasGoals";
  description?: string;
}

interface MobileNavModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: TabId) => void;
  activeTab: TabId;
  items: NavItem[];
  isNavItemUnlocked: (condition?: string) => boolean;
  hasAccess: (feature: string) => boolean;
}

export function MobileNavModal({
  isOpen,
  onClose,
  onNavigate,
  activeTab,
  items,
  isNavItemUnlocked,
  hasAccess,
}: MobileNavModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter unlocked and accessible items
  const availableItems = items.filter((item) => {
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

  const handleItemClick = (tab: TabId) => {
    onNavigate(tab);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full h-full md:h-auto md:max-h-[80vh] md:max-w-2xl md:rounded-3xl bg-background shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-2xl font-bold">Navigate</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Grid of items */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200",
                      "hover:scale-105 hover:shadow-lg active:scale-95",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-foreground hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "relative",
                      isActive && "scale-110"
                    )}>
                      {item.icon}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-semibold">{item.label}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      )}
                    </div>
                    {item.badge && item.badge > 0 && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute inset-0 rounded-2xl border-2 border-primary animate-pulse opacity-50" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

