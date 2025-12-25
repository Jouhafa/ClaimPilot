import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ParsePDFRequest, ParsePDFResponse, Transaction } from "../types.js";

function extractMerchant(description: string): string {
  if (!description) return "Unknown";
  
  return description
    .replace(/\s+ARE$/, "")
    .replace(/\s+AE$/, "")
    .replace(/ABU DHABI$/, "")
    .replace(/DUBAI$/, "")
    .trim()
    .substring(0, 40) || "Unknown";
}

/**
 * Parse PDF text using Gemini AI to extract transactions
 */
export async function parsePDFWithAI(
  request: ParsePDFRequest
): Promise<ParsePDFResponse> {
  const { text } = request;

  if (!text || text.trim().length === 0) {
    throw new Error("No text provided");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Extract all financial transactions from this bank statement text. Return ONLY a valid JSON array of transactions with this exact structure:

[
  {
    "date": "YYYY-MM-DD",
    "description": "original description from statement",
    "merchant": "extracted merchant name",
    "amount": -123.45,
    "currency": "AED"
  }
]

Rules:
- date: Convert to YYYY-MM-DD format
- merchant: Extract the business name from description (e.g., "CAREEM QUIK ABU DHABI ARE" → "CAREEM QUIK")
- amount: Negative for debits/charges, positive for credits/payments. Look for "CR" suffix for credits.
- Skip header rows, summaries, and non-transaction lines
- Only include actual transactions with dates and amounts
- Return ONLY the JSON array, no markdown formatting, no explanations

Bank Statement Text:
${text.substring(0, 20000)}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Try to parse the JSON response
    let transactions: any[];
    try {
      // Remove any markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      transactions = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      throw new Error("Failed to parse AI response");
    }

    // Validate and normalize transactions
    const normalized: Transaction[] = transactions
      .filter((tx: any) => tx.date && tx.amount !== undefined)
      .map((tx: any) => ({
        date: tx.date,
        description: tx.description || "",
        merchant: tx.merchant || extractMerchant(tx.description || ""),
        amount: typeof tx.amount === "number" ? tx.amount : parseFloat(tx.amount) || 0,
        currency: tx.currency || "AED",
      }));

    return {
      success: true,
      transactions: normalized,
      count: normalized.length,
    };
  } catch (error) {
    console.error("AI parsing error:", error);
    throw new Error(
      `AI parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

