import Papa from "papaparse";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, Rule, StatementType } from "./types";
import { ruleMatchesTransaction, getRuleTag } from "./types";
import {
  extractDebitRows,
  extractCreditRows,
  detectTransfer,
  classifyTransactionKind,
  calculateConfidence,
  isDescriptionTruncated,
  isValidAmount,
} from "./statementParser";
import { improveTransactionDescription } from "./descriptionLabeler";

// Parser version for debugging and verification
export const PARSER_VERSION = "2025-12-26-ENBD-v2";

// Parse date from various formats
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  
  // Try DD/MM/YYYY format (common in UAE bank statements)
  const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  // Try DD-MM-YYYY format
  const ddmmyyyyDash = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyDash) {
    const [, day, month, year] = ddmmyyyyDash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Try DD/MM/YY format
  const ddmmyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (ddmmyy) {
    const [, day, month, year] = ddmmyy;
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  // Try YYYY-MM-DD format
  const yyyymmdd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    return dateStr;
  }
  
  // Try to parse with Date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  
  return new Date().toISOString().split("T")[0];
}

// Parse amount string to number
// Handles formats: "8,457.90", "108.35,AED", "302,00 Cr", "108.35"
function parseAmount(amountStr: string | number | undefined, isCredit: boolean = false): number {
  if (amountStr === undefined || amountStr === null || amountStr === "") return 0;
  if (typeof amountStr === "number") return isCredit ? amountStr : -amountStr;
  
  // Check if it's a credit (has CR suffix - can be before or after amount)
  const upperStr = amountStr.toUpperCase();
  const isCreditAmount = upperStr.includes("CR") || upperStr.includes("CREDIT");
  
  // Handle "108.35,AED" format - extract number before comma+currency
  // Pattern: digits with optional commas, decimal, then comma+currency
  let cleaned = amountStr;
  
  // Remove "Cr" suffix if present (e.g., "302,00 Cr")
  cleaned = cleaned.replace(/\s*Cr\s*$/i, "");
  
  // Handle "108.35,AED" format - extract number part before comma+currency
  // Match: digits.decimals,currency or digits,decimals,currency
  const commaCurrencyMatch = cleaned.match(/^([\d,]+\.?\d*)\s*,\s*[A-Z]{2,4}/i);
  if (commaCurrencyMatch) {
    cleaned = commaCurrencyMatch[1];
  }
  
  // Remove currency symbols, commas (thousand separators), spaces, CR/DR
  cleaned = cleaned
    .replace(/[AED$€£]/gi, "") // Remove currency symbols
    .replace(/,/g, "") // Remove all commas (both thousand separators and currency separators)
    .replace(/\s+/g, "") // Remove spaces
    .replace(/CR|DR/gi, "") // Remove CR/DR if still present
    .replace(/[()]/g, "") // Remove parentheses
    .trim();
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  
  // Credits are positive, debits are negative
  return isCreditAmount || isCredit ? num : -num;
}

// Extract merchant from description using improved labeler
function extractMerchant(description: string): string {
  if (!description) return "Unknown";
  
  // Use the improved description labeler for better merchant extraction
  const improved = improveTransactionDescription(description);
  return improved.merchant;
}

// Apply rules to get default tag
function applyRules(transaction: Partial<Transaction>, rules: Rule[]): Transaction["tag"] {
  // Create a mock transaction for matching
  const mockTx: Transaction = {
    id: "",
    date: transaction.date || "",
    merchant: transaction.merchant || "",
    description: transaction.description || "",
    amount: transaction.amount || 0,
    currency: transaction.currency || "AED",
    tag: null,
    createdAt: "",
  };
  
  for (const rule of rules) {
    if (ruleMatchesTransaction(rule, mockTx)) {
      return getRuleTag(rule);
    }
  }
  
  return null;
}

