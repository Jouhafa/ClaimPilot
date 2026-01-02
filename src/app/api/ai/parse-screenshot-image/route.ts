import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

/**
 * POST /api/ai/parse-screenshot-image
 * 
 * Extracts transactions directly from screenshot images using Groq Vision AI.
 * Accepts image files (PNG, JPG) as multipart form data.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided", success: false, transactions: [], count: 0 },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured", success: false, transactions: [], count: 0 },
        { status: 500 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    
    // Determine mime type (Groq vision supports image/jpeg, image/png, image/gif, image/webp)
    let mimeType = file.type;
    if (!mimeType || mimeType === "application/octet-stream") {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".png")) mimeType = "image/png";
      else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) mimeType = "image/jpeg";
      else if (fileName.endsWith(".gif")) mimeType = "image/gif";
      else if (fileName.endsWith(".webp")) mimeType = "image/webp";
      else mimeType = "image/png"; // Default
    }

    // Create data URL for image
    const imageUrl = `data:${mimeType};base64,${base64Data}`;

    const groq = new Groq({ apiKey });

    const prompt = `You are a financial transaction extraction expert. Extract ALL transactions from this screenshot of a banking/finance app.

IMPORTANT RULES:
1. Extract EVERY transaction visible in the screenshot
2. Each transaction should have: date, merchant/name, description, amount, currency
3. For dates:
   - If visible, use format YYYY-MM-DD
   - If only "Today", "Yesterday", or relative dates shown, use today's date: ${new Date().toISOString().split("T")[0]}
   - If date is not visible, use today's date
4. For amounts:
   - Expenses/purchases should be NEGATIVE (e.g., -45.40)
   - Income/refunds should be POSITIVE
   - Remove currency symbols and parse the number
5. For merchant: Extract the business/store name
6. For description: Include any additional details shown
7. Default currency: AED (unless clearly shown otherwise)

Return ONLY a valid JSON array. No markdown, no explanations, no code blocks. Just the raw JSON array.

Example output:
[
  {"date": "2025-01-02", "merchant": "Noon Food", "description": "Food delivery", "amount": -45.40, "currency": "AED"},
  {"date": "2025-01-02", "merchant": "Careem", "description": "Taxi ride", "amount": -37.58, "currency": "AED"}
]

If no transactions are found, return an empty array: []`;

    // Try Groq vision models
    const modelNames = ["meta-llama/llama-4-scout-17b-16e-instruct"];
    let lastError: Error | null = null;
    
    for (const modelName of modelNames) {
      try {
        const completion = await groq.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 4096,
        });

        const responseText = completion.choices?.[0]?.message?.content ?? "";

        if (!responseText || responseText.trim().length === 0) {
          throw new Error("Empty response from AI model");
        }

        console.log("Groq Vision Response:", responseText.substring(0, 500));

        // Parse JSON response
        let transactions: any[] = [];
        
        // Try multiple parsing strategies
        const cleanedResponse = responseText
          .replace(/```json\n?/gi, "")
          .replace(/```\n?/g, "")
          .trim();
        
        try {
          const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            transactions = JSON.parse(jsonMatch[0]);
          } else {
            transactions = JSON.parse(cleanedResponse);
          }
        } catch (parseError) {
          console.error("Failed to parse AI response:", parseError);
          console.error("Raw response:", responseText);
          throw new Error("Failed to parse AI response as JSON");
        }

        if (!Array.isArray(transactions)) {
          transactions = [];
        }

        // Normalize transactions
        const normalized = transactions
          .filter((tx: any) => tx && typeof tx === "object")
          .map((tx: any) => {
            // Normalize date
            let date = tx.date || new Date().toISOString().split("T")[0];
            if (typeof date === "string" && !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const dateMatch = date.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              if (dateMatch) {
                const [, day, month, year] = dateMatch;
                date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
              } else {
                const parsed = new Date(date);
                if (!isNaN(parsed.getTime())) {
                  date = parsed.toISOString().split("T")[0];
                } else {
                  date = new Date().toISOString().split("T")[0];
                }
              }
            }

            // Normalize amount
            let amount = 0;
            if (typeof tx.amount === "number") {
              amount = tx.amount;
            } else if (typeof tx.amount === "string") {
              const cleaned = tx.amount.replace(/[^0-9.\-]/g, "");
              amount = parseFloat(cleaned) || 0;
              // Check if original had negative indicator
              if (tx.amount.includes("-") && amount > 0) {
                amount = -amount;
              }
            }

            return {
              date,
              merchant: (tx.merchant || tx.name || "Unknown").trim(),
              description: (tx.description || tx.merchant || tx.name || "").trim(),
              amount,
              currency: (tx.currency || "AED").toUpperCase(),
            };
          })
          .filter((tx: any) => tx.merchant !== "Unknown" || tx.description);

        console.log(`Extracted ${normalized.length} transactions from screenshot`);

        return NextResponse.json({
          success: true,
          transactions: normalized,
          count: normalized.length,
        });
        
      } catch (error: any) {
        console.warn(`Model ${modelName} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If rate limited, wait and retry might help
        if (error?.status === 429) {
          console.log("Rate limited, trying next model...");
        }
        continue;
      }
    }

    // All models failed
    const errorMessage = lastError?.message || "AI processing failed";
    const isDecommissioned = errorMessage.includes("decommissioned");
    
    return NextResponse.json(
      {
        error: isDecommissioned 
          ? "Vision models unavailable. Please check console.groq.com/docs for current models."
          : errorMessage,
        success: false,
        transactions: [],
        count: 0,
      },
      { status: 500 }
    );
    
  } catch (error) {
    console.error("Screenshot parsing error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process screenshot",
        success: false,
        transactions: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

