import { GoogleGenAI } from "@google/genai";
import type { MonthlyNarrativeRequest, MonthlyNarrativeResponse } from "../types.js";

/**
 * Generate monthly financial narrative using AI
 */
export async function generateMonthlyNarrative(
  request: MonthlyNarrativeRequest
): Promise<MonthlyNarrativeResponse> {
  const { summaryData } = request;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a financial advisor analyzing a monthly spending report. Generate a helpful, conversational narrative (2-3 paragraphs) that:

1. Summarizes the key spending patterns
2. Highlights notable changes from previous month
3. Provides actionable insights and recommendations
4. Mentions goals progress if applicable

Monthly Summary:
- Total Spending: ${summaryData.totalSpending.toFixed(2)} AED
- Top Categories: ${summaryData.topCategories.map(c => `${c.category} (${c.percentage.toFixed(1)}%)`).join(", ")}
- Month-over-Month Changes: ${summaryData.monthOverMonth.map(c => `${c.category}: ${c.change > 0 ? "+" : ""}${c.change.toFixed(1)}%`).join(", ")}
- Cashflow: Inflow ${summaryData.cashflow.inflow.toFixed(2)} AED, Outflow ${summaryData.cashflow.outflow.toFixed(2)} AED, Net ${summaryData.cashflow.net.toFixed(2)} AED
- Active Goals: ${summaryData.goalsCount}
${summaryData.income ? `- Monthly Income: ${summaryData.income.toFixed(2)} AED` : ""}

Write in a friendly, professional tone. Be specific about amounts and percentages. Focus on actionable insights.

Return ONLY the narrative text, no markdown formatting, no JSON wrapper.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const narrative = (response.text || "").trim();

    return {
      narrative: narrative,
    };
  } catch (error) {
    console.error("AI narrative generation error:", error);
    throw new Error(
      `AI narrative generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}


