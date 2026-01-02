/**
 * AI Deep Dive Service
 * Returns structured JSON insights (not prose)
 * Uses Groq with unified schema
 */

export type DeepDiveLayer = "home" | "story" | "analyst";

export interface DeepDiveRequest {
  layer: DeepDiveLayer;
  monthKey: string; // YYYY-MM
  topicKey: string; // cardId, slideId, or scope identifier
  payload: any; // Aggregated data (no raw transactions)
  modelTier?: "default" | "premium"; // default uses llama-3.1-8b-instant, premium uses llama-3.3-70b-versatile
}

/**
 * Unified Deep Dive Result Schema
 * All layers use the same structure
 */
export interface DeepDiveResult {
  headline: string; // <= 90 chars
  takeaway: string; // <= 140 chars
  why_it_matters: string; // <= 140 chars
  bullets: string[]; // max 3, each <= 90 chars
  suggested_action: {
    label: string; // <= 60 chars
    deepLink: string;
  } | null;
  confidence: "low" | "med" | "high";
}

// Legacy type aliases for backward compatibility
export type HomeCardDeepDive = DeepDiveResult;
export type StorySlideDeepDive = DeepDiveResult;
export type AnalystHints = DeepDiveResult;
export type DeepDiveResponse = DeepDiveResult;

import { aiRateLimiter } from "./aiRateLimiter";

/**
 * Get AI deep dive insights
 * Calls API route which uses Gemini to generate structured insights
 * Uses rate limiting to prevent hitting API quotas
 */
export async function getDeepDive(request: DeepDiveRequest): Promise<DeepDiveResponse> {
  const requestId = `${request.layer}-${request.monthKey}-${request.topicKey}`;
  
  return aiRateLimiter.queueRequest(requestId, async () => {
    try {
      const response = await fetch("/api/ai/deep-dive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        const error = new Error(errorData.error || `Request failed with status ${response.status}`);
        (error as any).status = response.status;
        throw error;
      }

      const result = await response.json();
      return result as DeepDiveResponse;
    } catch (error) {
      console.error("AI deep dive error:", error);
      throw error;
    }
  });
}
