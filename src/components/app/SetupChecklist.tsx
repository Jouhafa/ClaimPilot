"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { cn } from "@/lib/utils";

interface SetupChecklistProps {
  onNavigate: (tab: string) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  tab: string;
}

export function SetupChecklist({ onNavigate }: SetupChecklistProps) {
  const { transactions, goals, cardSafety, tier } = useApp();

  const items = useMemo((): ChecklistItem[] => {
    // Check if transactions have been reviewed
    const hasReviewedTags = transactions.some(t => 
      t.tag && !t.suggestedTag
    );

    return [
      {
        id: "import",
        label: "Import",
        done: transactions.length > 0,
        tab: "import",
      },
      {
        id: "review",
        label: "Review",
        done: hasReviewedTags,
        tab: "review",
      },
      {
        id: "track",
        label: "Track",
        done: transactions.some(t => t.tag === "reimbursable" && t.status !== "draft"),
        tab: "reimbursements",
      },
      {
        id: "goals",
        label: "Goals",
        done: goals.length > 0,
        tab: "goals",
      },
      {
        id: "card",
        label: "Card Safety",
        done: !!cardSafety?.dueDate,
        tab: "card-safety",
      },
    ];
  }, [transactions, goals, cardSafety]);

  const completedCount = items.filter(i => i.done).length;
  const totalCount = items.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;

  if (allDone) {
    return null; // Hide when all done
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Setup checklist</CardTitle>
          <span className="text-xs text-muted-foreground">{completedCount}/{totalCount} complete</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between gap-1">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => !item.done && onNavigate(item.tab)}
              disabled={item.done}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-all",
                !item.done && "hover:bg-muted cursor-pointer",
                item.done && "cursor-default"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                item.done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              )}>
                {item.done ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                item.done ? "text-muted-foreground" : "text-foreground"
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Next step hint */}
        {!allDone && (
          <div className="text-center">
            <button
              onClick={() => {
                const nextItem = items.find(i => !i.done);
                if (nextItem) onNavigate(nextItem.tab);
              }}
              className="text-xs text-primary hover:underline"
            >
              Continue setup →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

