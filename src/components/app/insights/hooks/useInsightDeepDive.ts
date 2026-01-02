"use client";

import { useState, useEffect, useRef } from "react";
import { getDeepDive } from "@/lib/services/aiDeepDive";
import { getCachedDeepDive, setCachedDeepDive, getCacheKey, hashPayload } from "@/lib/services/aiDeepDiveCache";
import type { HomeCardDeepDive } from "@/lib/services/aiDeepDive";
import type { InsightCardData } from "../InsightCardTopics";

interface UseInsightDeepDiveParams {
  cardData: InsightCardData;
  monthKey: string;
  enabled: boolean;
  abortController?: AbortController;
}

/**
 * Hook for fetching AI deep dive for a specific insight card
 * Only runs if enabled is true
 * Uses cache to prevent duplicate requests
 */
export function useInsightDeepDive({
  cardData,
  monthKey,
  enabled,
  abortController,
}: UseInsightDeepDiveParams) {
  const [data, setData] = useState<HomeCardDeepDive | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Check cache first
    const payloadHash = hashPayload({
      monthKey,
      topicKey: cardData.id,
      payload: {
        id: cardData.id,
        keyMetric: cardData.keyMetric,
        chartData: cardData.chartData,
      },
      modelTier: "default",
    });
    const cacheKey = getCacheKey({
      monthKey,
      layer: "home",
      topicKey: cardData.id,
      payloadHash,
      modelTier: "default",
    });

    // Check cache (async)
    const checkCache = async () => {
      const cached = await getCachedDeepDive(cacheKey);
      if (cached) {
        if (isMountedRef.current) {
          setData(cached as HomeCardDeepDive);
        }
        return true;
      }
      return false;
    };

    checkCache().then((hasCache) => {
      if (hasCache) return;
      
      // No cache, fetch from API
      setIsLoading(true);
      setError(null);

      const fetchDeepDive = async () => {

        try {
          const result = await getDeepDive({
            layer: "home",
            monthKey,
            topicKey: cardData.id,
            payload: {
              title: cardData.title,
              keyMetric: cardData.keyMetric,
              chartData: cardData.chartData,
            },
          });

          if (abortController?.signal.aborted) {
            return;
          }

          if (isMountedRef.current) {
            setData(result as HomeCardDeepDive);
            await setCachedDeepDive(cacheKey, result);
            setIsLoading(false);
          }
        } catch (err) {
          if (abortController?.signal.aborted) {
            return;
          }

          if (isMountedRef.current) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch deep dive";
            // Don't show error for rate limits - they'll be retried automatically
            if (!errorMessage.includes('429') && !errorMessage.includes('rate limit') && !errorMessage.includes('quota')) {
              setError(errorMessage);
            }
            setIsLoading(false);
            if (!errorMessage.includes('429') && !errorMessage.includes('rate limit')) {
              console.error("Failed to fetch insight deep dive:", err);
            }
          }
        }
      };

      fetchDeepDive();
    });
  }, [cardData.id, monthKey, enabled, abortController]);

  return { data, isLoading, error };
}
