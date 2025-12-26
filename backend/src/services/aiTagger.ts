import { GoogleGenAI } from "@google/genai";
import type { SuggestTagsRequest, SuggestTagsResponse, TransactionTag, TransactionCategory } from "../types.js";

/**
 * Use AI to suggest tags and categories for a transaction
 */
export async function suggestTagsWithAI(
  request: SuggestTagsRequest
): Promise<SuggestTagsResponse> {
  const { description, merchant, amount } = request;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Analyze this financial transaction and suggest:
1. Tag: "reimbursable" (business expense), "personal" (personal expense), or "ignore" (not relevant)
2. Category: One of: groceries, dining, transport, rent, utilities, subscriptions, travel, shopping, health, entertainment, education, insurance, savings, investment, income, transfer, fees, other

Transaction details:
- Merchant: ${merchant}
- Description: ${description}
- Amount: ${Math.abs(amount)} ${amount < 0 ? "debit" : "credit"}

Return ONLY a JSON object with this exact structure:
{
  "suggestedTag": "reimbursable" | "personal" | "ignore",
  "suggestedCategory": "category name",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}

Consider:
- Hotels, flights, business meals → reimbursable
- Groceries, personal subscriptions, entertainment → personal
- Transfers, fees → may be ignore
- Use context clues from merchant name and description`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const responseText = response.text || "";
    
    // Parse JSON response
    let suggestion: any;
    try {
      const cleanedResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      suggestion = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI tag suggestion:", responseText);
      throw new Error("Failed to parse AI response");
    }

    // Validate and normalize
    const validTags: TransactionTag[] = ["reimbursable", "personal", "ignore", null];
    const validCategories: TransactionCategory[] = [
      "groceries", "dining", "transport", "rent", "utilities", "subscriptions",
      "travel", "shopping", "health", "entertainment", "education", "insurance",
      "savings", "investment", "income", "transfer", "fees", "other"
    ];

    return {
      suggestedTag: validTags.includes(suggestion.suggestedTag) 
        ? suggestion.suggestedTag 
        : null,
      suggestedCategory: validCategories.includes(suggestion.suggestedCategory)
        ? suggestion.suggestedCategory
        : "other",
      confidence: Math.max(0, Math.min(1, suggestion.confidence || 0.5)),
      reason: suggestion.reason || "AI analysis",
    };
  } catch (error) {
    console.error("AI tag suggestion error:", error);
    throw new Error(
      `AI tag suggestion failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}


