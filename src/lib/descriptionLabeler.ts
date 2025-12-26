/**
 * Transaction Description Labeler
 * 
 * Improves transaction descriptions by:
 * - Stripping boilerplate (card numbers, refs, dates, amounts)
 * - Extracting meaningful merchant names
 * - Applying category-based labeling rules
 * - Normalizing text for better matching
 */

export type LabelConfig = {
  maxWords: number;                 // 1-3
  currencies: string[];             // ["AED","USD","EUR",...]
  stopWords: Set<string>;           // generic junk tokens to ignore
  categoryRules: Array<{
    label: string;
    // match on normalized (UPPER) text
    match: (t: string) => boolean;
  }>;
};

export const DEFAULT_LABEL_CONFIG: LabelConfig = {
  maxWords: 2,
  currencies: ["AED", "USD", "EUR", "GBP", "SAR", "QAR", "KWD", "OMR", "BHD"],
  stopWords: new Set([
    "AED", "USD", "EUR", "GBP",
    "AE", "UAE",
    "REF", "REFNO", "REFERENCE", "NO",
    "CARD", "CC", "NO.",
    "AUTH", "APPROVAL", "TRACE", "TXN", "TRANSACTION",
    "POS", "E-COM", "ECOM", "ONLINE",
    "VISA", "MASTERCARD", "MC",
    "PAYMENT", "PURCHASE", // keep "SALARY PAYMENT" handled by category rules
  ]),
  categoryRules: [
    { label: "Salary payment", match: (t) => /SALARY|PAYROLL/.test(t) },
    { label: "Bank transfer",  match: (t) => /TRANSFER|TT\s*REF|WIRE|SWIFT|IBAN/.test(t) },
    { label: "Card purchase",  match: (t) => /CARD\s*NO\.?|POS\b|PURCHASE/.test(t) },
    { label: "ATM cash",       match: (t) => /ATM|CASH\s*WITHDRAWAL|WITHDRAWAL/.test(t) },
    { label: "Fees",           match: (t) => /FEE|CHARGE|COMMISSION/.test(t) },
    { label: "Refund",         match: (t) => /REFUND|REVERSAL|REVERSED|CHARGEBACK/.test(t) },
    { label: "Interest",       match: (t) => /INTEREST/.test(t) },
  ],
};

/**
 * Derive a clean label from a raw transaction description
 * 
 * @param rawDescription - The raw description from the statement
 * @param cfg - Configuration for label derivation (defaults to DEFAULT_LABEL_CONFIG)
 * @returns A clean, normalized label for the transaction
 */
export function deriveLabel(rawDescription: string, cfg: LabelConfig = DEFAULT_LABEL_CONFIG): string {
  const raw = (rawDescription ?? "").trim();
  if (!raw) return "Unknown";

  const upper = normalizeUpper(raw);

  // 1) Category-first (generalizes well)
  for (const rule of cfg.categoryRules) {
    if (rule.match(upper)) return rule.label;
  }

  // 2) If it looks like a location-only line (timestamps + UAE), label location
  const loc = extractLocation(upper);
  if (loc) return loc;

  // 3) Merchant-like extraction (strip boilerplate then pick first good tokens)
  const candidate = stripBoilerplate(raw, cfg);
  const tokens = extractWordTokens(candidate)
    .map(t => t.toUpperCase())
    .filter(t => !cfg.stopWords.has(t))
    .filter(t => t.length >= 2);

  if (tokens.length === 0) return "Unknown";

  // Prefer 2 words; allow 1..maxWords
  const n = Math.min(cfg.maxWords, tokens.length);
  return tokens.slice(0, n).join(" ");
}

/**
 * Normalize text to uppercase, clean quotes and special chars
 */
function normalizeUpper(s: string): string {
  return s
    .replace(/[""]/g, "")
    .replace(/['']/g, "'")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Strip boilerplate from description (card numbers, refs, dates, amounts, etc.)
 */
function stripBoilerplate(raw: string, cfg: LabelConfig): string {
  let s = raw;

  // Remove obvious prefixes / IDs
  s = s.replace(/^\s*(CARD\s+NO\.?|CC\s+NO\.?)\s*/i, "");
  s = s.replace(/\b\d{4,6}X{4,}\d{3,6}\b/gi, " ");           // masked PAN
  s = s.replace(/\bREF\s*NO\.?\s*[:\-]?\s*/gi, " ");
  s = s.replace(/\bAUTH(ORIZATION)?\s*[:\-]?\s*\w+\b/gi, " ");
  s = s.replace(/\bTRACE\s*[:\-]?\s*\w+\b/gi, " ");
  s = s.replace(/\bTXN\s*[:\-]?\s*\w+\b/gi, " ");

  // Remove dates / times
  s = s.replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, " ");
  s = s.replace(/\b\d{1,2}:\d{2}:\d{2}\b/g, " ");

  // Remove amounts + currencies (even if stuck like "108.35,AED")
  const curGroup = cfg.currencies.join("|");
  s = s.replace(new RegExp(`\\b\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?\\s*(?:,\\s*)?(?:${curGroup})\\b`, "gi"), " ");
  s = s.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, " ");   // plain numbers

  // Remove common location suffix noise but keep city words
  s = s.replace(/\b(UAE|AE)\b/gi, " ");

  // Collapse
  s = s.replace(/[^\p{L}\s]/gu, " "); // keep letters (Latin + Arabic), spaces
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Extract word tokens from text, preferring Latin tokens
 */
function extractWordTokens(s: string): string[] {
  // Prefer Latin tokens for labels; if none exist, fallback to any letters (Arabic supported)
  const latin = s.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g);
  if (latin && latin.length) return latin;
  return s.match(/\p{L}+/gu) ?? [];
}

/**
 * Extract location from description if it's location-dominant
 */
function extractLocation(upper: string): string | null {
  // Handles lines dominated by location / timestamps
  const hasDubaiUae = upper.includes("DUBAI") && upper.includes("UAE");
  if (hasDubaiUae) return "Dubai UAE";
  if (upper.includes("ABU") && upper.includes("DHABI")) return "Abu Dhabi";
  if (upper.includes("UAE")) return "UAE";
  return null;
}

/**
 * Improve merchant name extraction using label derivation
 * This is a wrapper that uses deriveLabel but keeps the merchant field format
 */
export function improveMerchantName(description: string, cfg?: LabelConfig): string {
  const label = deriveLabel(description, cfg);
  
  // If it's a category label, return as-is
  if (label === "Salary payment" || label === "Bank transfer" || 
      label === "Card purchase" || label === "ATM cash" || 
      label === "Fees" || label === "Refund" || label === "Interest") {
    return label;
  }
  
  // For location labels, return as-is
  if (label === "Dubai UAE" || label === "Abu Dhabi" || label === "UAE") {
    return label;
  }
  
  // For merchant names, capitalize properly
  return label
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Improve transaction description by cleaning and normalizing
 * Returns both improved merchant and description
 */
export function improveTransactionDescription(
  rawDescription: string,
  cfg?: LabelConfig
): { merchant: string; description: string } {
  const merchant = improveMerchantName(rawDescription, cfg);
  const cleanedDescription = stripBoilerplate(rawDescription, cfg || DEFAULT_LABEL_CONFIG);
  
  return {
    merchant,
    description: cleanedDescription || rawDescription.trim(),
  };
}

