/**
 * Unit tests for statement parser
 * Tests ENBD debit statement row extraction with OCR sample
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  extractDebitRows,
  detectEnbdStatementType,
  detectTransfer,
  calculateConfidence,
} from "../statementParser";
import { parsePDFTextWithType } from "../parsers";
import type { StatementType } from "../types";

describe("Statement Parser", () => {
  let ocrSampleText: string;

  beforeAll(() => {
    // Load OCR sample text
    const samplePath = join(
      process.cwd(),
      "test-docs",
      "enbd_debit_ocr_sample.txt"
    );
    try {
      ocrSampleText = readFileSync(samplePath, "utf-8");
    } catch (err) {
      console.warn("Could not load OCR sample file:", err);
      ocrSampleText = "";
    }
  });

  describe("extractDebitRows", () => {
    it("should extract at least 5 rows from OCR sample", () => {
      if (!ocrSampleText) {
        console.warn("Skipping test - OCR sample not loaded");
        return;
      }

      const rows = extractDebitRows(ocrSampleText);
      
      // Should extract at least 5 transactions from the sample
      expect(rows.length).toBeGreaterThanOrEqual(5);
      
      // Each row should have a date
      rows.forEach((row) => {
        expect(row).toMatch(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
      });
      
      // Each row should have an amount
      rows.forEach((row) => {
        expect(row).toMatch(/\d{1,3}(?:,\d{3})*(?:\.\d{2})/);
      });
    });

    it("should handle multi-line descriptions", () => {
      const text = `
Date Description Debit Credit Balance
23/12/2025 CARD NO.443913XXXXXX6404 CAREEM QUIK Abu
Dhabi:AE 246138 22-12-2025 108.35,AED 108.35 302,00 Cr
      `.trim();

      const rows = extractDebitRows(text);
      expect(rows.length).toBeGreaterThan(0);
      
      // Should merge multi-line description
      const firstRow = rows[0];
      expect(firstRow).toContain("CAREEM QUIK");
      expect(firstRow).toContain("Dhabi:AE");
    });
  });

  describe("detectEnbdStatementType", () => {
    it("should detect debit statement", () => {
      const text = `
Date Description Debit Credit Balance
23/12/2025 Transaction 100.00 0.00 1000.00
      `.trim();

      const type = detectEnbdStatementType(text);
      expect(type).toBe("enbd_debit");
    });

    it("should detect credit statement", () => {
      const text = `
Transaction Date Posting Date Description Amount
23/12/2025 24/12/2025 Purchase 100.00
      `.trim();

      const type = detectEnbdStatementType(text);
      expect(type).toBe("enbd_credit");
    });

    it("should return unknown for unrecognized format", () => {
      const text = "Some random text without statement patterns";
      const type = detectEnbdStatementType(text);
      expect(type).toBe("unknown");
    });
  });

  describe("detectTransfer", () => {
    it("should detect mobile banking transfer", () => {
      expect(detectTransfer("MOBILE BANKING TRANSFER FROM AE440260000975938394602")).toBe(true);
    });

    it("should detect IBAN pattern", () => {
      expect(detectTransfer("Transfer to AE170260001015938394601")).toBe(true);
    });

    it("should not detect regular purchase", () => {
      expect(detectTransfer("CAREEM QUIK Abu Dhabi:AE")).toBe(false);
    });
  });

  describe("parsePDFTextWithType with OCR sample", () => {
    it("should parse OCR sample and extract transactions", () => {
      if (!ocrSampleText) {
        console.warn("Skipping test - OCR sample not loaded");
        return;
      }

      const result = parsePDFTextWithType(
        ocrSampleText,
        "enbd_debit",
        [],
        "test.pdf"
      );

      // Should extract at least 5 transactions
      expect(result.transactions.length).toBeGreaterThanOrEqual(5);
      
      // All transactions should have required fields
      result.transactions.forEach((tx) => {
        expect(tx.date).toBeDefined();
        expect(tx.description).toBeDefined();
        expect(tx.amount).not.toBe(0);
        expect(tx.sourceDocType).toBe("enbd_debit");
      });

      // Should have confidence score
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      
      // Should have extracted row count
      expect(result.extractedRowCount).toBeGreaterThanOrEqual(5);
    });

    it("should identify transfers correctly", () => {
      if (!ocrSampleText) {
        console.warn("Skipping test - OCR sample not loaded");
        return;
      }

      const result = parsePDFTextWithType(
        ocrSampleText,
        "enbd_debit",
        [],
        "test.pdf"
      );

      // Should have at least one transfer
      const transfers = result.transactions.filter(
        (tx) => tx.kind === "transfer" || tx.spendingType === "transfer"
      );
      expect(transfers.length).toBeGreaterThan(0);
    });
  });

  describe("calculateConfidence", () => {
    it("should return low confidence for empty transactions", () => {
      const result = calculateConfidence([], 0, 15);
      expect(result.score).toBe(0);
      expect(result.reasons).toContain("No transactions extracted");
    });

    it("should return high confidence for good data", () => {
      const transactions = [
        { description: "CAREEM QUIK Abu Dhabi", amount: -108.35 },
        { description: "THE BOSTON CONSULTING GROUP", amount: 226.00 },
        { description: "MOBILE BANKING TRANSFER FROM AE440260000975938394602", amount: 100.00 },
      ];
      const result = calculateConfidence(transactions, 15, 15);
      expect(result.score).toBeGreaterThan(0.5);
    });

    it("should detect truncated descriptions", () => {
      const transactions = [
        { description: "AE", amount: -108.35 },
        { description: "-", amount: 226.00 },
        { description: "CAREEM QUIK Abu Dhabi", amount: -50.00 },
      ];
      const result = calculateConfidence(transactions, 3, 15);
      expect(result.score).toBeLessThan(0.8);
      expect(result.reasons.some((r) => r.includes("truncated"))).toBe(true);
    });
  });
});

