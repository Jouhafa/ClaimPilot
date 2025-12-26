"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/context";
import { parseFile, parsePDFText, parsePDFTextWithType } from "@/lib/parsers";
import { autoTagTransactions } from "@/lib/autoTagger";
import { parsePDFWithAI, parseStatementPageWithAI } from "@/lib/api";
import { assessParseQuality, redactByRemovingHeader } from "@/lib/statementParser";
import { extractPDFTextWithOCR, type OCRProgress, cleanupOCRWorker } from "@/lib/pdfOCR";
import { ImportProfileManager } from "./ImportProfileManager";
import { DemoDataLoader } from "./DemoDataLoader";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, ImportProfile, Rule, StatementType } from "@/lib/types";
import { detectEnbdStatementType } from "@/lib/statementParser";
import { useEffect } from "react";
import { PARSER_VERSION } from "@/lib/parsers";

interface ImportTabProps {
  onImportSuccess?: () => void;
}

type ParseMethod = "regular" | "pdf_text" | "ocr" | "ai";

// Helper function to assess text quality
function assessTextQuality(text: string) {
  const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text);
  const hasAmount = /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(text);
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const arabic = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const digits = (text.match(/[0-9]/g) ?? []).length;
  const printable = (text.match(/[A-Za-z0-9\u0600-\u06FF]/g) ?? []).length;
  const printableRatio = text.length ? printable / text.length : 0;
  return { hasDate, hasAmount, latin, arabic, digits, printableRatio };
}

// Determine if OCR is needed based on text quality
function shouldOCR(text: string): boolean {
  const q = assessTextQuality(text);
  // OCR if too little printable content OR no date/amount patterns OR super short
  return text.trim().length < 200 || q.printableRatio < 0.15 || (!q.hasDate && !q.hasAmount);
}

// Normalize OCR text for better parsing
function normalizeOCRTextForParsing(raw: string): string {
  // Normalize whitespace and keep line breaks
  let t = raw.replace(/\r/g, "\n").replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");
  
  // Optional: normalize Arabic-Indic digits to Western digits
  const map: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"
  };
  t = t.replace(/[٠-٩]/g, (d) => map[d] ?? d);
  
  // Keep only "likely transaction lines" as a fallback mode:
  const lines = t.split("\n").map(l => l.trim()).filter(Boolean);
  const likely = lines.filter(l =>
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(l) && /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(l)
  );
  return likely.length >= 3 ? likely.join("\n") : t;
}

