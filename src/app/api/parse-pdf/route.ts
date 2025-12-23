import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." },
        { status: 500 }
      );
    }

    // Initialize OpenAI client lazily to avoid build errors
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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

Bank Statement Text:
${text.substring(0, 15000)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a financial data extraction assistant. Extract transactions from bank statements and return them as a JSON array. Be precise with amounts and dates. Return ONLY valid JSON, no markdown or explanations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content || "[]";
    
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
      console.error("Failed to parse OpenAI response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: responseText },
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