// Parse CSV file
export async function parseCSV(file: File, rules: Rule[] = []): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions = results.data.map((row) => {
            // Try to find date, description, debit, credit columns
            const dateKey = Object.keys(row).find((k) =>
              /date|تاريخ/i.test(k)
            );
            const descKey = Object.keys(row).find((k) =>
              /description|details|تفاصيل|وصف/i.test(k)
            );
            const debitKey = Object.keys(row).find((k) =>
              /debit|مدين/i.test(k)
            );
            const creditKey = Object.keys(row).find((k) =>
              /credit|دائن/i.test(k)
            );
            const amountKey = Object.keys(row).find((k) =>
              /amount|مبلغ/i.test(k)
            );

            const date = parseDate(row[dateKey || "Date"] || "");
            const description = row[descKey || "Description"] || "";
            
            let amount: number;
            if (amountKey && row[amountKey]) {
              amount = parseAmount(row[amountKey]);
            } else {
              const debit = parseAmount(row[debitKey || "Debit"]);
              const credit = parseAmount(row[creditKey || "Credit"], true);
              amount = credit !== 0 ? credit : debit;
            }

            const merchant = extractMerchant(description);

            const tx: Transaction = {
              id: uuidv4(),
              date,
              merchant,
              description,
              amount,
              currency: "AED",
              tag: null,
              createdAt: new Date().toISOString(),
            };

            tx.tag = applyRules(tx, rules);
            return tx;
          });

          resolve(transactions.filter((tx) => tx.description || tx.amount !== 0));
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error),
    });
  });
}

// Parse Excel file
export async function parseExcel(file: File, rules: Rule[] = []): Promise<Transaction[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<Record<string, string | number>>(firstSheet);

  return data.map((row) => {
    const dateKey = Object.keys(row).find((k) => /date|تاريخ/i.test(k));
    const descKey = Object.keys(row).find((k) => /description|details|تفاصيل/i.test(k));
    const debitKey = Object.keys(row).find((k) => /debit|مدين/i.test(k));
    const creditKey = Object.keys(row).find((k) => /credit|دائن/i.test(k));
    const amountKey = Object.keys(row).find((k) => /amount|مبلغ/i.test(k));

    const date = parseDate(String(row[dateKey || "Date"] || ""));
    const description = String(row[descKey || "Description"] || "");
    
    let amount: number;
    if (amountKey && row[amountKey]) {
      amount = parseAmount(row[amountKey]);
    } else {
      const debit = parseAmount(row[debitKey || "Debit"]);
      const credit = parseAmount(row[creditKey || "Credit"], true);
      amount = credit !== 0 ? credit : debit;
    }

    const merchant = extractMerchant(description);

    const tx: Transaction = {
      id: uuidv4(),
      date,
      merchant,
      description,
      amount,
      currency: "AED",
      tag: null,
      createdAt: new Date().toISOString(),
    };

    tx.tag = applyRules(tx, rules);
    return tx;
  }).filter((tx) => tx.description || tx.amount !== 0);
}

