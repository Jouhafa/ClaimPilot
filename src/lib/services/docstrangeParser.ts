/**
 * DocStrange CSV/Markdown parser
 * Converts DocStrange output to Transaction[] schema
 */

import { v4 as uuidv4 } from "uuid";
import type { Transaction, StatementType } from "../types";
import { redactByRemovingHeader } from "../statementParser";
import { improveMerchantName } from "../descriptionLabeler";

/**
 * Parse date from various formats to ISO YYYY-MM-DD
 */
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

/**
 * Parse amount string to number
 * Handles: "8,457.90", "108.35,AED", "302,00 Cr", "108.35", "-123.45"
 */
function parseAmount(amountStr: string | number | undefined): number {
  if (amountStr === undefined || amountStr === null || amountStr === "") return 0;
  if (typeof amountStr === "number") return amountStr;
  
  // Check if it's a credit (has CR suffix)
  const upperStr = String(amountStr).toUpperCase();
  const isCreditAmount = upperStr.includes("CR") || upperStr.includes("CREDIT");
  
  // Handle "108.35,AED" format - extract number before comma+currency
  let cleaned = String(amountStr);
  
  // Remove "Cr" suffix if present
  cleaned = cleaned.replace(/\s*Cr\s*$/i, "");
  
  // Handle "108.35,AED" format
  const commaCurrencyMatch = cleaned.match(/^([\d,]+\.?\d*)\s*,\s*[A-Z]{2,4}/i);
  if (commaCurrencyMatch) {
    cleaned = commaCurrencyMatch[1];
  }
  
  // Remove currency symbols, commas, spaces, CR/DR
  cleaned = cleaned
    .replace(/[AED$€£]/gi, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/CR|DR/gi, "")
    .replace(/[()]/g, "")
    .trim();
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  
  // Credits are positive, debits are negative
  return isCreditAmount ? Math.abs(num) : -Math.abs(num);
}

/**
 * Extract merchant from description using improved labeler
 */
function extractMerchant(description: string): string {
  if (!description) return "Unknown";
  return improveMerchantName(description);
}

/**
 * Detect column indices from CSV header row
 */
function detectColumns(headerRow: string[]): {
  dateIndex?: number;
  descriptionIndex?: number;
  debitIndex?: number;
  creditIndex?: number;
  amountIndex?: number;
  balanceIndex?: number;
  postingDateIndex?: number;
} {
  const lowerHeaders = headerRow.map(h => h.toLowerCase().trim());
  
  const dateIndex = lowerHeaders.findIndex(h => 
    /date/i.test(h) && !/posting/i.test(h)
  );
  const postingDateIndex = lowerHeaders.findIndex(h => 
    /posting.*date/i.test(h)
  );
  const descriptionIndex = lowerHeaders.findIndex(h => 
    /description|details|تفاصيل|وصف/i.test(h)
  );
  const debitIndex = lowerHeaders.findIndex(h => 
    /debit|مدين/i.test(h)
  );
  const creditIndex = lowerHeaders.findIndex(h => 
    /credit|دائن/i.test(h)
  );
  const amountIndex = lowerHeaders.findIndex(h => 
    /amount|مبلغ/i.test(h) && !/debit|credit/i.test(h)
  );
  const balanceIndex = lowerHeaders.findIndex(h => 
    /balance|رصيد/i.test(h)
  );
  
  return {
    dateIndex: dateIndex >= 0 ? dateIndex : undefined,
    postingDateIndex: postingDateIndex >= 0 ? postingDateIndex : undefined,
    descriptionIndex: descriptionIndex >= 0 ? descriptionIndex : undefined,
    debitIndex: debitIndex >= 0 ? debitIndex : undefined,
    creditIndex: creditIndex >= 0 ? creditIndex : undefined,
    amountIndex: amountIndex >= 0 ? amountIndex : undefined,
    balanceIndex: balanceIndex >= 0 ? balanceIndex : undefined,
  };
}

/**
 * Parse CSV data from DocStrange
 * Handles quoted fields, commas in descriptions, multiline descriptions
 */
function parseCSVData(csvData: string): string[][] {
  const lines: string[][] = [];
  const rows = csvData.split(/\r?\n/).filter(line => line.trim());
  
  for (const row of rows) {
    const fields: string[] = [];
    let currentField = "";
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }
    
    // Add last field
    if (currentField || fields.length > 0) {
      fields.push(currentField.trim());
    }
    
    if (fields.length > 0) {
      lines.push(fields);
    }
  }
  
  return lines;
}

/**
 * Convert DocStrange CSV output to Transaction[]
 */
