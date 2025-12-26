/**
 * Statement parsing utilities for ENBD debit and credit statements
 * Handles type detection, row extraction, and transfer detection
 */

import type { StatementType, TransactionKind } from "./types";

/**
 * Detect ENBD statement type from extracted text
 */
export function detectEnbdStatementType(text: string): StatementType {
  const t = text.toLowerCase();
  
  // Credit card statements typically have "Transaction Date" and "Posting Date" columns
  if (
    (t.includes("transaction date") || t.includes("posting date")) &&
    t.includes("amount") &&
    !t.includes("debit") &&
    !t.includes("credit") &&
    !t.includes("balance")
  ) {
    return "enbd_credit";
  }
  
  // Debit statements typically have "Date", "Description", "Debit", "Credit", "Balance" columns
  if (
    (t.includes("debit") || t.includes("مدين")) &&
    (t.includes("credit") || t.includes("دائن")) &&
    (t.includes("balance") || t.includes("رصيد"))
  ) {
    return "enbd_debit";
  }
  
  return "unknown";
}

/**
 * Redact PII by removing everything above the first table header
 * MVP: Simple header detection and removal
 */
export function redactByRemovingHeader(text: string, statementType: StatementType): {
  redacted: string;
  headerFound: boolean;
} {
  const lines = text.split("\n");
  
  // Table header patterns (case-insensitive)
  const debitHeaderPatterns = [
    /date\s+description\s+debit\s+credit\s+balance/i,
    /date\s*\|.*description.*\|.*debit.*\|.*credit.*\|.*balance/i,
    /تاريخ\s+تفاصيل\s+مدين\s+دائن\s+رصيد/i,
  ];
  
  const creditHeaderPatterns = [
    /transaction\s+date\s+posting\s+date\s+description\s+amount/i,
    /transaction\s+date.*posting\s+date.*description.*amount/i,
    /date\s*\|.*description.*\|.*amount/i,
  ];
  
  const headerPatterns = statementType === "enbd_debit" 
    ? debitHeaderPatterns 
    : creditHeaderPatterns;
  
  // Find first occurrence of table header
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (headerPatterns.some(pattern => pattern.test(line))) {
      // Found header - return everything from this line onwards
      return {
        redacted: lines.slice(i).join("\n"),
        headerFound: true,
      };
    }
  }
  
  // No header found
  return {
    redacted: text,
    headerFound: false,
  };
}

/**
 * Normalize whitespace and trim header/footer noise
 */
function normalizeText(text: string): string {
  // Normalize whitespace
  let normalized = text.replace(/\r/g, "\n").replace(/[ \t]{2,}/g, " ");
  normalized = normalized.replace(/\n{3,}/g, "\n\n");
  
  // Normalize Arabic-Indic digits to Western digits
  const digitMap: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"
  };
  normalized = normalized.replace(/[٠-٩]/g, (d) => digitMap[d] ?? d);
  
  return normalized.trim();
}

/**
 * Find table header and return index where transactions start
 */
function findTableStart(lines: string[], statementType: StatementType): number {
  if (statementType === "enbd_debit") {
    // Look for "Date | Description | Debit | Credit | Balance" pattern
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (
        (line.includes("date") || line.includes("تاريخ")) &&
        (line.includes("description") || line.includes("تفاصيل")) &&
        (line.includes("debit") || line.includes("مدين")) &&
        (line.includes("credit") || line.includes("دائن"))
      ) {
        return i + 1; // Start after header
      }
    }
  } else if (statementType === "enbd_credit") {
    // Look for "Transaction Date | Posting Date | Description | Amount" pattern
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (
        (line.includes("transaction date") || line.includes("posting date")) &&
        (line.includes("description") || line.includes("amount"))
      ) {
        return i + 1; // Start after header
      }
    }
  }
  
  // If no header found, look for first date pattern
  for (let i = 0; i < lines.length; i++) {
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(lines[i])) {
      return i;
    }
  }
  
  return 0;
}

/**
 * Find table end (footer patterns)
 */
function findTableEnd(lines: string[], startIndex: number): number {
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (
      line.includes("statement of correctness") ||
      line.includes("كشف صحيح") ||
      line.includes("emirates nbd bank") ||
      line.includes("this is an electronically generated") ||
      line.includes("تم إنشاء") ||
      /page \d+ of \d+/i.test(line) ||
      /صفحة.*من/i.test(line)
    ) {
      return i;
    }
  }
  return lines.length;
}

/**
 * Check if description appears truncated
 */