export function ImportTab({ onImportSuccess }: ImportTabProps) {
  const { addTransactions, rules, transactions, deleteAllTransactions } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isOCRActive, setIsOCRActive] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [lastFileText, setLastFileText] = useState<string | null>(null);
  const [showAIOption, setShowAIOption] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ImportProfile | null>(null);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [processingTip, setProcessingTip] = useState<string>("");
  const [pendingFiles, setPendingFiles] = useState<Array<{
    file: File;
    statementType: StatementType;
    status: "pending" | "processing" | "done" | "failed";
    detectedType: StatementType;
  }>>([]);
  const [showStatementTypeModal, setShowStatementTypeModal] = useState(false);
  const [pendingFileForType, setPendingFileForType] = useState<File | null>(null);
  const [pendingDetectedType, setPendingDetectedType] = useState<StatementType>("unknown");
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [importDebug, setImportDebug] = useState<Array<{
    fileName: string;
    statementType: StatementType;
    method: ParseMethod;
    confidence: number;
    confidenceReasons: string[];
    extractedRowCount: number;
    parsedCount: number;
    debug: Record<string, any>;
  }>>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showOCRNoResultsGuidance, setShowOCRNoResultsGuidance] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrAbortController = useRef<AbortController | null>(null);
  
  // Processing tips that rotate
  const processingTips = [
    "CSV works faster if you have it (you can upload it next time).",
    "Advanced processing can take 30–60 seconds on scanned PDFs.",
    "After processing, please verify results before saving.",
    "Credit card statements have Transaction Date and Posting Date columns.",
    "Debit statements have Debit, Credit, and Balance columns.",
  ];
  
  useEffect(() => {
    if (isProcessing || isOCRActive) {
      // Rotate tips every 5 seconds
      let tipIndex = 0;
      setProcessingTip(processingTips[0]);
      const tipInterval = setInterval(() => {
        tipIndex = (tipIndex + 1) % processingTips.length;
        setProcessingTip(processingTips[tipIndex]);
      }, 5000);
      return () => clearInterval(tipInterval);
    }
  }, [isProcessing, isOCRActive]);

  // Cleanup OCR worker on unmount
  useEffect(() => {
    return () => {
      cleanupOCRWorker();
    };
  }, []);

  const handleDemoLoaded = () => {
    setSuccessCount(32); // Demo data count
    onImportSuccess?.();
  };

  // FORCED PIPELINE: Regular parsing -> Advanced Processing (DocStrange) -> Fallback options
  const parsePdfWithFallback = async (
    file: File,
    rules: Rule[],
    statementTypeOverride?: StatementType,
    onStatusUpdate?: (status: string) => void,
    onOCRProgress?: (progress: OCRProgress) => void,
    signal?: AbortSignal
  ): Promise<{
    transactions: Transaction[];
    method: ParseMethod;
    statementType: StatementType;
    debug: Record<string, any>;
    ocrNoResults?: boolean; // Flag for Advanced Processing no-results case
  }> => {
    const debug: Record<string, any> = {
      stage: "regular",
      perPage: [] as Array<{
        pageIndex: number;
        ocrTextLength: number;
        redactionHeaderFound: boolean;
        llmSuccess: boolean;
        llmTxCount: number;
      }>,
    };
    
    let statementType: StatementType = statementTypeOverride || "unknown";
    
    // STEP 1: Regular parsing (fast)
    onStatusUpdate?.("Parsing...");
    debug.stage = "regular";
    
    try {
      const extractedText = await extractPDFText(file);
      debug.extractedTextLength = extractedText.length;
      
      // Detect statement type if not overridden
      if (!statementTypeOverride) {
        statementType = detectEnbdStatementType(extractedText);
        debug.detectedStatementType = statementType;
      } else {
        statementType = statementTypeOverride;
      }
      
      // Use type-specific parser
      const textParseResult = parsePDFTextWithType(extractedText, statementType, rules, file.name);
      debug.textParsedCount = textParseResult.transactions.length;
      debug.textConfidence = textParseResult.confidence;
      debug.textConfidenceReasons = textParseResult.confidenceReasons;
      debug.textExtractedRowCount = textParseResult.extractedRowCount;
      
      // Assess parse quality
      const quality = assessParseQuality(textParseResult.transactions, debug);
      debug.parseQuality = quality;
      
      // If results are GOOD -> continue to auto-tagging and review (no OCR, no AI)
      if (quality.isGood && textParseResult.transactions.length > 0) {
        return {
          transactions: textParseResult.transactions.map(tx => ({
            ...tx,
            sourceDocType: statementType,
            sourceFileName: file.name,
          })),
          method: "regular",
          statementType,
          debug: {
            ...debug,
            finalConfidence: textParseResult.confidence,
            finalConfidenceReasons: textParseResult.confidenceReasons,
          },
        };
      }
      
      // Regular parsing is BAD -> trigger Advanced Processing (DocStrange)
      debug.regularParseBad = true;
      debug.regularParseReasons = quality.reasons;
    } catch (err) {
      debug.regularError = err instanceof Error ? err.message : String(err);
      console.warn("Regular parsing failed:", err);
    }
    
    // STEP 2: Advanced Processing (DocStrange cloud extraction)
    onStatusUpdate?.("Advanced Processing (30–60s)...");
    debug.stage = "advanced_processing";
    setIsOCRActive(true);
    
    try {
      // Ensure statement type is set (required for DocStrange)
      if (statementType === "unknown") {
        statementType = statementTypeOverride || "enbd_debit"; // Default to debit if unknown
        debug.assumedStatementType = statementType;
      }
      
      // Call DocStrange API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("statementType", statementType === "enbd_credit" ? "credit" : "debit");
      
      onStatusUpdate?.("High-accuracy extraction in progress...");
      
      const response = await fetch("/api/import/docstrange", {
        method: "POST",
        body: formData,
        signal: signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `DocStrange API failed: ${response.status}`);
      }
      
      const result = await response.json();
      setIsOCRActive(false);
      
      debug.docstrangeSuccess = true;
      debug.docstrangeWarnings = result.warnings || [];
      debug.docstrangeTransactionCount = result.transactions?.length || 0;
      
      // Quality check: if too few transactions, treat as no-results
      const MIN_TX = 5;
      if (!result.transactions || result.transactions.length < MIN_TX) {
        debug.ocrNoResults = true;
        debug.ocrNoResultsReason = `Only ${result.transactions?.length || 0} transactions extracted (minimum: ${MIN_TX})`;
        return {
          transactions: [],
          method: "ai", // Using "ai" to match existing ParseMethod type
          statementType,
          debug,
          ocrNoResults: true,
        };
      }
      
      // Convert to Transaction[] format (already in correct format from API)
      const transactions: Transaction[] = result.transactions.map((tx: any) => ({
        id: uuidv4(),
        date: tx.date,
        postingDate: tx.postingDate,
        merchant: tx.merchant,
        description: tx.description,
        amount: tx.amount,
        currency: tx.currency || "AED",
        balance: tx.balance,
        sourceDocType: statementType,
        sourceFileName: file.name,
        tag: null,
        createdAt: new Date().toISOString(),
      }));
      
      // Success - return DocStrange-processed transactions
      return {
        transactions,
        method: "ai", // Using "ai" to match existing ParseMethod type
        statementType,
        debug: {
          ...debug,
          finalConfidence: 0.8, // DocStrange has high confidence
          finalConfidenceReasons: [
            `DocStrange extracted ${transactions.length} transactions`,
            ...(result.warnings || []),
          ],
        },
      };
    } catch (docstrangeErr) {
      setIsOCRActive(false);
      const errorMessage = docstrangeErr instanceof Error ? docstrangeErr.message : String(docstrangeErr);
      debug.docstrangeError = errorMessage;
      
      if (errorMessage.includes("cancelled") || errorMessage.includes("aborted")) {
        throw new Error("Advanced Processing cancelled by user");
      }
      
      console.warn("Advanced Processing (DocStrange) failed:", docstrangeErr);
      
      // DocStrange failed - treat as no-results
      return {
        transactions: [],
        method: "ai",
        statementType,
        debug,
        ocrNoResults: true,
      };
    }
  };

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setInfoMessage(null);
    setSuccessCount(null);
    setShowAIOption(false);
    setLastFileText(null);
    setIsOCRActive(false);
    setOcrProgress(null);

    try {
      console.log(`[${PARSER_VERSION}] Parsing file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
      
      // For CSV/Excel: use regular parsing
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        const parsed = await parseFile(file, rules);
        console.log(`Parsed ${parsed.length} transactions from ${file.name}`);
        
        if (parsed.length === 0) {
          setError("No transactions found in the file. Please check the format.");
          return;
        }
        
        // Auto-tag and add transactions
        const taggedTransactions = autoTagTransactions(parsed, rules);
        await addTransactions(taggedTransactions);
        setSuccessCount(taggedTransactions.length);
        console.log(`Successfully imported ${taggedTransactions.length} transactions`);
        onImportSuccess?.();
        return;
      }
      
      // For PDF: require user to tag statement type first
      // Detect type and show modal for user confirmation
      let detectedType: StatementType = "unknown";
      try {
        const previewText = await extractPDFText(file);
        detectedType = detectEnbdStatementType(previewText);
        console.log(`[${PARSER_VERSION}] Auto-detected statement type: ${detectedType}`);
      } catch {
        detectedType = "unknown";
      }
      
      // Show modal for user to confirm/override statement type
      setPendingFileForType(file);
      setPendingDetectedType(detectedType);
      setShowStatementTypeModal(true);
      setIsProcessing(false); // Pause processing until user confirms
      return; // Will continue in modal handler
    } catch (err) {
      console.error("Parse error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to parse file";
      setError(errorMessage);
      setIsOCRActive(false);
      setOcrProgress(null);
      setIsProcessing(false);
    }
  }, [addTransactions, rules]);

  // Handler for when user confirms statement type
  const handleStatementTypeConfirmed = useCallback(async (statementType: StatementType) => {
    if (!pendingFileForType) return;
    
    setShowStatementTypeModal(false);
    setIsProcessing(true);
    setError(null);
    setInfoMessage(null);
    
    const file = pendingFileForType;
    setPendingFileForType(null);
    
    try {
      const result = await parsePdfWithFallback(
        file,
        rules,
        statementType,
        (status) => {
          setInfoMessage(status);
          setProcessingStage(status);
        },
        (progress) => {
          setOcrProgress(progress);
          setIsOCRActive(true);
          setProcessingStage(progress.status);
        },
        ocrAbortController.current?.signal
      );
      
        console.log(`[${PARSER_VERSION}] Parsing completed with method: ${result.method}`, result.debug);
        
        // Store debug info
        const debugInfo = {
          fileName: file.name,
          statementType: result.statementType,
          method: result.method,
          confidence: result.debug.finalConfidence || result.debug.textConfidence || result.debug.ocrConfidence || 0,
          confidenceReasons: result.debug.finalConfidenceReasons || result.debug.textConfidenceReasons || result.debug.ocrConfidenceReasons || [],
          extractedRowCount: result.debug.textExtractedRowCount || result.debug.ocrExtractedRowCount || 0,
          parsedCount: result.transactions.length,
          debug: result.debug,
        };
        setImportDebug(prev => [...prev, debugInfo]);
        
        if (result.transactions.length === 0) {
          if (result.ocrNoResults) {
            // Show OCR no-results guidance
            setShowOCRNoResultsGuidance(true);
            setError(null);
            setInfoMessage("This PDF is likely scanned/protected. Please see guidance below.");
          } else {
            setError("No transactions found. The PDF format may not be supported or the file may be corrupted.");
            setInfoMessage(null);
          }
          return;
        }
        
        // Hide OCR no-results guidance if we have transactions
        setShowOCRNoResultsGuidance(false);
        
        // Auto-tag and add transactions
        const taggedTransactions = autoTagTransactions(result.transactions, rules);
        await addTransactions(taggedTransactions);
        setSuccessCount(taggedTransactions.length);
        console.log(`[${PARSER_VERSION}] Successfully imported ${taggedTransactions.length} transactions using ${result.method} method`);
        setIsOCRActive(false);
        setOcrProgress(null);
        setInfoMessage(null);
        onImportSuccess?.();
      } catch (err) {
        console.error("Parse error:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to parse file";
        setError(errorMessage);
        setIsOCRActive(false);
        setOcrProgress(null);
      } finally {
        setIsProcessing(false);
      }
    }, [addTransactions, rules, pendingFileForType]);

  const extractPDFText = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useSystemFonts: false,
      standardFontDataUrl: undefined,
    }).promise;
    
    let fullText = "";
    let fullTextFormatted = "";
    
    // Extract text with better formatting for tables and bidirectional text
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Try multiple extraction methods
      try {
        // Method 1: Use getTextContent
        const textContent = await page.getTextContent();
        
        // Build formatted text with spacing preservation
        const lineItems: Array<{ x: number; y: number; text: string; dir?: string }> = [];
        
        for (const item of textContent.items) {
          if ("str" in item && "transform" in item) {
            const transform = item.transform as number[];
            const x = transform[4];
            const y = transform[5];
            const str = item.str;
            const dir = (item as any).dir; // Text direction (ltr/rtl)
            
            // Skip empty strings
            if (str.trim().length === 0) continue;
            
            lineItems.push({ x, y, text: str, dir });
          }
        }
        
        // Group items by Y position (same line) with better tolerance
        const lines = new Map<number, Array<{ x: number; text: string; dir?: string }>>();
        for (const item of lineItems) {
          // Use larger tolerance for Y grouping (10px instead of 5px)
          const yKey = Math.round(item.y / 10) * 10;
          if (!lines.has(yKey)) {
            lines.set(yKey, []);
          }
          lines.get(yKey)!.push({ x: item.x, text: item.text, dir: item.dir });
        }
        
        // Sort lines by Y (top to bottom, higher Y first)
        const sortedLines = Array.from(lines.entries()).sort((a, b) => b[0] - a[0]);
        
        for (const [y, items] of sortedLines) {
          // Sort items by X (left to right)
          // For RTL text, we might need to reverse, but let's try left-to-right first
          items.sort((a, b) => a.x - b.x);
          
          let line = "";
          let lastX = 0;
          let lastDir: string | undefined = undefined;
          
          for (const item of items) {
            // Handle direction changes
            if (lastDir && item.dir && lastDir !== item.dir) {
              // Direction change - add separator
              line += " ";
            }
            
            // Add spacing based on X position
            if (lastX > 0) {
              const gap = item.x - lastX;
              if (gap > 20) {
                line += " | "; // Column separator
              } else if (gap > 8) {
                line += " "; // Space
              } else if (gap > 0) {
                // Small gap, might be part of same word, no space
              }
            }
            
            line += item.text;
            lastX = item.x + (item.text.length * 5); // Approximate width
            lastDir = item.dir;
          }
          
          if (line.trim().length > 0) {
            fullTextFormatted += line + "\n";
          }
        }
        
        // Also build simple text version using items in their natural order
        // This preserves the natural reading order from pdf.js (important for bidirectional text)
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
            } else if (lastY >= 0 && Math.abs(y - lastY) <= 5) {
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
        // Fallback: try simple extraction
        try {
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          fullText += pageText + "\n";
          fullTextFormatted += pageText + "\n";
        } catch (fallbackErr) {
          console.error(`Fallback extraction also failed for page ${i}:`, fallbackErr);
        }
      }
    }
    
    // Try natural order extraction (preserves reading order from pdf.js)
    // This is critical for bidirectional text - use items exactly as pdf.js provides them
    // For complex PDFs with bidirectional text, we need to preserve the exact order
    let naturalOrderText = "";
    let englishOnlyText = "";
    let lastY = -1;
    let lastX = -1;
    
    // Helper to check if text contains English characters or transaction patterns
    const hasEnglishContent = (str: string): boolean => {
      return /[A-Za-z0-9\/\-\s,\.:]+/.test(str) || 
             /\d{1,2}\/\d{1,2}\/\d{4}/.test(str) || // Date pattern
             /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(str); // Amount pattern
    };
    
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Collect all text items with their positions
        const textItems: Array<{ x: number; y: number; text: string; hasEnglish: boolean }> = [];
        
        for (const item of textContent.items) {
          if ("str" in item && "transform" in item) {
            const str = item.str;
            if (str.trim().length === 0) continue;
            
            const transform = item.transform as number[];
            const x = transform[4];
            const y = transform[5];
            const hasEnglish = hasEnglishContent(str);
            
            textItems.push({ x, y, text: str, hasEnglish });
          }
        }
        
        // Group by Y position (same line)
        const lines = new Map<number, typeof textItems>();
        for (const item of textItems) {
          const yKey = Math.round(item.y / 8) * 8; // Group similar Y positions
          if (!lines.has(yKey)) {
            lines.set(yKey, []);
          }
          lines.get(yKey)!.push(item);
        }
        
        // Process each line
        const sortedLines = Array.from(lines.entries()).sort((a, b) => b[0] - a[0]);
        
        for (const [y, items] of sortedLines) {
          // Sort by X for this line
          items.sort((a, b) => a.x - b.x);
          
          let line = "";
          let englishLine = "";
          let lastXInLine = -1;
          
          for (const item of items) {
            // Add spacing
            if (lastXInLine >= 0) {
              const gap = item.x - lastXInLine;
              if (gap > 20) {
                line += " | ";
                englishLine += " | ";
              } else if (gap > 8) {
                line += " ";
                if (item.hasEnglish) englishLine += " ";
              }
            }
            
            line += item.text;
            if (item.hasEnglish) {
              englishLine += item.text;
            }
            
            lastXInLine = item.x;
          }
          
          if (line.trim().length > 0) {
            naturalOrderText += line + "\n";
          }
          if (englishLine.trim().length > 0) {
            englishOnlyText += englishLine + "\n";
          }
        }
        
        naturalOrderText += "\n";
        englishOnlyText += "\n";
      } catch (err) {
        console.warn(`Error in natural order extraction for page ${i}:`, err);
      }
    }
    
    // Prefer English-only text if available (for garbled bidirectional PDFs), 
    // then natural order, then formatted, then simple
    let result = "";
    
    // Check if English-only extraction found meaningful content
    if (englishOnlyText.trim().length > 100) {
      const englishLines = englishOnlyText.split("\n").filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && (
          /\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed) || // Has date
          /\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(trimmed) || // Has amount
          /[A-Z]{2,}/.test(trimmed) // Has uppercase English words
        );
      });
      
      if (englishLines.length > 3) {
        console.log(`Using English-only extraction: ${englishLines.length} transaction lines found`);
        result = englishLines.join("\n");
      } else {
        result = englishOnlyText.trim();
      }
    }
    
    // Fallback to other methods
    if (!result || result.length < 50) {
      result = naturalOrderText.trim() || fullTextFormatted.trim() || fullText.trim();
      
      // If result is still mostly garbled, try aggressive English extraction
      const englishMatch = result.match(/[A-Za-z0-9\/\-\s,\.:]+/g);
      if (englishMatch && englishMatch.length > 0) {
        const englishText = englishMatch.join(" ");
        const englishRatio = englishText.length / result.length;
        
        if (englishRatio < 0.2 && result.length > 500) {
          console.warn("Text appears garbled, extracting English transaction patterns");
          // Extract lines with transaction patterns
          const lines = result.split("\n");
          const transactionLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 5 && (
              /\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed) || // Has date
              (/\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(trimmed) && /[A-Z]/.test(trimmed)) || // Has amount + English
              /(CARD|CC|TT|IPP|RMA|MOBILE|BANKING|TRANSFER|CAREEM|BOSTON)/i.test(trimmed) // Transaction keywords
            );
          });
          
          if (transactionLines.length > 3) {
            result = transactionLines.join("\n");
            console.log(`Extracted ${transactionLines.length} lines with transaction patterns`);
          }
        }
      }
    }
    
    // Clean up: remove excessive whitespace but preserve structure
    result = result.replace(/\n{3,}/g, "\n\n").replace(/\s{3,}/g, " ").trim();
    
    return result;
  };

  const handleAIParsing = async () => {
    if (!lastFileText) return;
    
    setIsAIProcessing(true);
    setError(null);
    
    try {
      console.log(`Starting AI parsing with ${lastFileText.length} characters of text`);
      
      // Try backend AI parsing first (optional enhancement)
      let aiTransactions: Transaction[] = [];
      
      try {
        console.log("Calling AI parsing service...");
        const aiResult = await parsePDFWithAI(lastFileText);
        console.log("AI parsing result:", {
          success: aiResult.success,
          count: aiResult.count,
          transactionsLength: aiResult.transactions?.length || 0,
          firstTransaction: aiResult.transactions?.[0]
        });
        
        if (aiResult.transactions && aiResult.transactions.length > 0) {
          // Convert to full Transaction objects
          aiTransactions = aiResult.transactions.map((tx) => ({
            id: uuidv4(),
            date: tx.date,
            description: tx.description,
            merchant: tx.merchant,
            amount: tx.amount,
            currency: tx.currency || "AED",
            tag: null,
            createdAt: new Date().toISOString(),
          }));
          console.log(`Successfully parsed ${aiTransactions.length} transactions from AI`);
        } else {
          console.warn("AI parsing returned empty transactions array");
          setError("AI parsing returned no transactions. The statement format might not be recognized. Trying fallback parser...");
        }
      } catch (aiError) {
        console.error("AI parsing error:", aiError);
        // Show the actual error to help debug
        if (aiError instanceof Error) {
          console.error("AI error details:", aiError.message, aiError.stack);
          setError(`AI parsing failed: ${aiError.message}. Trying fallback parsing...`);
        } else {
          console.error("AI error (non-Error):", JSON.stringify(aiError));
          setError(`AI parsing failed: ${JSON.stringify(aiError)}. Trying fallback parsing...`);
        }
      }
      
      // Fallback to client-side parsing if AI failed or returned no results
      if (aiTransactions.length === 0) {
        console.log("Trying client-side PDF text parser as fallback...");
        const clientParsed = parsePDFText(lastFileText, rules);
        console.log(`Client-side parser found ${clientParsed.length} transactions`);
        if (clientParsed.length > 0) {
          aiTransactions = clientParsed;
        }
      }
      
      if (aiTransactions.length > 0) {
        // Auto-tag the parsed transactions
        const taggedTransactions = autoTagTransactions(aiTransactions, rules);
        await addTransactions(taggedTransactions);
        setSuccessCount(taggedTransactions.length);
        console.log(`Successfully imported ${taggedTransactions.length} transactions via AI parsing`);
        setShowAIOption(false);
        setLastFileText(null);
        // Navigate to Review tab
        onImportSuccess?.();
      } else {
        console.error("All parsing methods failed. Text sample:", lastFileText.substring(0, 1000));
        setError("Couldn't extract transactions from the PDF. The file format might not be supported. Please check the file or contact support.");
      }
    } catch (err) {
      console.error("Parsing error:", err);
      if (err instanceof Error) {
        console.error("Error details:", err.message, err.stack);
        setError(`Parsing failed: ${err.message}`);
      } else {
        setError("Parsing failed with unknown error");
      }
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      if (files.length === 1) {
        handleFile(files[0]);
      } else {
        // Multi-file: prepare for statement type selection
        const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith(".pdf"));
        if (pdfFiles.length > 0) {
          // Detect types for each file
          Promise.all(
            pdfFiles.map(async (file) => {
              try {
                const previewText = await extractPDFText(file);
                return {
                  file,
                  detectedType: detectEnbdStatementType(previewText),
                };
              } catch {
                return {
                  file,
                  detectedType: "unknown" as StatementType,
                };
              }
            })
          ).then((results) => {
            const pending = results.map(r => ({
              file: r.file,
              statementType: r.detectedType === "unknown" ? "enbd_debit" : r.detectedType,
              status: "pending" as const,
              detectedType: r.detectedType,
            }));
            setPendingFiles(pending);
          });
        } else {
          // Non-PDF files: process sequentially
          files.forEach(file => handleFile(file));
        }
      }
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (files.length === 1) {
        handleFile(files[0]);
      } else {
        // Multi-file: prepare for statement type selection
        const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith(".pdf"));
        if (pdfFiles.length > 0) {
          // Detect types for each file
          Promise.all(
            pdfFiles.map(async (file) => {
              try {
                const previewText = await extractPDFText(file);
                return {
                  file,
                  detectedType: detectEnbdStatementType(previewText),
                };
              } catch {
                return {
                  file,
                  detectedType: "unknown" as StatementType,
                };
              }
            })
          ).then((results) => {
            const pending = results.map(r => ({
              file: r.file,
              statementType: r.detectedType === "unknown" ? "enbd_debit" : r.detectedType,
              status: "pending" as const,
              detectedType: r.detectedType,
            }));
            setPendingFiles(pending);
          });
        } else {
          // Non-PDF files: process sequentially
          files.forEach(file => handleFile(file));
        }
      }
    }
    e.target.value = "";
  }, [handleFile]);

  const handleClearAll = async () => {
    setShowClearAllModal(true);
  };

  const confirmClearAll = async () => {
    await deleteAllTransactions();
    setSuccessCount(null);
    setShowClearAllModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Statement</h1>
          <p className="text-muted-foreground mt-2">
            Upload your credit card statement to get started
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowProfiles(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Import Profiles
          </Button>
          {transactions.length > 0 && (
            <Button variant="outline" onClick={handleClearAll} className="text-destructive">
              Clear All Data
            </Button>
          )}
        </div>
      </div>

      {/* Selected Profile Info */}
      {selectedProfile && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium">Using: {selectedProfile.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedProfile.bankName}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProfile(null)}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statement Type Selector for Multi-File Upload */}
      {pendingFiles.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Select Statement Type</CardTitle>
            <CardDescription>
              Please confirm the statement type for each file. You can override the detected type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingFiles.map((pending, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{pending.file.name}</p>
                  {pending.detectedType !== "unknown" && (
                    <p className="text-xs text-muted-foreground">
                      Detected: {pending.detectedType === "enbd_debit" ? "Debit" : "Credit Card"}
                    </p>
                  )}
                </div>
                <Select
                  value={pending.statementType}
                  onValueChange={(value: StatementType) => {
                    const updated = [...pendingFiles];
                    updated[index].statementType = value;
                    setPendingFiles(updated);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enbd_debit">Debit/Saving/Current Account</SelectItem>
                    <SelectItem value="enbd_credit">Credit Card Statement</SelectItem>
                    <SelectItem value="unknown">Unknown/Auto-detect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={async () => {
                  // Process all files sequentially
                  setIsProcessing(true);
                  setError(null);
                  setInfoMessage(null);
                  let totalCount = 0;
                  
                  for (let i = 0; i < pendingFiles.length; i++) {
                    const pending = pendingFiles[i];
                    const updated = [...pendingFiles];
                    updated[i].status = "processing";
                    setPendingFiles(updated);
                    
                    try {
                      const result = await parsePdfWithFallback(
                        pending.file,
                        rules,
                        pending.statementType === "unknown" ? undefined : pending.statementType,
                        (status) => {
                          setInfoMessage(`[${i + 1}/${pendingFiles.length}] ${status}`);
                          setProcessingStage(status);
                        },
                        (progress) => {
                          setOcrProgress(progress);
                          setIsOCRActive(true);
                          setProcessingStage(progress.status);
                        },
                        ocrAbortController.current?.signal
                      );
                      
                      if (result.transactions.length > 0) {
                        const tagged = autoTagTransactions(result.transactions, rules);
                        await addTransactions(tagged);
                        totalCount += tagged.length;
                        updated[i].status = "done";
                      } else {
                        updated[i].status = "failed";
                      }
                    } catch (err) {
                      console.error(`Failed to process ${pending.file.name}:`, err);
                      updated[i].status = "failed";
                    }
                    
                    setPendingFiles(updated);
                  }
                  
                  setIsProcessing(false);
                  setIsOCRActive(false);
                  setOcrProgress(null);
                  setSuccessCount(totalCount);
                  setPendingFiles([]);
                  if (totalCount > 0) {
                    onImportSuccess?.();
                  }
                }}
                className="flex-1"
              >
                Process All Files
              </Button>
              <Button
                variant="outline"
                onClick={() => setPendingFiles([])}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Untagged</p>
              <p className="text-2xl font-bold text-yellow-500">
                {transactions.filter((t) => !t.tag).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Reimbursable</p>
              <p className="text-2xl font-bold text-green-500">
                {transactions.filter((t) => t.tag === "reimbursable").length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Card */}
      <Card className={`border-dashed transition-colors ${isDragging ? "border-primary bg-primary/5" : ""}`}>
        <CardContent className="pt-6">
          <div
            className="flex flex-col items-center justify-center py-12 text-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
              isDragging ? "bg-primary/20" : "bg-primary/10"
            }`}>
              {isProcessing || isAIProcessing ? (
                <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
            </div>
            
            <h3 className="text-lg font-semibold mb-2">
              {isProcessing ? "Processing..." : isAIProcessing ? "AI Processing..." : "Upload Statement"}
            </h3>
            
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              {isDragging
                ? "Drop the file here"
                : "Drag and drop your credit card statement here, or click to browse"}
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm max-w-md">
                {error}
              </div>
            )}

            {/* Advanced Processing No-Results Guidance */}
            {showOCRNoResultsGuidance && (
              <div className="mb-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 max-w-md">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                      This PDF is likely scanned/protected
                    </h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                      Advanced processing couldn't extract usable transaction data. Best options:
                    </p>
                    <ol className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2 list-decimal list-inside">
                      <li>
                        <strong>Upload CSV</strong> (recommended, fastest + most accurate)
                      </li>
                      <li>
                        <strong>Upload screenshots</strong> of the transaction list
                      </li>
                      <li>
                        <strong>Add transactions manually</strong> (quick-add)
                      </li>
                      <li>
                        <strong>Use an online PDF → CSV converter</strong>
                      </li>
                    </ol>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => setShowOCRNoResultsGuidance(false)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {infoMessage && (
              <div className="mb-4 p-3 rounded-lg bg-primary/10 text-primary text-sm max-w-md">
                {infoMessage}
              </div>
            )}

            {/* Processing Overlay with Tips */}
            {(isProcessing || isOCRActive || isAIProcessing) && (
              <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20 max-w-md w-full">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="font-semibold text-primary">
                    {processingStage || infoMessage || "Processing..."}
                  </span>
                </div>
                {processingTip && (
                  <p className="text-xs text-muted-foreground italic mt-2">
                    💡 {processingTip}
                  </p>
                )}
              </div>
            )}

            {/* OCR Progress */}
            {isOCRActive && ocrProgress && (
              <div className="mb-4 p-4 rounded-lg bg-primary/10 border border-primary/20 max-w-md w-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="font-semibold text-primary">Advanced Processing</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      ocrAbortController.current?.abort();
                      setIsOCRActive(false);
                      setOcrProgress(null);
                      setError("Advanced Processing cancelled.");
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {ocrProgress.status}
                </p>
                {ocrProgress.totalPages > 0 && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Page {ocrProgress.page} of {ocrProgress.totalPages}
                  </p>
                )}
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${Math.round(ocrProgress.progress * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This may take 30-90 seconds for image-based PDFs
                </p>
              </div>
            )}

            {showAIOption && (
              <div className="mb-4 p-4 rounded-lg bg-primary/10 border border-primary/20 max-w-md">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="font-semibold text-primary">AI-Powered Parsing</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Use AI to extract transactions from your PDF with higher accuracy.
                </p>
                <Button 
                  onClick={handleAIParsing} 
                  disabled={isAIProcessing}
                  className="w-full"
                >
                  {isAIProcessing ? (
                    <>
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Try AI Parsing
                    </>
                  )}
                </Button>
              </div>
            )}

            {successCount !== null && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
                Successfully imported {successCount} transactions!
              </div>
            )}

            {/* Import Debug Panel */}
            {importDebug.length > 0 && (
              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className="w-full"
                >
                  {showDebugPanel ? "Hide" : "Show"} Import Debug ({importDebug.length})
                </Button>
                {showDebugPanel && (
                  <div className="mt-2 p-4 rounded-lg bg-muted border space-y-3 text-xs">
                    <div className="font-semibold text-sm mb-2">Parser Version: {PARSER_VERSION}</div>
                    {importDebug.map((debug, idx) => (
                      <div key={idx} className="p-3 rounded bg-background border">
                        <div className="font-semibold mb-2">{debug.fileName}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Statement Type:</span>{" "}
                            <span className="font-mono">{debug.statementType}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Method:</span>{" "}
                            <span className="font-mono">{debug.method}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Stage:</span>{" "}
                            <span className="font-mono">{debug.debug?.stage || "unknown"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Confidence:</span>{" "}
                            <span className={debug.confidence >= 0.7 ? "text-green-600" : debug.confidence >= 0.4 ? "text-yellow-600" : "text-red-600"}>
                              {(debug.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rows:</span>{" "}
                            <span className="font-mono">{debug.extractedRowCount}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Parsed:</span>{" "}
                            <span className="font-mono">{debug.parsedCount}</span>
                          </div>
                        </div>
                        {debug.debug?.parseQuality && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="text-muted-foreground mb-1">Parse Quality:</div>
                            <div className={debug.debug.parseQuality.isGood ? "text-green-600" : "text-red-600"}>
                              {debug.debug.parseQuality.isGood ? "✓ GOOD" : "✗ BAD"}
                            </div>
                            <ul className="list-disc list-inside space-y-1 mt-1">
                              {debug.debug.parseQuality.reasons.map((reason: string, i: number) => (
                                <li key={i} className="text-xs">{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {debug.debug?.perPage && debug.debug.perPage.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="text-muted-foreground mb-1">Per-Page Processing:</div>
                            {debug.debug.perPage.map((page: any, i: number) => (
                              <div key={i} className="text-xs mb-1 pl-2 border-l-2">
                                Page {page.pageIndex + 1}: Advanced Processing {page.ocrTextLength} chars, 
                                Header: {page.redactionHeaderFound ? "✓" : "✗"}, 
                                Extraction: {page.llmSuccess ? `✓ ${page.llmTxCount} txs` : "✗"}
                              </div>
                            ))}
                          </div>
                        )}
                        {debug.confidenceReasons.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="text-muted-foreground mb-1">Confidence Reasons:</div>
                            <ul className="list-disc list-inside space-y-1">
                              {debug.confidenceReasons.map((reason, i) => (
                                <li key={i} className="text-xs">{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Statement Type Selection Modal */}
            {showStatementTypeModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md m-4">
                  <CardHeader>
                    <CardTitle>What type of statement is this?</CardTitle>
                    <CardDescription>
                      {pendingFileForType?.name}
                      {pendingDetectedType !== "unknown" && (
                        <span className="block mt-1 text-xs">
                          Auto-detected: {pendingDetectedType === "enbd_debit" ? "Bank Account" : "Credit Card"}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant={pendingDetectedType === "enbd_debit" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleStatementTypeConfirmed("enbd_debit")}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Bank Account (Debit / Current / Savings)
                    </Button>
                    <Button
                      variant={pendingDetectedType === "enbd_credit" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleStatementTypeConfirmed("enbd_credit")}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Credit Card
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Clear All Confirmation Modal */}
            {showClearAllModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md m-4">
                  <CardHeader className="border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">Clear All Transactions?</CardTitle>
                        <CardDescription className="mt-1">
                          This action cannot be undone
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-6">
                      Are you sure you want to delete all transactions? This will permanently remove all transaction data from your account.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setShowClearAllModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={confirmClearAll}
                      >
                        Delete All
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              multiple
              onChange={handleFileInput}
              className="hidden"
              disabled={isProcessing || isAIProcessing}
            />
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isAIProcessing}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Select File
              </Button>
              
              {transactions.length === 0 && (
                <DemoDataLoader variant="button" onLoaded={handleDemoLoaded} />
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              Supported: CSV, Excel (.xlsx), PDF
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Demo Data Card */}
      {transactions.length === 0 && (
        <DemoDataLoader variant="card" onLoaded={handleDemoLoaded} />
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to export your statement</CardTitle>
          <CardDescription>
            Follow these steps to download your credit card statement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
              <span>Log in to your bank&apos;s online banking or mobile app</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
              <span>Navigate to your credit card account and select &quot;Statements&quot;</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
              <span>Choose the statement period and click &quot;Download&quot; or &quot;Export&quot;</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">4</span>
              <span>Download as CSV, Excel, or PDF and save to your device</span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Import Profile Manager Modal */}
      <ImportProfileManager
        isOpen={showProfiles}
        onClose={() => setShowProfiles(false)}
        onSelectProfile={(profile) => setSelectedProfile(profile)}
      />
    </div>
  );
}