export function parseDocStrangeCSV(
  csvData: string,
  statementType: StatementType,
  sourceFileName?: string
): {
  transactions: Transaction[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const transactions: Transaction[] = [];
  
  if (!csvData || csvData.trim().length === 0) {
    warnings.push("CSV data is empty");
    return { transactions, warnings };
  }
  
  // Apply PII reduction: remove lines before first table header
  const redaction = redactByRemovingHeader(csvData, statementType);
  const cleanedCSV = redaction.redacted;
  
  if (!redaction.headerFound) {
    warnings.push("No table header detected - may contain PII or be malformed");
  }
  
  // Parse CSV
  const rows = parseCSVData(cleanedCSV);
  
  if (rows.length === 0) {
    warnings.push("No rows found in CSV data");
    return { transactions, warnings };
  }
  
  // Find header row (first row that contains column names)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    const rowText = row.join(" ").toLowerCase();
    if (
      (rowText.includes("date") || rowText.includes("تاريخ")) &&
      (rowText.includes("description") || rowText.includes("تفاصيل") || rowText.includes("amount") || rowText.includes("debit"))
    ) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    warnings.push("Could not find header row - attempting to parse without header");
    // Try to infer structure from first data row
    headerIndex = 0;
  }
  
  const headerRow = rows[headerIndex];
  const columns = detectColumns(headerRow);
  
  // Validate we have required columns
  if (!columns.dateIndex && !columns.descriptionIndex) {
    warnings.push("Missing required columns (date or description)");
    return { transactions, warnings };
  }
  
  // Parse data rows
  let validCount = 0;
  let invalidCount = 0;
  
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Skip empty rows
    if (row.every(cell => !cell || cell.trim().length === 0)) {
      continue;
    }
    
    try {
      // Extract fields
      const dateStr = columns.dateIndex !== undefined ? row[columns.dateIndex] : "";
      const description = columns.descriptionIndex !== undefined 
        ? row[columns.descriptionIndex] 
        : row.find((_, idx) => idx !== columns.dateIndex && idx !== columns.debitIndex && idx !== columns.creditIndex && idx !== columns.amountIndex) || "";
      
      if (!description || description.trim().length < 3) {
        invalidCount++;
        continue;
      }
      
      // Parse amount based on statement type
      let amount = 0;
      
      if (statementType === "enbd_debit") {
        // Debit/Account format: use Debit and Credit columns
        const debitStr = columns.debitIndex !== undefined ? row[columns.debitIndex] : "";
        const creditStr = columns.creditIndex !== undefined ? row[columns.creditIndex] : "";
        
        const debit = parseAmount(debitStr);
        const credit = parseAmount(creditStr);
        
        // If Debit present → amount = -abs(debit)
        // If Credit present → amount = +abs(credit)
        if (debit !== 0) {
          amount = -Math.abs(debit);
        } else if (credit !== 0) {
          amount = Math.abs(credit);
        } else {
          invalidCount++;
          continue;
        }
      } else {
        // Credit card format: single Amount column
        const amountStr = columns.amountIndex !== undefined 
          ? row[columns.amountIndex] 
          : (columns.debitIndex !== undefined ? row[columns.debitIndex] : "");
        
        if (!amountStr) {
          invalidCount++;
          continue;
        }
        
        amount = parseAmount(amountStr);
        
        // For credit cards: purchases are negative, refunds are positive
        // If amount is positive and has CR, keep positive; otherwise make negative
        const desc = description.toLowerCase();
        const isRefund = desc.includes("refund") || desc.includes("reversal") || desc.includes("reversed");
        
        if (!isRefund && amount > 0) {
          amount = -Math.abs(amount);
        } else if (isRefund) {
          amount = Math.abs(amount);
        }
      }
      
      if (amount === 0) {
        invalidCount++;
        continue;
      }
      
      // Parse dates
      const date = parseDate(dateStr);
      const postingDate = columns.postingDateIndex !== undefined 
        ? parseDate(row[columns.postingDateIndex]) 
        : undefined;
      
      // Extract balance if present (for debit statements)
      let balance: number | undefined = undefined;
      if (columns.balanceIndex !== undefined && row[columns.balanceIndex]) {
        const balanceStr = row[columns.balanceIndex].replace(/[AED$€£,\s]/gi, "").replace(/\s*Cr\s*$/i, "");
        const balanceNum = parseFloat(balanceStr);
        balance = isNaN(balanceNum) ? undefined : balanceNum;
      }
      
      const merchant = extractMerchant(description);
      
      const tx: Transaction = {
        id: uuidv4(),
        date,
        postingDate: postingDate && postingDate !== date ? postingDate : undefined,
        merchant,
        description: description.trim(),
        amount,
        currency: "AED",
        balance,
        sourceDocType: statementType,
        sourceFileName,
        tag: null,
        createdAt: new Date().toISOString(),
      };
      
      transactions.push(tx);
      validCount++;
    } catch (err) {
      invalidCount++;
      console.warn(`Failed to parse row ${i}:`, err, row);
    }
  }
  
  if (invalidCount > 0) {
    warnings.push(`${invalidCount} rows failed to parse`);
  }
  
  if (validCount < 5) {
    warnings.push(`Only ${validCount} transactions extracted (minimum recommended: 5)`);
  }
  
  return { transactions, warnings };
}

/**
 * Parse DocStrange markdown output (fallback if CSV parsing fails)
 */
export function parseDocStrangeMarkdown(
  markdown: string,
  statementType: StatementType,
  sourceFileName?: string
): {
  transactions: Transaction[];
  warnings: string[];
} {
  // Apply PII reduction
  const redaction = redactByRemovingHeader(markdown, statementType);
  const cleanedMarkdown = redaction.redacted;
  
  // Try to extract table from markdown
  // Look for markdown tables (| Date | Description | ...)
  const tableRegex = /\|.*date.*\|.*description.*\|/i;
  const hasTable = tableRegex.test(cleanedMarkdown);
  
  if (!hasTable) {
    return {
      transactions: [],
      warnings: ["No table found in markdown output"],
    };
  }
  
  // For now, return empty - markdown parsing is complex
  // Prefer CSV parsing which is more reliable
  return {
    transactions: [],
    warnings: ["Markdown parsing not fully implemented - prefer CSV output"],
  };
}

