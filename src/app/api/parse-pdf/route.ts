import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables." },
        { status: 500 }
      );
    }

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Try to parse the JSON response
    let transactions;
    try {
      // Remove any markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      transactions = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: responseText.substring(0, 500) },
        { status: 500 }
      );
    }

    // Validate and normalize transactions
    const normalized = transactions
      .filter((tx: { date?: string; amount?: number }) => tx.date && tx.amount !== undefined)
      .map((tx: { date: string; description?: string; merchant?: string; amount: number; currency?: string }) => ({
        date: tx.date,
        description: tx.description || "",
        merchant: tx.merchant || extractMerchant(tx.description || ""),
        amount: typeof tx.amount === "number" ? tx.amount : parseFloat(tx.amount) || 0,
        currency: tx.currency || "AED",
      }));

    return NextResponse.json({
      success: true,
      transactions: normalized,
      count: normalized.length,
    });

  } catch (error) {
    console.error("AI parsing error:", error);
    return NextResponse.json(
      { error: "AI parsing failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

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