// Parse PDF using pdf.js
export async function parsePDF(file: File, rules: Rule[] = []): Promise<Transaction[]> {
  // Dynamically import pdf.js to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist");
  
  // Set worker source to local file
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = "";
  let fullTextWithSpacing = "";
  
  // Extract text from all pages with improved spacing preservation and bidirectional text handling
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    
    try {
      const textContent = await page.getTextContent();
      
      // Build text with spacing preservation for table detection
      const lineItems: Array<{ x: number; y: number; text: string }> = [];
      
      for (const item of textContent.items) {
        if ("str" in item && "transform" in item) {
          const transform = item.transform as number[];
          const x = transform[4];
          const y = transform[5];
          const str = item.str;
          
          if (str.trim().length > 0) {
            lineItems.push({ x, y, text: str });
          }
        }
      }
      
      // Group items by Y position (same line)
      const lines = new Map<number, Array<{ x: number; text: string }>>();
      for (const item of lineItems) {
        const yKey = Math.round(item.y / 10) * 10; // Larger tolerance
        if (!lines.has(yKey)) {
          lines.set(yKey, []);
        }
        lines.get(yKey)!.push({ x: item.x, text: item.text });
      }
      
      // Sort lines by Y (top to bottom)
      const sortedLines = Array.from(lines.entries()).sort((a, b) => b[0] - a[0]);
      
      let lineText = "";
      for (const [y, items] of sortedLines) {
        // Sort items by X (left to right) - preserve natural order
        items.sort((a, b) => a.x - b.x);
        
        let line = "";
        let lastX = 0;
        for (const item of items) {
          if (lastX > 0) {
            const gap = item.x - lastX;
            if (gap > 20) {
              line += " | "; // Column separator
            } else if (gap > 8) {
              line += " ";
            }
          }
          line += item.text;
          lastX = item.x;
        }
        if (line.trim().length > 0) {
          lineText += line + "\n";
        }
      }
      
      fullTextWithSpacing += lineText + "\n";
      
      // Also build simple text version preserving natural reading order
      // This is important for bidirectional text (Arabic + English)
      let pageText = "";
      let lastY = -1;
      for (const item of textContent.items) {
        if ("str" in item && "transform" in item) {
          const transform = item.transform as number[];
          const y = transform[5];
          const str = item.str;
          
          // Add newline when Y position changes significantly (new line)
          if (lastY >= 0 && Math.abs(y - lastY) > 5) {
            pageText += "\n";
          } else if (lastY >= 0 && Math.abs(y - lastY) <= 5 && pageText.length > 0) {
            // Same line, add space
            pageText += " ";
          }
          
          pageText += str;
          lastY = y;
        }
      }
      fullText += pageText + "\n";
    } catch (err) {
      console.warn(`Error extracting text from page ${i}:`, err);
      // Continue with next page
    }
  }
  
  // Try table parser first with formatted text, then with simple text, then fallback to regular parser
  console.log("PDF parsing: Trying table parser with formatted text...");
  const tableResults = parsePDFTable(fullTextWithSpacing, rules);
  if (tableResults.length > 0) {
    console.log(`PDF parsing: Table parser found ${tableResults.length} transactions`);
    return tableResults;
  }
  
  // Try table parser with simple text
  console.log("PDF parsing: Trying table parser with simple text...");
  const tableResultsSimple = parsePDFTable(fullText, rules);
  if (tableResultsSimple.length > 0) {
    console.log(`PDF parsing: Table parser (simple) found ${tableResultsSimple.length} transactions`);
    return tableResultsSimple;
  }
  
  console.log("PDF parsing: Falling back to regular parser...");
  return parsePDFText(fullText, rules);
}

