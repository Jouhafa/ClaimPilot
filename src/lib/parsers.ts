import Papa from "papaparse";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, Rule } from "./types";
import { ruleMatchesTransaction, getRuleTag } from "./types";

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
function parseAmount(amountStr: string | number | undefined, isCredit: boolean = false): number {
  if (amountStr === undefined || amountStr === null || amountStr === "") return 0;
  if (typeof amountStr === "number") return isCredit ? amountStr : -amountStr;
  
  // Check if it's a credit (has CR suffix)
  const isCreditAmount = amountStr.toUpperCase().includes("CR");
  
  // Remove currency symbols, commas, spaces, CR/DR
  const cleaned = amountStr
    .replace(/[AED$€£,\s]/gi, "")
    .replace(/CR|DR/gi, "")
    .replace(/[()]/g, "")
    .trim();
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  
  // Credits are positive, debits are negative
  return isCreditAmount || isCredit ? num : -num;
}

// Extract merchant from description
function extractMerchant(description: string): string {
  if (!description) return "Unknown";
  
  // Clean up common patterns
  let merchant = description
    .replace(/\s+ARE$/, "") // Remove "ARE" suffix (UAE country code)
    .replace(/\s+AE$/, "")  // Remove "AE" suffix
    .replace(/ABU DHABI$/, "")
    .replace(/DUBAI$/, "")
    .trim();
  
  // Handle TRANSFER PAYMENT
  if (merchant.toLowerCase().includes("transfer payment")) {
    return "Transfer Payment";
  }
  
  // Handle card patterns
  if (merchant.toLowerCase().includes("card no")) {
    const match = merchant.match(/CARD NO\.\d+X+\d+\s+(.+)/i);
    if (match) return match[1].trim();
  }
  
  // Take first meaningful part (up to 40 chars)
  return merchant.substring(0, 40).trim() || "Unknown";
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
  
  // Extract text from all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => {
        if ("str" in item) {
          return item.str;
        }
        return "";
      })
      .join(" ");
    fullText += pageText + "\n";
  }
  
  return parsePDFText(fullText, rules);
}

// Parse extracted PDF text
export function parsePDFText(text: string, rules: Rule[] = []): Transaction[] {
  const transactions: Transaction[] = [];
  
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
