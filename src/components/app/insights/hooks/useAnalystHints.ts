"use client";

import { useState, useEffect, useRef } from "react";
import { getDeepDive } from "@/lib/services/aiDeepDive";
import { getCachedDeepDive, setCachedDeepDive, getCacheKey, hashPayload } from "@/lib/services/aiDeepDiveCache";
import type { AnalystHints } from "@/lib/services/aiDeepDive";

interface UseAnalystHintsParams {
  monthKey: string;
  filters: {
    category?: string;
    merchantSearch?: string;
  };
  enabled: boolean;
  abortController?: AbortController;
}

/**
 * Hook for fetching AI hints in Analyst Mode
 * Only runs for current filter/view state
 */
export function useAnalystHints({
  monthKey,
  filters,
  enabled,
  abortController,
}: UseAnalystHintsParams) {
  const [hints, setHints] = useState<AnalystHints | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setHints(null);
      setIsLoading(false);
      return;
    }

    // Check cache
    const payloadHash = hashPayload({
      monthKey,
      topicKey: "hints",
      payload: filters,
      modelTier: "default",
    });
    const cacheKey = getCacheKey({
      monthKey,
      layer: "analyst",
      topicKey: "hints",
      payloadHash,
      modelTier: "default",
    });

    // Check cache (async)
    const checkCache = async () => {
      const cached = await getCachedDeepDive(cacheKey);
      if (cached) {
        if (isMountedRef.current) {
          setHints(cached as AnalystHints);
        }
        return true;
      }
      return false;
    };

    checkCache().then((hasCache) => {
      if (hasCache) return;

      // No cache, fetch from API
      setIsLoading(true);
      setHints(null);

      const fetchHints = async () => {
        try {
          const result = await getDeepDive({
            layer: "analyst",
            monthKey,
            topicKey: "hints",
            payload: filters,
          });

          if (abortController?.signal.aborted) {
            return;
          }

          if (isMountedRef.current) {
            setHints(result as AnalystHints);
            await setCachedDeepDive(cacheKey, result);
            setIsLoading(false);
          }
        } catch (err) {
          if (abortController?.signal.aborted) {
            return;
          }

          if (isMountedRef.current) {
            console.error("Failed to fetch analyst hints:", err);
            setIsLoading(false);
          }
        }
      };

      fetchHints();
    });
  }, [monthKey, JSON.stringify(filters), enabled, abortController]);

  return { hints, isLoading };
}
