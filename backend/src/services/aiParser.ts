import { GoogleGenAI } from "@google/genai";
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

  // Use the new API format - the client gets the API key from environment variable
  const ai = new GoogleGenAI({ apiKey });
  
  // Increase text limit for multi-page statements
  const statementText = text.substring(0, 50000); // Increased for multi-page statements
  
  const prompt = `You are a financial data extraction expert. Extract ALL financial transactions from this Emirates NBD bank statement.

The statement is in a TABLE FORMAT with columns: Date | Description | Debit | Credit | Balance
The statement may contain BILINGUAL content (Arabic and English).

CRITICAL: Even if the text looks messy, garbled, or contains corrupted Arabic characters, you MUST extract transactions. 
The PDF may have bidirectional text extraction issues, but the English transaction data should still be readable.

Look for these patterns even in garbled text:
- Dates in DD/MM/YYYY format (e.g., 23/12/2025, 16/12/2025)
- Amounts with commas and decimals (e.g., 8,457.90, 108.35, 2,700.00)
- English transaction descriptions (e.g., "CAREEM QUIK", "MOBILE BANKING TRANSFER", "THE BOSTON CONSULTING GROUP")
- Transaction patterns: "CARD NO.", "CC NO.", "TT REF:", "IPP", "RMA", "MOBILE BANKING"

Even if Arabic text is garbled (appears as disconnected characters), focus on extracting the English transaction data.

IMPORTANT RULES:
1. Extract EVERY transaction that has a date and an amount (either in Debit or Credit column)
2. Date format: Convert DD/MM/YYYY to YYYY-MM-DD (e.g., "23/12/2025" → "2025-12-23")
3. Amount calculation:
   - If there's a value in the Debit column: amount is NEGATIVE (e.g., -108.35)
   - If there's a value in the Credit column: amount is POSITIVE (e.g., 8458.00)
   - If only one column has a value, use that
   - Ignore the Balance column completely
   - Remove commas from amounts before parsing (e.g., "8,457.90" → 8457.90)
   - Handle amounts like "8,457.90" → 8457.90, "108.35" → 108.35
4. Merchant extraction: Extract the main business/merchant name from the description
   - Examples: "CAREEM QUIK Abu Dhabi:AE" → "CAREEM QUIK"
   - "THE BOSTON CONSULTING GROUP" → "THE BOSTON CONSULTING GROUP"
   - "MOBILE BANKING TRANSFER FROM..." → "MOBILE BANKING TRANSFER"
   - "MOBILE BANKING TRANSFER TO..." → "MOBILE BANKING TRANSFER"
   - Remove location suffixes like "Abu Dhabi", "Dubai", "AE", "ARE", "UAE"
   - Ignore Arabic text when extracting merchant names
5. Description: Keep the full original description from the statement (including both English and Arabic if present)
6. Currency: Default to "AED" unless specified otherwise
7. Table parsing:
   - The statement uses a table format with pipe separators (|) or column alignment
   - Each row represents one transaction
   - Multi-line descriptions may span multiple rows - combine them into one description
   - Look for patterns like: "Date | Description | Debit | Credit | Balance"
   - Even if columns are not perfectly aligned, extract data based on date and amount patterns
8. SKIP these lines:
   - Header rows (Date, Description, Debit, Credit, Balance, or Arabic equivalents: تاريخ, تفاصيل, مدين, دائن, رصيد)
   - Footer text (bank details, disclaimers, "This is an electronically generated statement")
   - Page numbers ("Page X of Y" or "صفحة X من Y")
   - Account summary lines
   - Lines without dates or amounts
   - Bank contact information
   - Legal disclaimers

Return ONLY a valid JSON array. No markdown, no explanations, no code blocks. Just the raw JSON array.

Example output format:
[
  {"date": "2025-12-23", "description": "CARD NO.443913XXXXXX6404 CAREEM QUIK Abu Dhabi:AE 246138 22-12-2025 108.35,AED", "merchant": "CAREEM QUIK", "amount": -108.35, "currency": "AED"},
  {"date": "2025-12-23", "description": "CC NO.-522873XXXXXX1275 RMA REF NO.-EBIA7C4702470B D", "merchant": "RMA", "amount": -8457.90, "currency": "AED"},
  {"date": "2025-12-23", "description": "IPP 20251223WIO6898111129779796 LN98172853457848 A ED 8458 ZAKARYA JOUHAFA CARD PAYMENT", "merchant": "CARD PAYMENT", "amount": 8458.00, "currency": "AED"},
  {"date": "2025-12-16", "description": "TT REF: EC39QS5X AED 226 THE BOSTON CONSULTING GROUP BLD TH /REF/PMS", "merchant": "THE BOSTON CONSULTING GROUP", "amount": 226.00, "currency": "AED"},
  {"date": "2025-12-14", "description": "MOBILE BANKING TRANSFER FROM AE440260000975938394602 REFNO:-14B8FB961F41", "merchant": "MOBILE BANKING TRANSFER", "amount": 100.00, "currency": "AED"}
]

Bank Statement Text:
${statementText}`;

  // Try multiple model names in order of preference
  const modelNames = ["gemini-2.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.5-flash"];
  let lastError: Error | null = null;
  
  for (const modelName of modelNames) {
    try {
      // Use the new API format: ai.models.generateContent
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      
      // Handle different response formats - check what properties are available
      let responseText = "";
      const resp = response as any;
      
      // Log the structure for debugging
      console.log("Response keys:", Object.keys(resp || {}));
      if (resp.candidates) {
        console.log("Candidates length:", resp.candidates.length);
        if (resp.candidates[0]) {
          console.log("First candidate keys:", Object.keys(resp.candidates[0]));
          console.log("First candidate:", JSON.stringify(resp.candidates[0]).substring(0, 500));
        }
      }
      
      // Try different ways to access the text
      if (resp.text && typeof resp.text === "string") {
        responseText = resp.text;
      } else if (resp.text) {
        // text might be a getter or method
        try {
          responseText = typeof resp.text === "function" ? await resp.text() : String(resp.text);
        } catch {
          responseText = String(resp.text);
        }
      } else if (resp.candidates && Array.isArray(resp.candidates) && resp.candidates.length > 0) {
        // Try accessing through candidates array (common in Gemini API)
        const candidate = resp.candidates[0];
        
        // Try different candidate structures
        if (candidate.content) {
          if (candidate.content.parts && Array.isArray(candidate.content.parts)) {
            responseText = candidate.content.parts.map((p: any) => p.text || "").join("");
          } else if (candidate.content.text) {
            responseText = candidate.content.text;
          } else if (typeof candidate.content === "string") {
            responseText = candidate.content;
          }
        } else if (candidate.text) {
          responseText = candidate.text;
        } else if (candidate.parts && Array.isArray(candidate.parts)) {
          responseText = candidate.parts.map((p: any) => p.text || "").join("");
        }
      }
      
      if (!responseText || responseText.trim().length === 0) {
        // Log the full response structure for debugging
        console.error("Failed to extract text. Full response structure:", JSON.stringify(resp, null, 2).substring(0, 2000));
        throw new Error("Empty response from AI model - could not extract text from response");
      }
      
      console.log("AI Response (first 500 chars):", responseText.substring(0, 500));
      console.log("AI Response (full length):", responseText.length);
      
      // Log the input text sample for debugging
      console.log("Input text sample (first 1000 chars):", statementText.substring(0, 1000));
      
      // Try to parse the JSON response with multiple strategies
      let transactions: any[] = [];
      let parseSuccess = false;
      
      // Strategy 1: Try direct JSON parse
      try {
        const cleanedResponse = responseText
          .replace(/```json\n?/gi, "")
          .replace(/```\n?/g, "")
          .replace(/^[\s\n]*\[/, "[") // Remove leading whitespace before [
          .replace(/\][\s\n]*$/, "]") // Remove trailing whitespace after ]
          .trim();
        
        transactions = JSON.parse(cleanedResponse);
        if (Array.isArray(transactions)) {
          parseSuccess = true;
        }
      } catch (e) {
        // Try next strategy
      }
      
      // Strategy 2: Extract JSON array from text using regex
      if (!parseSuccess) {
        try {
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            transactions = JSON.parse(jsonMatch[0]);
            if (Array.isArray(transactions)) {
              parseSuccess = true;
            }
          }
        } catch (e) {
          // Try next strategy
        }
      }
      
      // Strategy 3: Try to find and extract array from markdown code blocks
      if (!parseSuccess) {
        try {
          const codeBlockMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])/);
          if (codeBlockMatch) {
            transactions = JSON.parse(codeBlockMatch[1]);
            if (Array.isArray(transactions)) {
              parseSuccess = true;
            }
          }
        } catch (e) {
          // Last resort
        }
      }
      
      if (!parseSuccess || !Array.isArray(transactions)) {
        console.error("Failed to parse Gemini response. Full response:", responseText);
        console.error("Response length:", responseText.length);
        throw new Error(`Failed to parse AI response as JSON array. Response preview: ${responseText.substring(0, 200)}`);
      }
      
      console.log(`Successfully parsed ${transactions.length} transactions from AI response`);

      // Validate and normalize transactions with better error handling
      const normalized: Transaction[] = transactions
        .filter((tx: any, index: number) => {
          // Filter out invalid transactions
          if (!tx || typeof tx !== "object") {
            console.warn(`Transaction ${index} is not an object:`, tx);
            return false;
          }
          if (!tx.date) {
            console.warn(`Transaction ${index} missing date:`, tx);
            return false;
          }
          if (tx.amount === undefined || tx.amount === null) {
            console.warn(`Transaction ${index} missing amount:`, tx);
            return false;
          }
          return true;
        })
        .map((tx: any, index: number) => {
          // Normalize date format
          let normalizedDate = tx.date;
          if (typeof normalizedDate === "string") {
            // Handle DD/MM/YYYY format
            const dateMatch = normalizedDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dateMatch) {
              const [, day, month, year] = dateMatch;
              normalizedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            } else if (!normalizedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Try to parse other date formats
              const parsedDate = new Date(normalizedDate);
              if (!isNaN(parsedDate.getTime())) {
                normalizedDate = parsedDate.toISOString().split("T")[0];
              }
            }
          }
          
          // Normalize amount
          let normalizedAmount = 0;
          if (typeof tx.amount === "number") {
            normalizedAmount = tx.amount;
          } else if (typeof tx.amount === "string") {
            // Remove commas and parse
            normalizedAmount = parseFloat(tx.amount.replace(/,/g, "")) || 0;
          }
          
          // Extract merchant if not provided
          let merchant = tx.merchant || extractMerchant(tx.description || "");
          
          return {
            date: normalizedDate,
            description: (tx.description || "").trim(),
            merchant: merchant.trim(),
            amount: normalizedAmount,
            currency: (tx.currency || "AED").toUpperCase(),
          };
        })
        .filter((tx) => {
          // Final validation - ensure we have valid data
          return tx.date && tx.date.match(/^\d{4}-\d{2}-\d{2}$/) && tx.amount !== 0;
        });
      
      console.log(`Normalized ${normalized.length} valid transactions from ${transactions.length} raw transactions`);

      return {
        success: true,
        transactions: normalized,
        count: normalized.length,
      };
    } catch (error) {
      console.warn(`Model ${modelName} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next model
      continue;
    }
  }
  
  // If all models failed, throw the last error
  throw new Error(
    `AI parsing failed with all models. Last error: ${lastError?.message || "Unknown error"}. Please check your GEMINI_API_KEY and model access.`
  );
}