export function isDescriptionTruncated(description: string): boolean {
  if (!description || description.length < 3) return true;
  
  // Check for common truncation patterns
  const truncatedPatterns = [
    /^[A-Z]{1,2}$/, // Single or double letter (e.g., "AE")
    /^[A-Z]{1,2}\s*$/, // Single/double letter with space
    /^[A-Z]{1,2}\s*[-]$/, // Letter followed by dash
    /^[A-Z]{1,2}\s*[\/]$/, // Letter followed by slash
    /^[A-Z]{1,2}\s*[0-9]+$/, // Letter followed by numbers only
  ];
  
  const trimmed = description.trim();
  if (truncatedPatterns.some(pattern => pattern.test(trimmed))) {
    return true;
  }
  
  // Check if description ends with incomplete words (single letter/digit)
  const lastWord = trimmed.split(/\s+/).pop() || "";
  if (lastWord.length <= 2 && /^[A-Z0-9]{1,2}$/.test(lastWord)) {
    return true;
  }
  
  return false;
}

/**
 * Validate amount is in reasonable range
 */
export function isValidAmount(amount: number): boolean {
  // Reasonable range: 0.01 to 1,000,000 AED
  return amount !== 0 && Math.abs(amount) >= 0.01 && Math.abs(amount) <= 1000000;
}

/**
 * Assess parse quality to determine if regular parsing is GOOD or BAD
 * Used to decide whether to trigger Advanced Processing (OCR)
 */
export function assessParseQuality(
  transactions: Array<{ date?: string; description: string; amount: number }>,
  debug?: Record<string, any>
): {
  isGood: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  // Tunable constants
  const MIN_TX = 10;
  const MIN_VALID_RATIO = 0.8; // 80% must have valid date + amount
  const MIN_DESCRIPTION_LENGTH = 3; // Minimum description length
  const TRIVIAL_TOKENS = ["AE", "-", "UAE", "ARE", "AED"];
  const MAX_REPEATED_AMOUNT_RATIO = 0.3; // Max 30% can have same amount (suspicious)
  const SANITY_MIN = 0.01;
  const SANITY_MAX = 1000000;
  
  // Rule 1: Must have minimum transaction count
  if (transactions.length < MIN_TX) {
    reasons.push(`Too few transactions: ${transactions.length} < ${MIN_TX}`);
    return { isGood: false, reasons };
  }
  
  // Rule 2: Check valid date + amount ratio
  let validCount = 0;
  const amounts: number[] = [];
  
  for (const tx of transactions) {
    const hasDate = tx.date && /^\d{4}-\d{2}-\d{2}$/.test(tx.date);
    const hasValidAmount = isValidAmount(tx.amount);
    
    if (hasDate && hasValidAmount) {
      validCount++;
    }
    
    if (hasValidAmount) {
      amounts.push(Math.abs(tx.amount));
    }
  }
  
  const validRatio = validCount / transactions.length;
  if (validRatio < MIN_VALID_RATIO) {
    reasons.push(`Low valid transaction ratio: ${(validRatio * 100).toFixed(0)}% < ${(MIN_VALID_RATIO * 100).toFixed(0)}%`);
    return { isGood: false, reasons };
  }
  
  // Rule 3: Descriptions should not be mostly trivial tokens
  const trivialDescriptions = transactions.filter(tx => {
    const desc = tx.description.trim();
    if (desc.length < MIN_DESCRIPTION_LENGTH) return true;
    
    // Check if description is mostly trivial tokens
    const words = desc.split(/\s+/).filter(w => w.length > 0);
    const trivialWords = words.filter(w => TRIVIAL_TOKENS.includes(w.toUpperCase()));
    return trivialWords.length >= words.length * 0.5; // 50%+ trivial words
  }).length;
  
  const trivialRatio = trivialDescriptions / transactions.length;
  if (trivialRatio > 0.2) {
    reasons.push(`Too many trivial descriptions: ${(trivialRatio * 100).toFixed(0)}%`);
    return { isGood: false, reasons };
  }
  
  // Rule 4: Amounts should be within sanity bounds and not suspiciously repeated
  const invalidAmounts = transactions.filter(tx => {
    const absAmount = Math.abs(tx.amount);
    return absAmount < SANITY_MIN || absAmount > SANITY_MAX;
  }).length;
  
  if (invalidAmounts > 0) {
    reasons.push(`${invalidAmounts} transactions have amounts outside sanity bounds (${SANITY_MIN} - ${SANITY_MAX})`);
    return { isGood: false, reasons };
  }
  
  // Check for suspiciously repeated amounts (possible parsing error)
  if (amounts.length > 0) {
    const amountCounts = new Map<number, number>();
    amounts.forEach(amt => {
      const rounded = Math.round(amt * 100) / 100; // Round to 2 decimals
      amountCounts.set(rounded, (amountCounts.get(rounded) || 0) + 1);
    });
    
    const maxRepeated = Math.max(...Array.from(amountCounts.values()));
    const repeatedRatio = maxRepeated / amounts.length;
    
    if (repeatedRatio > MAX_REPEATED_AMOUNT_RATIO) {
      reasons.push(`Suspicious amount repetition: ${maxRepeated} transactions with same amount (${(repeatedRatio * 100).toFixed(0)}%)`);
      return { isGood: false, reasons };
    }
  }
  
  // All checks passed
  reasons.push("Parse quality: GOOD - all validation checks passed");
  return { isGood: true, reasons };
}

