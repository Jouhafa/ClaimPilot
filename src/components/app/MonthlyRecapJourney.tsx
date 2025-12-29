"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";
import type { WrapSnapshot, WrapData } from "@/lib/types";
import { computeWrapData, generateMonthlyWrap } from "@/lib/wrapComputation";
import { getCategoryBreakdown, getMonthOverMonthComparison } from "@/lib/categories";
import { getRecurringSummary } from "@/lib/recurringDetector";
import { CATEGORY_CONFIG } from "@/lib/types";
import { saveWrapSnapshot, updateWrapWatchedAt } from "@/lib/storage";

interface MonthlyRecapJourneyProps {
  onComplete: () => void;
  onSkip?: () => void;
  wrapSnapshot?: WrapSnapshot | null; // If provided, replay from snapshot
  monthKey?: string; // YYYY-MM for generating new wrap
  onNavigate?: (tab: string) => void; // For deep-linking to tabs
}

export function MonthlyRecapJourney({ 
  onComplete, 
  onSkip, 
  wrapSnapshot,
  monthKey,
  onNavigate
}: MonthlyRecapJourneyProps) {
  const { transactions, recurring, goals, profile } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [wrapData, setWrapData] = useState<WrapData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate or load wrap data
  useEffect(() => {
    if (wrapSnapshot) {
      // Replay from snapshot
      setWrapData(wrapSnapshot.wrapData);
    } else if (monthKey) {
      // Generate new wrap
      setIsGenerating(true);
      const [year, month] = monthKey.split("-").map(Number);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0, 23, 59, 59);
      
      // Get previous month transactions for comparison
      const prevMonthStart = new Date(year, month - 2, 1);
      const prevMonthEnd = new Date(year, month - 1, 0, 23, 59, 59);
      const previousMonthTransactions = transactions.filter((tx) => {
        const txDate = new Date(tx.date);
        return txDate >= prevMonthStart && txDate <= prevMonthEnd;
      });

      const computed = computeWrapData({
        transactions,
        recurring,
        period: { start: periodStart, end: periodEnd },
        currency: profile?.currency || "AED",
        previousMonthTransactions,
        goals: goals.map((g) => ({
          id: g.id,
          name: g.name,
          currentAmount: g.currentAmount,
          targetAmount: g.targetAmount,
        })),
      });

      setWrapData(computed);
      setIsGenerating(false);

      // Save snapshot
      const snapshot = generateMonthlyWrap(monthKey, {
        transactions,
        recurring,
        period: { start: periodStart, end: periodEnd },
        currency: profile?.currency || "AED",
        previousMonthTransactions,
        goals: goals.map((g) => ({
          id: g.id,
          name: g.name,
          currentAmount: g.currentAmount,
          targetAmount: g.targetAmount,
        })),
      });
      saveWrapSnapshot(snapshot);
    } else {
      // Fallback: compute for current month
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [year, month] = monthKey.split("-").map(Number);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0, 23, 59, 59);

      const computed = computeWrapData({
        transactions,
        recurring,
        period: { start: periodStart, end: periodEnd },
        currency: profile?.currency || "AED",
        goals: goals.map((g) => ({
          id: g.id,
          name: g.name,
          currentAmount: g.currentAmount,
          targetAmount: g.targetAmount,
        })),
      });

      setWrapData(computed);
    }
  }, [wrapSnapshot, monthKey, transactions, recurring, goals, profile]);

  // Mark as watched when completed
  const handleComplete = useCallback(() => {
    if (wrapSnapshot) {
      updateWrapWatchedAt(wrapSnapshot.id, new Date().toISOString());
    }
    setIsVisible(false);
    setTimeout(() => onComplete(), 300);
  }, [wrapSnapshot, onComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        handlePrev();
      } else if (e.key === "Escape") {
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, currentSlide]);

  // Touch swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      handleComplete();
    }
  };

  if (!isVisible || !wrapData) {
    if (isGenerating) {
      return (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Analyzing... Finding patterns... Building your story...</p>
          </div>
        </div>
      );
    }
    return null;
  }

  const slides = buildSlides(wrapData, handleComplete, onNavigate);

  const currentSlideData = slides[currentSlide];

  return (
    <div 
      className="fixed inset-0 z-50 bg-background flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Progress bar at top */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* Progress dots - increased contrast */}
      <div className="flex justify-center gap-2 pt-4 pb-2">
        {slides.map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-2 rounded-full transition-all duration-200",
              index === currentSlide ? "bg-primary w-8 opacity-100" : "bg-muted/60 w-2 opacity-60"
            )}
          />
        ))}
      </div>

      {/* Slide content - full screen */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-4xl mx-auto w-full">
        <div className="w-full space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-center" style={{ fontWeight: 700 }}>
            {currentSlideData.title}
          </h2>
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            {currentSlideData.content}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-6 border-t">
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-muted-foreground"
        >
          {currentSlide === slides.length - 1 ? "Exit" : "Skip"}
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            onClick={handleNext}
            disabled={currentSlide === slides.length - 1}
            className="p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>

        {currentSlide !== slides.length - 1 && (
          <Button
            onClick={handleNext}
            size="lg"
            className="min-h-[44px] px-8 rounded-xl"
          >
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}

function buildSlides(
  wrapData: WrapData, 
  onComplete: () => void,
  onNavigate?: (tab: string) => void
): Array<{
  id: string;
  title: string;
  content: React.ReactNode;
}> {
  const slides: Array<{ id: string; title: string; content: React.ReactNode }> = [];

  // Slide 1: Cover - "December Wrap" + hero number
  const monthName = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  slides.push({
    id: "cover",
    title: `${monthName} Wrap`,
    content: (
      <div className="space-y-6 text-center">
        <div className="text-7xl md:text-8xl font-bold text-primary animate-in fade-in slide-in-from-bottom-4 duration-500">
          {wrapData.heroNumber}
        </div>
        <p className="text-2xl text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          {wrapData.heroLabel}
        </p>
      </div>
    ),
  });

  // Slide 2: Snapshot - spent / saved / reimbursable / on-track
  slides.push({
    id: "snapshot",
    title: "This Month at a Glance",
    content: (
      <div className="space-y-6 w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-muted/50 border">
            <p className="text-sm text-muted-foreground mb-2">Spent</p>
            <p className="text-3xl font-bold">
              {wrapData.currency} {wrapData.totalSpent.toLocaleString(undefined, { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
              })}
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-muted/50 border">
            <p className="text-sm text-muted-foreground mb-2">Income</p>
            <p className="text-3xl font-bold text-blue-600">
              {wrapData.totalIncome > 0 ? (
                <>
                  {wrapData.currency} {wrapData.totalIncome.toLocaleString(undefined, { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 0 
                  })}
                </>
              ) : (
                <span className="text-muted-foreground text-lg">Not linked — Add</span>
              )}
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-muted/50 border">
            <p className="text-sm text-muted-foreground mb-2">Saved</p>
            <p className={cn(
              "text-3xl font-bold",
              wrapData.totalSaved > 100 ? "text-green-600" :
              wrapData.totalSaved < -100 ? "text-red-600" :
              "text-foreground"
            )}>
              {wrapData.currency} {wrapData.totalSaved.toLocaleString(undefined, { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
              })}
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-muted/50 border">
            <p className="text-sm text-muted-foreground mb-2">Reimbursable</p>
            <p className="text-3xl font-bold text-blue-600">
              {wrapData.currency} {wrapData.totalReimbursable.toLocaleString(undefined, { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
              })}
            </p>
          </div>
        </div>
        {/* Review Status Card - explicit and clickable */}
        {wrapData.needsReviewCount && wrapData.needsReviewCount > 0 ? (
          <div 
            onClick={() => onNavigate?.("review")}
            className={cn(
              "p-6 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg",
              "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50"
            )}
          >
            <p className="text-lg font-semibold mb-1">
              Needs review: {wrapData.needsReviewCount} transaction{wrapData.needsReviewCount > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {wrapData.reviewReasons?.join(" / ") || "Untagged / reimbursable checks / duplicates"}
            </p>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-muted/50 border">
            <p className="text-lg font-semibold">✓ On Track</p>
            <p className="text-sm text-muted-foreground">All transactions are reviewed</p>
          </div>
        )}
      </div>
    ),
  });

  // Slide 3: Top categories (max 5 bars)
  slides.push({
    id: "categories",
    title: "Where did your money go?",
    content: (
      <div className="space-y-4 w-full max-w-2xl mx-auto">
        <p className="text-center text-muted-foreground mb-6">Top Categories</p>
        {wrapData.topCategories.map((cat, idx) => {
          const config = CATEGORY_CONFIG[cat.category];
          return (
            <div key={cat.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="font-medium">{config.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {wrapData.currency} {cat.amount.toLocaleString(undefined, { 
                      minimumFractionDigits: 0, 
                      maximumFractionDigits: 0 
                    })}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground min-w-[3rem] text-right">
                    {cat.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 delay-100"
                  style={{ 
                    width: `${cat.percentage}%`,
                    backgroundColor: config.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    ),
  });

  // Slide 4: Changes vs last month (top 3 deltas)
  if (wrapData.monthOverMonthChanges.length > 0) {
    slides.push({
      id: "changes",
      title: "What changed since last month?",
      content: (
        <div className="space-y-4 w-full max-w-2xl mx-auto">
          {wrapData.monthOverMonthChanges.map((change, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-muted/50 border">
              <div className="flex items-center justify-between">
                <span className="font-medium">{change.label}</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-lg font-bold",
                    change.isIncrease ? "text-red-600" : "text-green-600"
                  )}>
                    {change.isIncrease ? "+" : ""}{change.changePercent.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    });
  }

  // Slide 5: Recurring/subscriptions
  if (wrapData.recurringSummary.count > 0) {
    slides.push({
      id: "recurring",
      title: "What are you paying for every month?",
      content: (
        <div className="space-y-4 w-full max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-4xl font-bold">
              {wrapData.currency} {wrapData.recurringSummary.total.toLocaleString(undefined, { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
              })}
            </p>
            <p className="text-muted-foreground mt-2">
              {wrapData.recurringSummary.count} active subscription{wrapData.recurringSummary.count > 1 ? "s" : ""}
            </p>
          </div>
          {wrapData.recurringSummary.topItems.slice(0, 5).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="font-medium">{item.merchant}</span>
              <span className="text-muted-foreground">
                {wrapData.currency} {item.amount.toLocaleString(undefined, { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                })} / {item.frequency}
              </span>
            </div>
          ))}
        </div>
      ),
    });
  }

  // Slide 6: Reimbursements pipeline (if available)
  if (wrapData.reimbursementsPipeline.total > 0) {
    slides.push({
      id: "reimbursements",
      title: "Are you missing any reimbursements?",
      content: (
        <div className="space-y-4 w-full max-w-2xl mx-auto">
          <p className="text-center text-muted-foreground mb-6">Reimbursements Pipeline</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-muted/50 border text-center relative group">
              <p className="text-2xl font-bold">{wrapData.reimbursementsPipeline.draft}</p>
              <p className="text-sm text-muted-foreground mt-1">Not submitted</p>
              <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-background border rounded-lg px-2 py-1 text-xs shadow-lg">
                  Draft = prepared but not submitted yet
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 border text-center">
              <p className="text-2xl font-bold">{wrapData.reimbursementsPipeline.submitted}</p>
              <p className="text-sm text-muted-foreground mt-1">Submitted</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 border text-center">
              <p className="text-2xl font-bold text-green-600">{wrapData.reimbursementsPipeline.paid}</p>
              <p className="text-sm text-muted-foreground mt-1">Paid</p>
            </div>
          </div>
        </div>
      ),
    });
  }

  // Slide 7: Flags only if any - show items directly
  if (wrapData.flags.length > 0) {
    const unusualFlag = wrapData.flags.find(f => f.type === "unusual");
    if (unusualFlag && unusualFlag.transactions && unusualFlag.transactions.length > 0) {
      slides.push({
        id: "flags",
        title: "Items to Review",
        content: (
          <div className="space-y-4 w-full max-w-2xl mx-auto">
            <p className="text-center text-muted-foreground mb-6">
              {unusualFlag.count} unusually large transaction{unusualFlag.count > 1 ? "s" : ""}
            </p>
            <div className="space-y-3">
              {unusualFlag.transactions.slice(0, 3).map((tx) => (
                <div key={tx.id} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{tx.merchant}</p>
                      <p className="text-sm text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {wrapData.currency} {tx.amount.toLocaleString(undefined, { 
                          minimumFractionDigits: 0, 
                          maximumFractionDigits: 0 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {onNavigate && (
              <div className="pt-4">
                <Button 
                  onClick={() => onNavigate("review")}
                  className="w-full"
                  size="lg"
                >
                  Review Now
                </Button>
              </div>
            )}
          </div>
        ),
      });
    } else {
      // Fallback for other flags
      slides.push({
        id: "flags",
        title: "Items to Review",
        content: (
          <div className="space-y-4 w-full max-w-2xl mx-auto">
            {wrapData.flags.map((flag, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="font-medium mb-1">{flag.message}</p>
              </div>
            ))}
          </div>
        ),
      });
    }
  }

  // Slide 8: Final - Next 3 moves (clickable)
  slides.push({
    id: "moves",
    title: "Your Next 3 Moves",
    content: (
      <div className="space-y-4 w-full max-w-2xl mx-auto">
        {wrapData.top3Moves.map((move, idx) => {
          const getDestination = (action: string) => {
            switch (action) {
              case "review": return "review";
              case "reimbursements": return "reimbursements";
              case "goals": return "goals";
              case "export": return "export";
              default: return "hub";
            }
          };
          const destination = getDestination(move.action);
          
          return (
            <div 
              key={move.id} 
              onClick={() => onNavigate?.(destination)}
              className={cn(
                "p-6 rounded-xl bg-primary/10 border border-primary/20",
                "cursor-pointer transition-all hover:shadow-lg hover:border-primary/40",
                "group"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold">{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{move.title}</h3>
                  <p className="text-muted-foreground mb-3">{move.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">⏱ {move.timeEstimate}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      move.priority === "high" ? "bg-red-500/20 text-red-600" :
                      move.priority === "medium" ? "bg-amber-500/20 text-amber-600" :
                      "bg-blue-500/20 text-blue-600"
                    )}>
                      {move.priority}
                    </span>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      → Opens {destination === "review" ? "Review" : destination === "reimbursements" ? "Reimbursements" : destination}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ),
  });

  // Slide 9: Ending - Celebratory slide
  slides.push({
    id: "ending",
    title: "That's a wrap.",
    content: (
      <div className="space-y-6 w-full max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-4">🎉</div>
        <p className="text-xl text-muted-foreground">
          Now let's handle your next 3 moves.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button
            onClick={() => {
              onNavigate?.("hub");
              onComplete();
            }}
            size="lg"
            className="min-h-[44px] px-8"
          >
            Go to Next 3 Moves
          </Button>
          <Button
            onClick={() => {
              onNavigate?.("hub");
              onComplete();
            }}
            variant="outline"
            size="lg"
            className="min-h-[44px] px-8"
          >
            Back to Hub
          </Button>
        </div>
      </div>
    ),
  });

  return slides;
}
