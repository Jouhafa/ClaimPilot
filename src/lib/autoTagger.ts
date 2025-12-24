import type { Transaction, TransactionTag, TagConfidence, Rule } from "./types";
import { ruleMatchesTransaction, getRuleTag } from "./types";

export interface AutoTagResult {
  tag: TransactionTag;
  confidence: TagConfidence;
  reason: string;
}

// Pattern definitions for auto-tagging
interface TagPattern {
  keywords: string[];
  tag: Exclude<TransactionTag, null>;
  confidence: TagConfidence;
  category: string;
}

// High confidence patterns - very likely to be correct
const HIGH_CONFIDENCE_PATTERNS: TagPattern[] = [
  // Hotels - almost always reimbursable
  {
    keywords: ["marriott", "hilton", "hyatt", "sheraton", "intercontinental", "holiday inn", "radisson", "novotel", "ibis", "rotana", "jumeirah", "fairmont", "sofitel", "ritz", "four seasons", "st regis", "w hotel", "westin"],
    tag: "reimbursable",
    confidence: "high",
    category: "Hotel/Accommodation",
  },
  // Airlines - almost always reimbursable
  {
    keywords: ["emirates", "etihad", "qatar airways", "fly dubai", "air arabia", "lufthansa", "british airways", "klm", "air france", "turkish airlines", "saudia", "gulf air", "oman air", "airline", "airways"],
    tag: "reimbursable",
    confidence: "high",
    category: "Flight/Travel",
  },
  // Streaming/subscriptions - almost always personal
  {
    keywords: ["netflix", "spotify", "apple music", "youtube premium", "disney+", "hbo", "amazon prime video", "hulu", "deezer"],
    tag: "personal",
    confidence: "high",
    category: "Entertainment Subscription",
  },
  // Grocery stores - almost always personal
  {
    keywords: ["carrefour", "lulu hypermarket", "spinneys", "waitrose", "union coop", "choithrams", "al maya", "geant", "nesto"],
    tag: "personal",
    confidence: "high",
    category: "Groceries",
  },
];

// Medium confidence patterns - could go either way
const MEDIUM_CONFIDENCE_PATTERNS: TagPattern[] = [
  // Ride-hailing - could be personal or work
  {
    keywords: ["uber", "careem", "hala", "lyft", "grab", "bolt", "taxi"],
    tag: "personal",
    confidence: "medium",
    category: "Transport/Ride",
  },
  // Restaurants/food - could be client dinner or personal
  {
    keywords: ["restaurant", "cafe", "coffee", "starbucks", "costa", "tim hortons", "dunkin", "mcdonald", "burger king", "kfc", "subway", "pizza hut", "dominos", "deliveroo", "talabat", "zomato", "noon food"],
    tag: "personal",
    confidence: "medium",
    category: "Food & Dining",
  },
  // Office supplies - usually reimbursable
  {
    keywords: ["office depot", "staples", "ikea", "ace hardware", "office supplies"],
    tag: "reimbursable",
    confidence: "medium",
    category: "Office Supplies",
  },
  // Software - could be personal or work
  {
    keywords: ["adobe", "microsoft", "google workspace", "zoom", "slack", "notion", "figma", "canva", "dropbox", "github", "aws", "azure", "heroku"],
    tag: "reimbursable",
    confidence: "medium",
    category: "Software/SaaS",
  },
  // Telecom - usually personal
  {
    keywords: ["du ", "etisalat", "virgin mobile"],
    tag: "personal",
    confidence: "medium",
    category: "Telecom",
  },
];

// Low confidence patterns - need review
const LOW_CONFIDENCE_PATTERNS: TagPattern[] = [
  // General retail
  {
    keywords: ["amazon", "noon", "namshi"],
    tag: "personal",
    confidence: "low",
    category: "Online Shopping",
  },
  // Fuel - could be either
  {
    keywords: ["adnoc", "enoc", "emarat", "petrol", "fuel", "gas station"],
    tag: "personal",
    confidence: "low",
    category: "Fuel/Petrol",
  },
];

// Combine all patterns
const ALL_PATTERNS = [
  ...HIGH_CONFIDENCE_PATTERNS,
  ...MEDIUM_CONFIDENCE_PATTERNS,
  ...LOW_CONFIDENCE_PATTERNS,
];

/**
 * Auto-tag a single transaction based on patterns and rules
 */
