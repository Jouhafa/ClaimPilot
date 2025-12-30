"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { saveAIDeepDivePreference, loadAIDeepDivePreference } from "@/lib/storage";

/**
 * Hook for managing AI Deep Dive toggle state
 * Persists preference to storage, provides abort controller for cancellation
 */
export function useAIDeepDive() {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load preference on mount
  useEffect(() => {
    let mounted = true;
    
    loadAIDeepDivePreference()
      .then((preference) => {
        if (mounted) {
          setEnabled(preference);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load AI preference:", err);
        if (mounted) {
          setError("Failed to load preference");
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Toggle handler
  const toggle = useCallback(async (newValue?: boolean) => {
    const value = newValue ?? !enabled;
    
    try {
      await saveAIDeepDivePreference(value);
      setEnabled(value);
      setError(null);

      // Abort any in-flight requests when toggling OFF
      if (!value && abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    } catch (err) {
      console.error("Failed to save AI preference:", err);
      setError("Failed to save preference");
    }
  }, [enabled]);

  // Get abort controller (create new one if needed)
  const getAbortController = useCallback(() => {
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    return abortControllerRef.current;
  }, []);

  // Clear abort controller
  const clearAbortController = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    enabled,
    toggle,
    isLoading,
    error,
    getAbortController,
    clearAbortController,
  };
}
