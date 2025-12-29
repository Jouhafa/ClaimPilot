/**
 * AI Prompts for financial data extraction
 * Separated for better organization and maintainability
 */

/**
 * Prompt for parsing bank statements (PDF/CSV format)
 * Optimized for structured table format with Date | Description | Debit | Credit | Balance columns
 */
export const STATEMENT_PARSE_PROMPT = `You are a financial data extraction expert. Extract ALL financial transactions from this Emirates NBD bank statement.

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
`;

/**
 * Prompt for parsing mobile app screenshots
 * Optimized for OCR text from mobile banking apps with UI elements and garbled text
 */
export const SCREENSHOT_PARSE_PROMPT = `You are a financial data extraction expert. Extract ALL financial transactions from this text, which is from:
- A mobile banking app screenshot
- A transaction list from any financial app

The text may be messy, garbled, or contain UI elements from screenshots. You MUST extract transactions even if the format is unusual.

CRITICAL: Extract transactions from ANY format, including:
- Mobile app transaction lists (merchant name, amount, category)
- Screenshot OCR text with UI elements mixed in
- Garbled text from OCR processing

Look for these patterns (even in garbled text):
- Merchant/business names (e.g., "Noon Food", "Careem Quik", "Shake Shack", "Amazon Grocery", "Metro Taxi")
- Amounts with currency symbols or codes (e.g., "-B 45.40", "-Đ 45.40", "AED 45.40", "45.40 AED", "-B 8", "-B 48.15")
- Patterns like: "MerchantName -B amount" or "MerchantName -Đ amount" or "MerchantName amount"
- Categories nearby (e.g., "Restaurants", "Taxi", "Fast Food", "Supermarket", "Hobbies & Gifts")
- Even if text is broken across lines, look for merchant names followed by amounts

EXAMPLES of what to extract:
- "Noon Food -B 45.40" → {"merchant": "Noon Food", "amount": -45.40}
- "Careem Quik -B 8" → {"merchant": "Careem Quik", "amount": -8.00}
- "Careem Food -B 48.15" → {"merchant": "Careem Food", "amount": -48.15}
- "Shake Shack Alshaya -B 10.00" → {"merchant": "Shake Shack Alshaya", "amount": -10.00}
- "Amazon Grocery -B 74.95" → {"merchant": "Amazon Grocery", "amount": -74.95}

IMPORTANT RULES:
1. Extract EVERY transaction that has a merchant name and an amount - even if the text is garbled
2. Date handling:
   - Screenshots typically don't have dates, so use today's date (YYYY-MM-DD format)
   - If date is provided: Convert to YYYY-MM-DD format (e.g., "23/12/2025" → "2025-12-23")
   - If date is relative (e.g., "YESTERDAY"): Use today's date minus 1 day
   - If no date found: Use today's date
3. Amount calculation:
   - Negative amounts (expenses): Look for "-", "Debit", negative signs, or patterns like "-B" or "-Đ"
   - Positive amounts (income): Look for "+", "Credit", or positive signs
   - Remove currency symbols and codes (B, Đ, AED, etc.) before parsing
   - Remove commas from amounts (e.g., "1,234.56" → 1234.56)
   - Amounts are typically NEGATIVE for expenses (e.g., "-B 45.40" → -45.40, "-Đ 45.40" → -45.40)
   - If amount appears incomplete (e.g., "-B 8"), extract what you can
4. Merchant extraction:
   - Extract the main business/merchant name
   - Examples: "Noon Food" → "Noon Food", "Careem Quik" → "Careem Quik", "Shake Shack Alshaya" → "Shake Shack Alshaya"
   - Remove location suffixes, currency codes, and extra text
   - If merchant appears multiple times, use the same name consistently
   - Even if merchant name is split across lines, combine it
5. Description: Use the merchant name as description if no separate description is available
6. Currency: Default to "AED" unless clearly specified otherwise
7. Format detection:
   - Mobile app format: Usually has merchant name, amount, and category on separate lines
   - Screenshot format: May have UI elements, icons, or garbled text - extract what you can
   - Even if text looks like "Noon Food -B 45.40" on one line and "Restaurants" on another, extract the transaction
8. SKIP these:
   - UI elements (buttons, icons, navigation)
   - Headers like "TRANSACTIONS", "Search", time stamps like "2:43"
   - Page numbers, footers, disclaimers
   - Lines without merchant names and amounts
9. CRITICAL: If you see merchant names with amounts (even if garbled), extract them. Do NOT return an empty array []. Always extract at least one transaction if you see any merchant name and amount pattern.

Return ONLY a valid JSON array. No markdown, no explanations, no code blocks. Just the raw JSON array. If you cannot find any transactions, return an empty array, but ONLY if there are truly no merchant names and amounts in the text.

Example output format:
[
  {"date": "2025-12-23", "description": "Noon Food", "merchant": "Noon Food", "amount": -45.40, "currency": "AED"},
  {"date": "2025-12-23", "description": "Careem Quik", "merchant": "Careem Quik", "amount": -37.58, "currency": "AED"},
  {"date": "2025-12-23", "description": "Careem Food", "merchant": "Careem Food", "amount": -48.15, "currency": "AED"},
  {"date": "2025-12-23", "description": "Shake Shack Alshaya", "merchant": "Shake Shack Alshaya", "amount": -10.00, "currency": "AED"},
  {"date": "2025-12-23", "description": "Amazon Grocery", "merchant": "Amazon Grocery", "amount": -74.95, "currency": "AED"}
]

IMPORTANT: Even if the text is garbled or contains UI elements, extract what you can. Look for merchant names and amounts. If you see patterns like "Noon Food -B 45.40" or "Careem Quik -Đ 37.58", extract them as transactions.

Input Text:
`;

/**
 * Prompt for parsing a single statement page (for parallel processing)
 * Used when processing multi-page statements page by page
 */
export function getStatementPagePrompt(
  statementType: "enbd_debit" | "enbd_credit",
  currency: string = "AED",
  pageIndex: number
): string {
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
  
  return `You are a financial data extraction expert. Extract ALL financial transactions from this ${isDebit ? "bank account" : "credit card"} statement page.

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
`;
}

