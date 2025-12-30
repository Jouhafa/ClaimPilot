"use client";

import { useState, useEffect, useRef } from "react";
import { getDeepDive } from "@/lib/services/aiDeepDive";
import { getCachedDeepDive, setCachedDeepDive, getCacheKey, hashPayload } from "@/lib/services/aiDeepDiveCache";
import type { StorySlideDeepDive } from "@/lib/services/aiDeepDive";
import type { StoryDeck } from "../StoryTopics";

interface UseStoryDeepDiveParams {
  deck: StoryDeck;
  monthKey: string;
  enabled: boolean;
  abortController?: AbortController;
}

/**
 * Hook for fetching AI deep dive for story slides
 * Prefetches entire topic deck when story view opens (if toggle ON)
 */
export function useStoryDeepDive({
  deck,
  monthKey,
  enabled,
  abortController,
}: UseStoryDeepDiveParams) {
  const [deepDives, setDeepDives] = useState<Map<string, StorySlideDeepDive>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Track last processed deck to avoid infinite loops
  const lastProcessedDeckRef = useRef<{ topicId: string; slideIds: string; monthKey: string } | null>(null);

  useEffect(() => {
    // Create current deck key - do this inside useEffect to avoid recalculating on every render
    const slideIdsString = deck.slides.map(s => s.id).sort().join(',');
    const currentDeckKey = {
      topicId: deck.topicId,
      slideIds: slideIdsString,
      monthKey,
    };

    // Check if this is the same deck we've already processed
    const isSameDeck = lastProcessedDeckRef.current &&
      lastProcessedDeckRef.current.topicId === currentDeckKey.topicId &&
      lastProcessedDeckRef.current.slideIds === currentDeckKey.slideIds &&
      lastProcessedDeckRef.current.monthKey === currentDeckKey.monthKey;

    if (!enabled || deck.slides.length === 0) {
      if (!isSameDeck) {
        setDeepDives(new Map());
        setIsLoading(false);
        lastProcessedDeckRef.current = null;
      }
      return;
    }

    // Skip if we've already processed this exact deck
    if (isSameDeck) {
      return;
    }

    // Mark this deck as being processed
    lastProcessedDeckRef.current = currentDeckKey;
    setIsLoading(true);

    // Fetch deep dives for all slides
    const fetchAll = async () => {
      const results = new Map<string, StorySlideDeepDive>();
      let hasErrors = false;

      try {
        for (const slide of deck.slides) {
          if (abortController?.signal.aborted) {
            hasErrors = true;
            break;
          }

          try {
            // Check cache
            const payloadHash = hashPayload({
              monthKey,
              topicKey: `${deck.topicId}:${slide.id}`,
              payload: {
                slideId: slide.id,
                title: slide.title,
                chartType: slide.chartType,
                data: slide.data,
              },
              modelTier: "default",
            });
            const cacheKey = getCacheKey({
              monthKey,
              layer: "story",
              topicKey: `${deck.topicId}:${slide.id}`,
              payloadHash,
              modelTier: "default",
            });

          const cached = await getCachedDeepDive(cacheKey);
          if (cached) {
            results.set(slide.id, cached as StorySlideDeepDive);
            continue;
          }

            // Fetch from API
            const result = await getDeepDive({
              layer: "story",
              monthKey,
              topicKey: deck.topicId,
              payload: {
                slideId: slide.id,
                title: slide.title,
                chartType: slide.chartType,
                data: slide.data,
              },
            });

            if (abortController?.signal.aborted) {
              hasErrors = true;
              break;
            }

          if (isMountedRef.current) {
            results.set(slide.id, result as StorySlideDeepDive);
            await setCachedDeepDive(cacheKey, result);
          }
          } catch (err) {
            console.error(`Failed to fetch deep dive for slide ${slide.id}:`, err);
            hasErrors = true;
            // Continue with other slides
          }
        }
      } finally {
        // Always update state and stop loading, even if there were errors
        if (isMountedRef.current && !abortController?.signal.aborted) {
          setDeepDives(new Map(results));
          setIsLoading(false);
        } else if (abortController?.signal.aborted || !isMountedRef.current) {
          // Request was aborted or component unmounted
          setIsLoading(false);
        }
      }
    };

    fetchAll();
    // Only depend on stable values - use deck.topicId and monthKey
    // The ref comparison inside handles slide changes and prevents infinite loops
    // We access deck.slides inside the effect but don't include it in deps to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.topicId, monthKey, enabled]);

  return { deepDives, isLoading };
}
