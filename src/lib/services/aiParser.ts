import { GoogleGenAI } from "@google/genai";
import type { StatementType } from "@/lib/types";
import { improveMerchantName } from "@/lib/descriptionLabeler";
import { STATEMENT_PARSE_PROMPT, SCREENSHOT_PARSE_PROMPT, getStatementPagePrompt } from "./aiPrompts";

interface Transaction {
  date: string;
  description: string;
  merchant: string;
  amount: number;
  currency: string;
}

interface ParsePDFRequest {
  text: string;
}

interface ParsePDFResponse {
  success: boolean;
  transactions: Transaction[];
  count: number;
}

interface ParseStatementPageRequest {
  statementType: StatementType;
  pageText: string;
  pageIndex: number;
  currency?: string;
}

interface ParseStatementPageResponse {
  success: boolean;
  transactions: Transaction[];
  count: number;
}

function extractMerchant(description: string): string {
  if (!description) return "Unknown";
  return improveMerchantName(description);
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
  
  // Use statement prompt for bank statements
  const prompt = STATEMENT_PARSE_PROMPT + statementText;

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

/**
 * Parse screenshot OCR text using Gemini AI to extract transactions
 * Optimized for mobile app screenshots with UI elements and garbled text
 */
export async function parseScreenshotWithAI(
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

  const ai = new GoogleGenAI({ apiKey });
  
  // Limit text for screenshots (usually shorter than statements)
  const screenshotText = text.substring(0, 30000);
  
  // Use screenshot prompt
  const prompt = SCREENSHOT_PARSE_PROMPT + screenshotText;

  // Try multiple model names in order of preference
  const modelNames = ["gemini-2.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.5-flash"];
  let lastError: Error | null = null;
  
  for (const modelName of modelNames) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      
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
        try {
          responseText = typeof resp.text === "function" ? await resp.text() : String(resp.text);
        } catch {
          responseText = String(resp.text);
        }
      } else if (resp.candidates && Array.isArray(resp.candidates) && resp.candidates.length > 0) {
        const candidate = resp.candidates[0];
        
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
        console.error("Failed to extract text. Full response structure:", JSON.stringify(resp, null, 2).substring(0, 2000));
        throw new Error("Empty response from AI model - could not extract text from response");
      }
      
      console.log("AI Response (first 500 chars):", responseText.substring(0, 500));
      console.log("AI Response (full length):", responseText.length);
      console.log("Input text sample (first 1000 chars):", screenshotText.substring(0, 1000));
      
      // Try to parse the JSON response with multiple strategies
      let transactions: any[] = [];
      let parseSuccess = false;
      
      // Strategy 1: Try direct JSON parse
      try {
        const cleanedResponse = responseText
          .replace(/```json\n?/gi, "")
          .replace(/```\n?/g, "")
          .replace(/^[\s\n]*\[/, "[")
          .replace(/\][\s\n]*$/, "]")
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

      // Validate and normalize transactions
      const normalized: Transaction[] = transactions
        .filter((tx: any, index: number) => {
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
            const dateMatch = normalizedDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dateMatch) {
              const [, day, month, year] = dateMatch;
              normalizedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            } else if (!normalizedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
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
      continue;
    }
  }
  
  throw new Error(
    `AI parsing failed with all models. Last error: ${lastError?.message || "Unknown error"}. Please check your GEMINI_API_KEY and model access.`
  );
}

/**
 * Parse a single statement page using AI (for parallel page-by-page processing)
 */
export async function parseStatementPageWithAI(
  request: ParseStatementPageRequest
): Promise<ParseStatementPageResponse> {
  const { statementType, pageText, pageIndex, currency = "AED" } = request;

  if (!pageText || pageText.trim().length === 0) {
    return {
      success: true,
      transactions: [],
      count: 0,
    };
  }

  // Check if page has enough content (minimum 200 chars and contains date+amount pattern)
  const hasDatePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(pageText);
  const hasAmountPattern = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(pageText);
  
  if (pageText.length < 200 || (!hasDatePattern && !hasAmountPattern)) {
    return {
      success: true,
      transactions: [],
      count: 0,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Build prompt based on statement type
  const isDebit = statementType === "enbd_debit";
  const tableFormat = isDebit
    ? "Date | Description | Debit | Credit | Balance"
    : "Transaction Date | Posting Date | Description | Amount";
  
  const amountRules = isDebit
    ? `- Debit column: amount is NEGATIVE (e.g., -108.35)
   - Credit column: amount is POSITIVE (e.g., 8458.00)
   - If only one column has a value, use that
   - Ignore the Balance column completely`
    : `- Purchases/charges: amount is NEGATIVE (e.g., -108.35)
   - Refunds/payments: amount is POSITIVE (e.g., 8458.00)
   - Include both transactionDate and postingDate if present`;
  
  const prompt = `You are a financial data extraction expert. Extract ALL financial transactions from this ${isDebit ? "bank account" : "credit card"} statement page.

The statement is in a TABLE FORMAT with columns: ${tableFormat}
The statement may contain BILINGUAL content (Arabic and English).

CRITICAL: Even if the text looks messy, garbled, or contains corrupted Arabic characters, you MUST extract transactions.

IMPORTANT RULES:
1. Extract EVERY transaction that has a date and an amount
2. Date format: Convert DD/MM/YYYY to YYYY-MM-DD (e.g., "23/12/2025" → "2025-12-23")
3. Amount calculation:
   ${amountRules}
   - Remove commas from amounts before parsing (e.g., "8,457.90" → 8457.90)
4. Merchant extraction: Extract the main business/merchant name from the description
   - Remove location suffixes like "Abu Dhabi", "Dubai", "AE", "ARE", "UAE"
5. Description: Keep the full original description from the statement
6. Currency: Default to "${currency}" unless specified otherwise
7. SKIP header rows, footer text, page numbers, and non-transaction lines

Return ONLY a valid JSON array. No markdown, no explanations, no code blocks. Just the raw JSON array.

Example output format:
[
  {"date": "2025-12-23", "description": "CARD NO.443913XXXXXX6404 CAREEM QUIK Abu Dhabi:AE", "merchant": "CAREEM QUIK", "amount": -108.35, "currency": "${currency}"},
  {"date": "2025-12-23", "description": "MOBILE BANKING TRANSFER FROM...", "merchant": "MOBILE BANKING TRANSFER", "amount": 100.00, "currency": "${currency}"}
]

Statement Page Text (Page ${pageIndex + 1}):
${pageText.substring(0, 15000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    let responseText = "";
    const resp = response as any;
    
    if (resp.text && typeof resp.text === "string") {
      responseText = resp.text;
    } else if (resp.candidates && Array.isArray(resp.candidates) && resp.candidates.length > 0) {
      const candidate = resp.candidates[0];
      if (candidate.content?.parts) {
        responseText = candidate.content.parts.map((p: any) => p.text || "").join("");
      } else if (candidate.content?.text) {
        responseText = candidate.content.text;
      }
    }
    
    if (!responseText || responseText.trim().length === 0) {
      return {
        success: true,
        transactions: [],
        count: 0,
      };
    }
    
    // Parse JSON response
    let transactions: any[] = [];
    try {
      const cleanedResponse = responseText
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/g, "")
        .trim();
      
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        transactions = JSON.parse(jsonMatch[0]);
      } else {
        transactions = JSON.parse(cleanedResponse);
      }
    } catch (e) {
      console.warn(`Failed to parse AI response for page ${pageIndex + 1}:`, e);
      return {
        success: true,
        transactions: [],
        count: 0,
      };
    }
    
    if (!Array.isArray(transactions)) {
      return {
        success: true,
        transactions: [],
        count: 0,
      };
    }
    
    // Normalize transactions
    const normalized: Transaction[] = transactions
      .filter((tx: any) => tx && tx.date && tx.amount !== undefined && tx.amount !== null)
      .map((tx: any) => {
        // Normalize date
        let normalizedDate = tx.date;
        if (typeof normalizedDate === "string") {
          const dateMatch = normalizedDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (dateMatch) {
            const [, day, month, year] = dateMatch;
            normalizedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          } else if (!normalizedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
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
          normalizedAmount = parseFloat(tx.amount.replace(/,/g, "")) || 0;
        }
        
        return {
          date: normalizedDate,
          description: (tx.description || "").trim(),
          merchant: (tx.merchant || extractMerchant(tx.description || "")).trim(),
          amount: normalizedAmount,
          currency: (tx.currency || currency).toUpperCase(),
        };
      })
      .filter((tx) => tx.date && tx.date.match(/^\d{4}-\d{2}-\d{2}$/) && tx.amount !== 0);
    
    return {
      success: true,
      transactions: normalized,
      count: normalized.length,
    };
  } catch (error) {
    console.error(`AI parsing failed for page ${pageIndex + 1}:`, error);
    return {
      success: false,
      transactions: [],
      count: 0,
    };
  }
}