/**
 * Calculate confidence score for parsed transactions
 */
export function calculateConfidence(
  transactions: Array<{ description: string; amount: number }>,
  extractedRowCount: number,
  expectedRowsPerPage: number = 15
): {
  score: number; // 0-1
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 1.0;
  
  if (transactions.length === 0) {
    return { score: 0, reasons: ["No transactions extracted"] };
  }
  
  // Check row count vs expected
  const expectedRows = expectedRowsPerPage; // Conservative estimate
  if (extractedRowCount < expectedRows * 0.3) {
    score -= 0.3;
    reasons.push(`Low row count: ${extractedRowCount} rows extracted (expected ~${expectedRows})`);
  }
  
  // Check for truncated descriptions
  const truncatedCount = transactions.filter(tx => isDescriptionTruncated(tx.description)).length;
  const truncationRatio = truncatedCount / transactions.length;
  if (truncationRatio > 0.2) {
    score -= 0.2;
    reasons.push(`${truncatedCount} transactions have truncated descriptions (${Math.round(truncationRatio * 100)}%)`);
  }
  
  // Check for invalid amounts
  const invalidAmounts = transactions.filter(tx => !isValidAmount(tx.amount)).length;
  if (invalidAmounts > 0) {
    score -= 0.2;
    reasons.push(`${invalidAmounts} transactions have invalid amounts`);
  }
  
  // Check for merged rows (unusually large amounts)
  const largeAmounts = transactions.filter(tx => Math.abs(tx.amount) > 100000).length;
  if (largeAmounts > transactions.length * 0.1) {
    score -= 0.15;
    reasons.push(`${largeAmounts} transactions have unusually large amounts (possible merged rows)`);
  }
  
  // Check description completeness (should have meaningful words)
  const incompleteDescriptions = transactions.filter(tx => {
    const words = tx.description.split(/\s+/).filter(w => w.length > 2);
    return words.length < 2;
  }).length;
  if (incompleteDescriptions > transactions.length * 0.3) {
    score -= 0.15;
    reasons.push(`${incompleteDescriptions} transactions have incomplete descriptions`);
  }
  
  score = Math.max(0, score);
  
  if (score >= 0.7) {
    reasons.push("Confidence: High");
  } else if (score >= 0.4) {
    reasons.push("Confidence: Medium");
  } else {
    reasons.push("Confidence: Low - consider OCR or AI fallback");
  }
  
  return { score, reasons };
}

/**
 * Extract rows from debit statement text
 * Format: Date | Description | Debit | Credit | Balance
 * Improved row reconstruction for OCR text with multi-line descriptions
 */
export function extractDebitRows(text: string): string[] {
  const normalized = normalizeText(text);
  const lines = normalized.split("\n").map(l => l.trim()).filter(Boolean);
  
  const startIndex = findTableStart(lines, "enbd_debit");
  const endIndex = findTableEnd(lines, startIndex);
  
  const rows: string[] = [];
  let currentRow = "";
  let continuationCount = 0;
  const MAX_CONTINUATION = 3; // Max lines to merge for description
  
  for (let i = startIndex; i < endIndex; i++) {
    const line = lines[i];
    
    // Check if line starts with a date (new row)
    const dateMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    
    if (dateMatch) {
      // Save previous row if it exists and looks complete
      if (currentRow.trim()) {
        // Validate row has required components before saving
        const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(currentRow);
        if (hasAmount) {
          rows.push(currentRow.trim());
        }
      }
      // Start new row
      currentRow = line;
      continuationCount = 0;
    } else if (currentRow) {
      // Continuation of current row (multi-line description)
      // Check if this looks like a new transaction (has date pattern)
      if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) {
        // This is actually a new row - save current and start new
        if (currentRow.trim()) {
          const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(currentRow);
          if (hasAmount) {
            rows.push(currentRow.trim());
          }
        }
        currentRow = line;
        continuationCount = 0;
      } else if (continuationCount < MAX_CONTINUATION) {
        // Safe to append - looks like description continuation
        // Check if line looks like an amount (don't merge if it's a separate amount)
        const looksLikeAmount = /^\d{1,3}(?:,\d{3})*(?:\.\d{2})\s*(Cr|AED)?$/i.test(line);
        if (!looksLikeAmount) {
          currentRow += " " + line;
          continuationCount++;
        } else {
          // This is an amount on its own line - append to current row
          currentRow += " " + line;
        }
      } else {
        // Too many continuations - likely a new row, save current
        if (currentRow.trim()) {
          const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(currentRow);
          if (hasAmount) {
            rows.push(currentRow.trim());
          }
        }
        currentRow = line;
        continuationCount = 0;
      }
    }
  }
  
  // Add last row
  if (currentRow.trim()) {
    const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(currentRow);
    if (hasAmount) {
      rows.push(currentRow.trim());
    }
  }
  
  return rows.filter(row => {
    // Filter out rows that don't have date and amount patterns
    const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(row);
    const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(row);
    return hasDate && hasAmount;
  });
}