// Parse PDF text as table format (Date | Description | Debit | Credit | Balance)
export function parsePDFTable(text: string, rules: Rule[] = []): Transaction[] {
  const transactions: Transaction[] = [];
  
  // Detect table format by looking for header row or transaction patterns
  const headerPatterns = [
    /date\s*\|.*description.*\|.*debit.*\|.*credit.*\|.*balance/i,
    /تاريخ\s*\|.*تفاصيل.*\|.*مدين.*\|.*دائن.*\|.*رصيد/i,
    /date.*description.*debit.*credit.*balance/i,
    /تاريخ.*تفاصيل.*مدين.*دائن.*رصيد/i,
    /statement.*of.*account/i, // Statement header
  ];
  
  // Also check for transaction patterns (date followed by amounts)
  const transactionPattern = /\d{1,2}\/\d{1,2}\/\d{4}.*\d{1,3}(?:,\d{3})*(?:\.\d{2})/;
  const hasTransactions = transactionPattern.test(text);
  
  const hasTableHeader = headerPatterns.some(pattern => pattern.test(text));
  
  // If we have transaction patterns, try to parse even without explicit header
  if (!hasTableHeader && !hasTransactions) {
    console.log("Table parser: No table format detected");
    return []; // Not a table format
  }
  
  console.log("Table parser: Detected table format, parsing...");
  
  // Split into lines
  const lines = text.split(/\n/);
  let inTableSection = false;
  let headerFound = hasTableHeader; // If we detected header, we're already in table section
  
  // Find header row and start parsing
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check if this is a header row
    const isHeader = headerPatterns.some(pattern => pattern.test(line)) ||
      /^\s*date\s+.*description/i.test(line) ||
      /^\s*تاريخ\s+.*تفاصيل/i.test(line) ||
      /^\s*date\s*\|/i.test(line) ||
      /^\s*تاريخ\s*\|/i.test(line);
    
    if (isHeader) {
      headerFound = true;
      inTableSection = true;
      console.log("Table parser: Found header at line", i);
      continue;
    }
    
    // If no explicit header but we see date pattern, start parsing
    if (!headerFound && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(line)) {
      inTableSection = true;
      headerFound = true; // Assume we're in transactions section
    }
    
    // Stop if we hit footer text
    if (inTableSection && (
      /statement.*correctness/i.test(line) ||
      /كشف.*صحيح/i.test(line) ||
      /emirates nbd bank.*licensed/i.test(line) ||
      /بنك.*الإمارات.*مرخص/i.test(line) ||
      /page \d+ of \d+/i.test(line) ||
      /صفحة.*من/i.test(line) ||
      /this is an electronically generated/i.test(line) ||
      /تم إنشاء.*إلكتروني/i.test(line)
    )) {
      console.log("Table parser: Hit footer at line", i);
      break;
    }
    
    if (!inTableSection) continue;
    
    // Parse transaction row
    // Format: Date | Description | Debit | Credit | Balance
    // Handle both pipe-separated and space-separated formats
    
    // First, try to extract date
    const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (!dateMatch) continue;
    
    const dateStr = dateMatch[1];
    const dateIndex = line.indexOf(dateStr);
    const afterDate = line.substring(dateIndex + dateStr.length).trim();
    
    // Try pipe-separated format first
    const parts = line.split(/\s*\|\s*/);
    
    if (parts.length >= 4) {
      // Pipe-separated format
      const description = parts[1].trim();
      const debitStr = parts[2].trim();
      const creditStr = parts[3].trim();
      
      // Skip if description looks like a header
      if (
        /^(date|description|debit|credit|balance|تاريخ|تفاصيل|مدين|دائن|رصيد)$/i.test(description) ||
        description.length === 0
      ) {
        continue;
      }
      
      const debit = parseAmount(debitStr);
      const credit = parseAmount(creditStr, true);
      const amount = credit !== 0 ? credit : debit;
      
      if (amount !== 0) {
        const merchant = extractMerchant(description);
        const tx: Transaction = {
          id: uuidv4(),
          date: parseDate(dateStr),
          merchant,
          description,
          amount,
          currency: "AED",
          tag: null,
          createdAt: new Date().toISOString(),
        };
        tx.tag = applyRules(tx, rules);
        transactions.push(tx);
      }
      continue;
    }
    
    // If no pipes, try to parse as space-separated with date pattern
      // Look for amounts (numbers with commas/decimals, possibly with "Cr" suffix)
      // Pattern: digits with optional commas, decimal point, and optional "Cr"
      const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(Cr)?/gi;
      const amounts: Array<{ value: string; isCredit: boolean; index: number }> = [];
      let match;
      const amountMatches: RegExpExecArray[] = [];
      let tempMatch;
      while ((tempMatch = amountPattern.exec(afterDate)) !== null) {
        amountMatches.push(tempMatch);
      }
      
      // Process matches
      for (const m of amountMatches) {
        amounts.push({
          value: m[1],
          isCredit: m[2]?.toUpperCase() === "CR" || false,
          index: m.index || 0,
        });
      }
    
    if (amounts.length >= 2) {
      // Likely has both debit and credit columns
      // First amount is usually debit, second is credit
      const debitStr = amounts[0].value;
      const creditStr = amounts[1].value;
      const debit = parseAmount(debitStr);
      const credit = parseAmount(creditStr, true);
      const amount = credit !== 0 ? credit : debit;
      
      // Extract description (between date and first amount)
      const firstAmountIndex = afterDate.indexOf(amounts[0].value);
      const description = afterDate.substring(0, firstAmountIndex).trim();
      
      if (description && amount !== 0) {
        const merchant = extractMerchant(description);
        const tx: Transaction = {
          id: uuidv4(),
          date: parseDate(dateStr),
          merchant,
          description,
          amount,
          currency: "AED",
          tag: null,
          createdAt: new Date().toISOString(),
        };
        tx.tag = applyRules(tx, rules);
        transactions.push(tx);
      }
    } else if (amounts.length === 1) {
      // Single amount - determine if debit or credit
      const amountData = amounts[0];
      const amountIndex = afterDate.indexOf(amountData.value);
      const description = afterDate.substring(0, amountIndex).trim();
      const afterAmount = afterDate.substring(amountIndex + amountData.value.length);
      const isCredit = amountData.isCredit || /cr|credit|دائن/i.test(afterAmount) || /cr|credit|دائن/i.test(line);
      const amount = parseAmount(amountData.value, isCredit);
      
      if (description && amount !== 0) {
        const merchant = extractMerchant(description);
        const tx: Transaction = {
          id: uuidv4(),
          date: parseDate(dateStr),
          merchant,
          description,
          amount,
          currency: "AED",
          tag: null,
          createdAt: new Date().toISOString(),
        };
        tx.tag = applyRules(tx, rules);
        transactions.push(tx);
      }
    }
    
  }
  
  // Deduplicate transactions
  const seen = new Set<string>();
  const unique = transactions.filter((tx) => {
    const key = `${tx.date}-${tx.merchant}-${tx.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  console.log(`Table parser: Found ${unique.length} unique transactions from ${transactions.length} total`);
  
  return unique;
}

// Parse extracted PDF text
export function parsePDFText(text: string, rules: Rule[] = []): Transaction[] {
  const transactions: Transaction[] = [];
  
  // First, try table parser if it looks like a table format
  const tableResults = parsePDFTable(text, rules);
  if (tableResults.length > 0) {
    return tableResults;
  }
  
  // Emirates NBD Credit Card Statement pattern
  // Format: DD/MM/YYYY DD/MM/YYYY DESCRIPTION AMOUNT
  // Transaction Date | Posting Date | Description | Amount
  
  // Split by lines and clean up
  const lines = text.split(/\n|\s{3,}/);
  
  // Pattern for date: DD/MM/YYYY
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})/g;
  
  // Pattern for amount with optional CR suffix
  const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2}))\s*(CR)?/i;
  
  // Find all potential transaction lines
  // A transaction typically has: date date description amount
  let currentLine = "";
  
  for (const line of lines) {
    currentLine += " " + line;
    
    // Check if we have a complete transaction
    const dates = currentLine.match(datePattern);
    const amountMatch = currentLine.match(amountPattern);
    
    if (dates && dates.length >= 1 && amountMatch) {
      const transactionDate = dates[0];
      const postingDate = dates[1] || dates[0];
      const amount = amountMatch[1];
      const isCredit = amountMatch[2]?.toUpperCase() === "CR";
      
      // Extract description (text between dates and amount)
      let description = currentLine
        .replace(datePattern, "")
        .replace(amountPattern, "")
        .replace(/\s+/g, " ")
        .trim();
      
      // Skip header rows and non-transaction lines
      if (
        description &&
        !description.match(/^(Transaction Date|تاريخ|Page|Credit Limit|Statement|Card Number|Primary Card)/i) &&
        !description.match(/^(Pay on the go|Use your phone|Emirates NBD|MARRIOTT)/i)
      ) {
        const merchant = extractMerchant(description);
        const parsedAmount = parseAmount(amount, isCredit);
        
        // Only add if we have a valid amount
        if (parsedAmount !== 0) {
          const tx: Transaction = {
            id: uuidv4(),
            date: parseDate(transactionDate),
            merchant,
            description,
            amount: parsedAmount,
            currency: "AED",
            tag: null,
            createdAt: new Date().toISOString(),
          };
          
          tx.tag = applyRules(tx, rules);
          transactions.push(tx);
        }
      }
      
      // Reset for next transaction
      currentLine = "";
    }
  }
  
  // Deduplicate transactions (same date, merchant, amount)
  const seen = new Set<string>();
  const unique = transactions.filter((tx) => {
    const key = `${tx.date}-${tx.merchant}-${tx.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  return unique;
}

/**
 * Parse PDF text with statement type-specific logic
 * Returns transactions with confidence score and debug info
 */
export function parsePDFTextWithType(
  text: string,
  statementType: StatementType,
  rules: Rule[] = [],
  sourceFileName?: string,
  debug?: { extractedRowCount?: number; pageCount?: number }
): {
  transactions: Transaction[];
  confidence: number;
  confidenceReasons: string[];
  extractedRowCount: number;
} {
  const transactions: Transaction[] = [];
  
  let rows: string[] = [];
  if (statementType === "enbd_debit") {
    rows = extractDebitRows(text);
  } else if (statementType === "enbd_credit") {
    rows = extractCreditRows(text);
  } else {
    // Fallback to existing parser for unknown types
    const fallbackTxs = parsePDFText(text, rules);
    return {
      transactions: fallbackTxs,
      confidence: 0.5, // Unknown type, lower confidence
      confidenceReasons: ["Unknown statement type, using generic parser"],
      extractedRowCount: 0,
    };
  }
  
  const extractedRowCount = rows.length;
  
  // Guardrail: Check if row count seems too low
  const pageCount = debug?.pageCount || 1;
  const expectedRowsPerPage = 15; // Conservative estimate
  const expectedRows = pageCount * expectedRowsPerPage;
  
  for (const row of rows) {
    try {
      if (statementType === "enbd_debit") {
        // Parse debit statement row: Date | Description | Debit | Credit | Balance
        // Parse from RIGHT: balance → transaction amount → description
        const dateMatch = row.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
        if (!dateMatch) continue;
        
        const dateStr = dateMatch[1];
        const dateIndex = row.indexOf(dateStr);
        const afterDate = row.substring(dateIndex + dateStr.length).trim();
        
        // Try pipe-separated first
        const parts = row.split(/\s*\|\s*/);
        let description = "";
        let debitStr = "";
        let creditStr = "";
        let balanceStr = "";
        
        if (parts.length >= 4) {
          description = parts[1]?.trim() || "";
          debitStr = parts[2]?.trim() || "";
          creditStr = parts[3]?.trim() || "";
          balanceStr = parts[4]?.trim() || "";
        } else {
          // Token-based parsing from RIGHT (balance → amount → description)
          // Find all numeric tokens (amounts) with their positions
          const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:,\s*[A-Z]{2,4})?\s*(Cr|Dr|CR|DR)?/gi;
          const amountMatches: Array<{ value: string; index: number; isCredit: boolean; isBalance: boolean }> = [];
          let match;
          
          // Find all amount patterns
          while ((match = amountPattern.exec(afterDate)) !== null) {
            const value = match[1];
            const index = match.index!;
            const hasCr = /cr|credit/i.test(match[2] || "");
            const hasDr = /dr|debit/i.test(match[2] || "");
            // Check if this looks like balance (has Cr/Dr suffix or is at end of row)
            const isBalance = hasCr || hasDr || (index + match[0].length > afterDate.length * 0.8);
            amountMatches.push({ value, index, isCredit: hasCr, isBalance });
          }
          
          if (amountMatches.length === 0) {
            continue; // No amounts found
          }
          
          // Sort by position (right to left)
          amountMatches.sort((a, b) => b.index - a.index);
          
          // Balance is the rightmost amount (often with Cr/Dr)
          const balanceMatch = amountMatches.find(m => m.isBalance) || amountMatches[0];
          balanceStr = balanceMatch.value;
          
          // Transaction amount is the one before balance (or the second from right)
          const transactionMatch = amountMatches.length > 1 
            ? amountMatches.find(m => m.index < balanceMatch.index) || amountMatches[1]
            : amountMatches[0];
          
          // Determine if transaction is debit or credit
          // Check for explicit D/Dr near transaction amount
          const transactionStart = transactionMatch.index;
          const transactionEnd = transactionStart + transactionMatch.value.length;
          const aroundTransaction = afterDate.substring(
            Math.max(0, transactionStart - 10),
            Math.min(afterDate.length, transactionEnd + 10)
          );
          
          const hasExplicitDebit = /\bD\b|\bDr\b|\bdebit\b/i.test(aroundTransaction);
          const hasExplicitCredit = transactionMatch.isCredit || 
            /\bCr\b|\bCR\b|\bcredit\b|\bCr\b/i.test(aroundTransaction) ||
            /\btransfer\s+from\b/i.test(afterDate.substring(0, transactionStart));
          
          if (hasExplicitCredit) {
            creditStr = transactionMatch.value;
          } else if (hasExplicitDebit) {
            debitStr = transactionMatch.value;
          } else {
            // Fallback: if both debit and credit columns exist, use the non-zero one
            // Otherwise, assume it's a debit (negative) if no credit indicator
            if (amountMatches.length >= 2) {
              // Try to find both debit and credit amounts
              const otherAmounts = amountMatches.filter(m => m.index !== balanceMatch.index && m.index !== transactionMatch.index);
              if (otherAmounts.length > 0) {
                // Use the transaction match as one, and check which is which
                creditStr = transactionMatch.value;
              } else {
                debitStr = transactionMatch.value;
              }
            } else {
              debitStr = transactionMatch.value;
            }
          }
          
          // Description is everything between date and transaction amount
          const descriptionEnd = transactionMatch.index;
          description = afterDate.substring(0, descriptionEnd).trim();
          
          // Clean up description: remove currency codes, extra dates, etc.
          // Remove patterns like "108.35,AED" or "22-12-2025" from description
          description = description
            .replace(/\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*,\s*[A-Z]{2,4}/gi, "") // Remove "108.35,AED"
            .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, "") // Remove extra dates
            .replace(/\s+/g, " ") // Normalize whitespace
            .trim();
        }
        
        // Skip if description looks like header
        if (
          /^(date|description|debit|credit|balance|تاريخ|تفاصيل|مدين|دائن|رصيد)$/i.test(description) ||
          description.length === 0
        ) {
          continue;
        }
        
        // Guardrail: Skip if description appears truncated or is too short
        if (isDescriptionTruncated(description) || description.length < 3) {
          console.warn("Skipping row with truncated description:", description);
          continue;
        }
        
        const debit = parseAmount(debitStr);
        const credit = parseAmount(creditStr, true);
        const amount = credit !== 0 ? credit : debit;
        
        if (amount === 0) continue;
        
        // Guardrail: Skip if amount is invalid
        if (!isValidAmount(amount)) {
          console.warn("Skipping row with invalid amount:", amount, "from row:", row);
          continue;
        }
        
        // Parse balance - handle "302,00 Cr" format
        let balance: number | undefined = undefined;
        if (balanceStr) {
          // Remove "Cr" suffix if present
          const balanceCleaned = balanceStr.replace(/\s*Cr\s*$/i, "").replace(/[AED$€£,\s]/gi, "");
          const balanceNum = parseFloat(balanceCleaned);
          balance = isNaN(balanceNum) ? undefined : balanceNum;
        }
        const merchant = extractMerchant(description);
        const isTransfer = detectTransfer(description);
        const kind = classifyTransactionKind(amount, description, statementType);
        
        const tx: Transaction = {
          id: uuidv4(),
          date: parseDate(dateStr),
          merchant,
          description,
          amount,
          currency: "AED",
          balance,
          kind,
          sourceDocType: statementType,
          sourceFileName,
          spendingType: isTransfer ? "transfer" : undefined,
          tag: null,
          createdAt: new Date().toISOString(),
        };
        
        tx.tag = applyRules(tx, rules);
        transactions.push(tx);
      } else if (statementType === "enbd_credit") {
        // Parse credit card statement row: Transaction Date | Posting Date | Description | Amount
        const dates = row.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g);
        if (!dates || dates.length === 0) continue;
        
        const transactionDate = dates[0];
        const postingDate = dates[1] || dates[0];
        
        // Find amount (last number in row, usually at the end)
        const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2}))(?:\s*(CR)?)/i;
        const amountMatch = row.match(amountPattern);
        if (!amountMatch) continue;
        
        const amountStr = amountMatch[1];
        const isCredit = amountMatch[2]?.toUpperCase() === "CR";
        
        // Extract description (between dates and amount)
        const lastDateIndex = row.lastIndexOf(dates[dates.length - 1]);
        const amountIndex = row.indexOf(amountStr, lastDateIndex);
        const description = row
          .substring(lastDateIndex + dates[dates.length - 1].length, amountIndex)
          .trim();
        
        // Skip header rows
        if (
          /^(transaction date|posting date|description|amount|تاريخ|تفاصيل)$/i.test(description) ||
          description.length === 0
        ) {
          continue;
        }
        
        // Guardrail: Skip if description appears truncated
        if (isDescriptionTruncated(description)) {
          console.warn("Skipping row with truncated description:", description);
          continue;
        }
        
        // For credit cards: purchases are negative, refunds/reversals are positive
        let amount = parseFloat(amountStr.replace(/,/g, ""));
        const desc = description.toLowerCase();
        const isRefund = desc.includes("refund") || desc.includes("reversal") || desc.includes("reversed");
        
        if (isRefund || isCredit) {
          amount = Math.abs(amount); // Positive for refunds/credits
        } else {
          amount = -Math.abs(amount); // Negative for purchases
        }
        
        // Guardrail: Skip if amount is invalid
        if (!isValidAmount(amount)) {
          console.warn("Skipping row with invalid amount:", amount, "from row:", row);
          continue;
        }
        
        const merchant = extractMerchant(description);
        const isTransfer = detectTransfer(description);
        const kind = classifyTransactionKind(amount, description, statementType);
        
        const tx: Transaction = {
          id: uuidv4(),
          date: parseDate(transactionDate),
          postingDate: postingDate !== transactionDate ? parseDate(postingDate) : undefined,
          merchant,
          description,
          amount,
          currency: "AED",
          kind,
          sourceDocType: statementType,
          sourceFileName,
          spendingType: isTransfer ? "transfer" : undefined,
          tag: null,
          createdAt: new Date().toISOString(),
        };
        
        tx.tag = applyRules(tx, rules);
        transactions.push(tx);
      }
    } catch (err) {
      console.warn("Failed to parse row:", row, err);
      // Continue with next row
    }
  }
  
  // Deduplicate
  const seen = new Set<string>();
  const unique = transactions.filter((tx) => {
    const key = `${tx.date}-${tx.merchant}-${tx.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Calculate confidence score
  const confidence = calculateConfidence(
    unique.map(tx => ({ description: tx.description, amount: tx.amount })),
    extractedRowCount,
    expectedRowsPerPage
  );
  
  // Debug output
  console.log(`[parsePDFTextWithType] ${statementType}:`, {
    extractedRows: extractedRowCount,
    parsedTransactions: unique.length,
    confidence: confidence.score.toFixed(2),
    reasons: confidence.reasons,
    sourceFileName,
  });
  
  return {
    transactions: unique,
    confidence: confidence.score,
    confidenceReasons: confidence.reasons,
    extractedRowCount,
  };
}

// Main parse function that handles all file types
export async function parseFile(file: File, rules: Rule[] = []): Promise<Transaction[]> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith(".csv")) {
    return parseCSV(file, rules);
  }
  
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return parseExcel(file, rules);
  }
  
  if (fileName.endsWith(".pdf")) {
    return parsePDF(file, rules);
  }
  
  throw new Error(`Unsupported file type: ${fileName}`);
}
