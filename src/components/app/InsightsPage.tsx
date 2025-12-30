"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/context";
import { useAIDeepDive } from "@/lib/hooks/useAIDeepDive";
import { InsightsHome } from "./insights/InsightsHome";
import { StoryView } from "./insights/StoryView";
import { AnalystMode } from "./insights/AnalystMode";
import { getStoryDeck } from "./insights/StoryTopics";
import { useStoryDeepDive } from "./insights/hooks/useStoryDeepDive";
import { useAnalystHints } from "./insights/hooks/useAnalystHints";
import type { InsightTopicId } from "./insights/InsightCardTopics";

type InsightsLayer = "home" | "story" | "analyst";

interface InsightsPageProps {
  onNavigate?: (tab: string) => void;
  selectedMonth?: Date;
  showComparison?: boolean;
}

export function InsightsPage({ onNavigate, selectedMonth, showComparison = false }: InsightsPageProps = {}) {
  const { transactions } = useApp();
  const { enabled: aiEnabled, toggle: toggleAI, getAbortController, clearAbortController } = useAIDeepDive();
  
  const monthToUse = selectedMonth || new Date();
  const monthKey = `${monthToUse.getFullYear()}-${String(monthToUse.getMonth() + 1).padStart(2, "0")}`;

  // Layer state management
  const [currentLayer, setCurrentLayer] = useState<InsightsLayer>(showComparison ? "analyst" : "home");
  const [selectedTopicId, setSelectedTopicId] = useState<InsightTopicId | null>(null);

  // Abort controller for AI requests
  const abortController = useMemo(() => getAbortController(), [getAbortController]);

  // Clear abort controller on layer/month change
  useEffect(() => {
    return () => {
      clearAbortController();
    };
  }, [currentLayer, monthKey, clearAbortController]);

  // Get story deck when in story view
  const storyDeck = useMemo(() => {
    if (!selectedTopicId) return null;
    return getStoryDeck(selectedTopicId, transactions, monthToUse);
  }, [selectedTopicId, transactions, monthToUse]);

  // Story deep dives
  const { deepDives: storyDeepDives, isLoading: isLoadingStoryAI } = useStoryDeepDive({
    deck: storyDeck || { topicId: "spending-overview", title: "", slides: [] },
    monthKey,
    enabled: aiEnabled && currentLayer === "story",
    abortController,
  });

  // Analyst hints (using placeholder filters for now)
  const { hints: analystHints, isLoading: isLoadingAnalystAI } = useAnalystHints({
    monthKey,
    filters: {},
    enabled: aiEnabled && currentLayer === "analyst",
    abortController,
  });

  // Handle view story
  const handleViewStory = (topicId: InsightTopicId) => {
    setSelectedTopicId(topicId);
    setCurrentLayer("story");
  };

  // Handle close story
  const handleCloseStory = () => {
    setCurrentLayer("home");
    setSelectedTopicId(null);
  };

  // Handle analyst mode
  const handleAnalystMode = () => {
    setCurrentLayer("analyst");
  };

  if (transactions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md border border-border/50">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No data yet</h3>
            <p className="text-sm text-muted-foreground">
              Import transactions to see your spending insights
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-background">
        <div className="max-w-[1120px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
                Spending Insights
              </h1>
              <p className="text-[15px] text-muted-foreground mt-1" style={{ lineHeight: 1.6 }}>
                Full visibility into your finances
              </p>
            </div>

            {/* AI Toggle and Analyst Mode Button */}
            <div className="flex items-center gap-3">
              {/* AI Toggle */}
              <div className="relative group">
                <Button
                  variant={aiEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleAI()}
                  className="text-[13px]"
                >
                  AI Deep Dive {aiEnabled ? "ON" : "OFF"}
                </Button>
                {/* Privacy tooltip */}
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
                  <div className="bg-popover border border-border rounded-lg p-2 text-[12px] text-muted-foreground shadow-lg max-w-[200px]">
                    Uses summarized stats (not raw transactions)
                  </div>
                </div>
              </div>

              {/* Analyst Mode Button */}
              {currentLayer === "home" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalystMode}
                  className="text-[13px]"
                >
                  Analyst Mode
                </Button>
              )}

              {/* Back to Home button (when in story or analyst) */}
              {(currentLayer === "story" || currentLayer === "analyst") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentLayer("home")}
                  className="text-[13px]"
                >
                  ← Back
                </Button>
              )}
            </div>
          </div>

          {/* AI Loading Banner (subtle) */}
          {aiEnabled && (isLoadingStoryAI || isLoadingAnalystAI) && currentLayer !== "home" && (
            <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>AI is generating deeper insights...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1120px] mx-auto px-4 py-4">
          {currentLayer === "home" && (
            <InsightsHome
              selectedMonth={monthToUse}
              onViewStory={handleViewStory}
            />
          )}

          {currentLayer === "story" && storyDeck && (
            <StoryView
              deck={storyDeck}
              monthKey={monthKey}
              aiDeepDives={storyDeepDives}
              isLoadingAI={isLoadingStoryAI}
              onClose={handleCloseStory}
            />
          )}

          {currentLayer === "analyst" && (
            <AnalystMode
              selectedMonth={monthToUse}
              aiHints={analystHints}
              isLoadingAI={isLoadingAnalystAI}
            />
          )}
        </div>
      </div>
    </div>
  );
}