/**
 * Extract rows from credit card statement text
 * Format: Transaction Date | Posting Date | Description | Amount
 */
export function extractCreditRows(text: string): string[] {
  const normalized = normalizeText(text);
  const lines = normalized.split("\n").map(l => l.trim()).filter(Boolean);
  
  const startIndex = findTableStart(lines, "enbd_credit");
  const endIndex = findTableEnd(lines, startIndex);
  
  const rows: string[] = [];
  let currentRow = "";
  let continuationCount = 0;
  const MAX_CONTINUATION = 3;
  
  for (let i = startIndex; i < endIndex; i++) {
    const line = lines[i];
    
    // Check if line contains two dates (transaction date and posting date)
    const dates = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g);
    
    if (dates && dates.length >= 2) {
      // Save previous row if it exists
      if (currentRow.trim()) {
        const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(currentRow);
        if (hasAmount) {
          rows.push(currentRow.trim());
        }
      }
      // Start new row
      currentRow = line;
      continuationCount = 0;
    } else if (dates && dates.length === 1 && currentRow) {
      // Single date - could be continuation or new row
      // Check if current row already has two dates
      const currentDates = currentRow.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g);
      if (currentDates && currentDates.length >= 2) {
        // Current row is complete, this is a new row
        if (currentRow.trim()) {
          const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(currentRow);
          if (hasAmount) {
            rows.push(currentRow.trim());
          }
        }
        currentRow = line;
        continuationCount = 0;
      } else if (continuationCount < MAX_CONTINUATION) {
        // Continuation of current row
        currentRow += " " + line;
        continuationCount++;
      } else {
        // Too many continuations
        if (currentRow.trim()) {
          const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(currentRow);
          if (hasAmount) {
            rows.push(currentRow.trim());
          }
        }
        currentRow = line;
        continuationCount = 0;
      }
    } else if (currentRow && !/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line) && continuationCount < MAX_CONTINUATION) {
      // Continuation of current row (multi-line description)
      currentRow += " " + line;
      continuationCount++;
    } else if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) {
      // New row with single date (might be credit card format with one date)
      if (currentRow.trim()) {
        const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(currentRow);
        if (hasAmount) {
          rows.push(currentRow.trim());
        }
      }
      currentRow = line;
      continuationCount = 0;
    }
  }
  
  // Add last row
  if (currentRow.trim()) {
    const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(currentRow);
    if (hasAmount) {
      rows.push(currentRow.trim());
    }
  }
  
  return rows.filter(row => {
    // Filter out rows that don't have date and amount patterns
    const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(row);
    const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(row);
    return hasDate && hasAmount;
  });
}

/**
 * Detect if a transaction is a transfer based on description
 */
export function detectTransfer(description: string): boolean {
  const desc = description.toLowerCase();
  
  const transferKeywords = [
    "transfer",
    "mobile banking transfer",
    "iban",
    "tt ref",
    "ttref",
    "from ae",
    "to ae",
    "wire transfer",
    "bank transfer",
    "internal transfer",
    "account transfer"
  ];
  
  // Check for transfer keywords
  if (transferKeywords.some(keyword => desc.includes(keyword))) {
    return true;
  }
  
  // Check for IBAN-like patterns (AE followed by digits)
  if (/ae\d{21,23}/i.test(desc)) {
    return true;
  }
  
  return false;
}

/**
 * Classify transaction kind based on amount, description, and statement type
 */
export function classifyTransactionKind(
  amount: number,
  description: string,
  statementType: StatementType
): TransactionKind {
  // Transfers
  if (detectTransfer(description)) {
    return "transfer";
  }
  
  // Reimbursements (positive amounts that look like refunds)
  const desc = description.toLowerCase();
  if (
    amount > 0 &&
    (desc.includes("refund") ||
     desc.includes("reversal") ||
     desc.includes("reversed") ||
     desc.includes("reimbursement"))
  ) {
    return "reimbursement";
  }
  
  // Income (positive amounts, not transfers)
  if (amount > 0 && !detectTransfer(description)) {
    return "income";
  }
  
  // Spend (negative amounts)
  if (amount < 0) {
    return "spend";
  }
  
  return "unknown";
}