export function autoTagTransaction(
  tx: Transaction,
  userRules: Rule[] = []
): AutoTagResult | null {
  const searchText = `${tx.merchant} ${tx.description}`.toLowerCase();

  // First, check user-defined rules (highest priority)
  for (const rule of userRules) {
    if (ruleMatchesTransaction(rule, tx)) {
      return {
        tag: getRuleTag(rule),
        confidence: "high",
        reason: `Matched rule: ${rule.name || rule.contains || "Custom rule"}`,
      };
    }
  }

  // Then check built-in patterns
  for (const pattern of ALL_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return {
          tag: pattern.tag,
          confidence: pattern.confidence,
          reason: `${pattern.category}: "${keyword}"`,
        };
      }
    }
  }

  // Amount-based heuristics (low confidence)
  const absAmount = Math.abs(tx.amount);
  
  // Large amounts (>500) during typical business hours might be business expenses
  if (absAmount > 500) {
    const txDate = new Date(tx.date);
    const dayOfWeek = txDate.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    if (isWeekday) {
      return {
        tag: "reimbursable",
        confidence: "low",
        reason: `Large amount (${absAmount.toFixed(0)} AED) on weekday`,
      };
    }
  }

  // Very small amounts (<20) are likely personal
  if (absAmount < 20) {
    return {
      tag: "personal",
      confidence: "low",
      reason: `Small amount (${absAmount.toFixed(0)} AED)`,
    };
  }

  // No match found
  return null;
}

/**
 * Auto-tag multiple transactions
 */
export function autoTagTransactions(
  transactions: Transaction[],
  userRules: Rule[] = []
): Transaction[] {
  return transactions.map((tx) => {
    // Skip if already tagged by user
    if (tx.tag && !tx.isAutoTagged) {
      return tx;
    }

    const result = autoTagTransaction(tx, userRules);
    
    if (result) {
      return {
        ...tx,
        tag: result.tag,
        suggestedTag: result.tag,
        tagConfidence: result.confidence,
        tagReason: result.reason,
        isAutoTagged: true,
        status: result.tag === "reimbursable" ? "draft" : undefined,
      };
    }

    return {
      ...tx,
      suggestedTag: null,
      tagConfidence: undefined,
      tagReason: "No pattern match",
    };
  });
}

/**
 * Get statistics about auto-tagging results
 */
export function getAutoTagStats(transactions: Transaction[]) {
  const highConfidence = transactions.filter(
    (tx) => tx.tagConfidence === "high" && tx.isAutoTagged
  );
  const mediumConfidence = transactions.filter(
    (tx) => tx.tagConfidence === "medium" && tx.isAutoTagged
  );
  const lowConfidence = transactions.filter(
    (tx) => tx.tagConfidence === "low" && tx.isAutoTagged
  );
  const untagged = transactions.filter(
    (tx) => !tx.tag && !tx.suggestedTag
  );
  const manuallyTagged = transactions.filter(
    (tx) => tx.tag && !tx.isAutoTagged
  );

  return {
    total: transactions.length,
    highConfidence: highConfidence.length,
    mediumConfidence: mediumConfidence.length,
    lowConfidence: lowConfidence.length,
    untagged: untagged.length,
    manuallyTagged: manuallyTagged.length,
    autoTaggedCount: highConfidence.length + mediumConfidence.length + lowConfidence.length,
    needsReviewCount: mediumConfidence.length + lowConfidence.length + untagged.length,
  };
}

/**
 * Find similar transactions by merchant
 */
export function findSimilarTransactions(
  targetTx: Transaction,
  allTransactions: Transaction[]
): Transaction[] {
  const targetMerchant = targetTx.merchant.toLowerCase().trim();
  const targetWords = targetMerchant.split(/\s+/).filter((w) => w.length > 2);

  return allTransactions.filter((tx) => {
    if (tx.id === targetTx.id) return false;
    
    const merchant = tx.merchant.toLowerCase().trim();
    
    // Exact match
    if (merchant === targetMerchant) return true;
    
    // First significant word match (e.g., "UBER" matches "UBER TRIP", "UBER BV")
    if (targetWords.length > 0) {
      const txWords = merchant.split(/\s+/).filter((w) => w.length > 2);
      if (txWords.length > 0 && targetWords[0] === txWords[0]) {
        return true;
      }
    }
    
    return false;
  });
}

