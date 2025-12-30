"use client";

import { useMemo, useRef, useEffect } from "react";
import { useApp } from "@/lib/context";
import { InsightCard } from "./InsightCard";
import { computeInsightCardData, getAllInsightTopics, type InsightTopicId } from "./InsightCardTopics";
import { useInsightDeepDive } from "./hooks/useInsightDeepDive";
import { useAIDeepDive } from "@/lib/hooks/useAIDeepDive";

interface InsightsHomeProps {
  selectedMonth: Date;
  onViewStory: (topicId: InsightTopicId) => void;
}

/**
 * Layer 1: Insights Home
 * Shows 4-5 insight cards with deterministic metrics + optional AI deep dive
 */
export function InsightsHome({ selectedMonth, onViewStory }: InsightsHomeProps) {
  const { transactions, incomeConfig } = useApp();
  const { enabled: aiEnabled, getAbortController } = useAIDeepDive();
  
  const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`;
  
  // Get abort controller - ensure it's always defined
  const abortController = useMemo(() => getAbortController(), [getAbortController]);

  // Compute card data for all topics (deterministic)
  const topics = getAllInsightTopics();
  const cardsData = useMemo(() => {
    return topics.map(topicId => 
      computeInsightCardData(topicId, transactions, selectedMonth, incomeConfig)
    );
  }, [topics, transactions, selectedMonth, incomeConfig]);

  // Only show first 5 cards (max, no scrolling)
  const displayedCards = cardsData.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedCards.map((cardData) => (
          <InsightCardWithAI
            key={cardData.id}
            cardData={cardData}
            monthKey={monthKey}
            aiEnabled={aiEnabled}
            abortController={abortController}
            onViewStory={() => onViewStory(cardData.id as InsightTopicId)}
          />
        ))}
      </div>

      {displayedCards.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No data available for this month.</p>
          <p className="text-sm mt-2">Import transactions to see insights.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Wrapper component that adds AI deep dive to InsightCard
 */
function InsightCardWithAI({
  cardData,
  monthKey,
  aiEnabled,
  abortController,
  onViewStory,
}: {
  cardData: ReturnType<typeof computeInsightCardData>;
  monthKey: string;
  aiEnabled: boolean;
  abortController: AbortController;
  onViewStory: () => void;
}) {
  const { data: aiDeepDive, isLoading: isLoadingAI } = useInsightDeepDive({
    cardData,
    monthKey,
    enabled: aiEnabled,
    abortController,
  });

  return (
    <InsightCard
      data={cardData}
      aiDeepDive={aiDeepDive}
      isLoadingAI={isLoadingAI}
      onViewStory={onViewStory}
    />
  );
}
