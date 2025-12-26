/**
 * Backend API client with graceful fallback support
 * All backend calls are optional - app works without backend
 * 
 * Uses Next.js API routes (same domain) for Vercel deployment
 */

// Use relative paths for Next.js API routes (same domain)
// This works for both local dev and Vercel deployment
const API_BASE = typeof window !== "undefined" ? "" : "http://localhost:3000";

export interface ApiError {
  error: string;
  details?: string;
}

/**
 * Call backend API with automatic fallback on error
 */
export async function callBackend<T>(
  endpoint: string,
  options: RequestInit = {},
  fallback?: () => T | Promise<T>
): Promise<T> {
  try {
    // Use relative path for Next.js API routes (works on same domain)
    const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (response.ok) {
      return await response.json();
    }

    // If response is not ok, try fallback
    if (fallback) {
      console.warn(`Backend request failed (${response.status}), using fallback`);
      return await fallback();
    }

    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `Backend request failed with status ${response.status}`);
  } catch (error) {
    // Network error or other exception
    if (fallback) {
      console.warn("Backend unavailable, using fallback:", error);
      return await fallback();
    }
    throw error;
  }
}

/**
 * Verify license key with backend
 */
export async function verifyLicense(licenseKey: string): Promise<{
  valid: boolean;
  tier: string;
  expiresAt?: string;
}> {
  return callBackend(
    "/api/verify-license",
    {
      method: "POST",
      body: JSON.stringify({ licenseKey }),
    },
    () => ({
      valid: false,
      tier: "free",
    })
  );
}

/**
 * Parse PDF text using AI (optional enhancement)
 */
export async function parsePDFWithAI(text: string): Promise<{
  success: boolean;
  transactions: Array<{
    date: string;
    description: string;
    merchant: string;
    amount: number;
    currency: string;
  }>;
  count: number;
}> {
  return callBackend(
    "/api/ai/parse-pdf",
    {
      method: "POST",
      body: JSON.stringify({ text }),
    }
    // No fallback - caller should handle fallback to client-side parsing
  );
}

/**
 * Parse a single statement page using AI (for parallel processing)
 */
export async function parseStatementPageWithAI(
  statementType: string,
  pageText: string,
  pageIndex: number,
  currency: string = "AED"
): Promise<{
  success: boolean;
  transactions: Array<{
    date: string;
    description: string;
    merchant: string;
    amount: number;
    currency: string;
  }>;
  count: number;
}> {
  return callBackend(
    "/api/ai/parse-statement-page",
    {
      method: "POST",
      body: JSON.stringify({ statementType, pageText, pageIndex, currency }),
    }
    // No fallback - caller should handle errors
  );
}

/**
 * Get AI tag suggestions (optional enhancement)
 */
export async function suggestTagsWithAI(
  description: string,
  merchant: string,
  amount: number
): Promise<{
  suggestedTag: "reimbursable" | "personal" | "ignore" | null;
  suggestedCategory: string;
  confidence: number;
  reason: string;
}> {
  return callBackend(
    "/api/ai/suggest-tags",
    {
      method: "POST",
      body: JSON.stringify({ description, merchant, amount }),
    }
    // No fallback - caller should handle fallback to client-side tagging
  );
}

/**
 * Generate monthly narrative using AI (optional enhancement)
 */
export async function generateMonthlyNarrative(summaryData: {
  totalSpending: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthOverMonth: Array<{
    category: string;
    change: number;
  }>;
  cashflow: {
    inflow: number;
    outflow: number;
    net: number;
  };
  goalsCount: number;
  income?: number;
}): Promise<{ narrative: string }> {
  return callBackend(
    "/api/ai/monthly-narrative",
    {
      method: "POST",
      body: JSON.stringify({ summaryData }),
    }
    // No fallback - caller should handle fallback to local narrative
  );
}

