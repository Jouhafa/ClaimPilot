import { get, set, del } from "idb-keyval";
import type { Transaction, Rule, CardSafetyData, ClaimBatch, ImportProfile, MerchantAlias } from "./types";

const TRANSACTIONS_KEY = "reimburse_transactions";
const RULES_KEY = "reimburse_rules";
const CARD_SAFETY_KEY = "reimburse_card_safety";
const LICENSE_KEY = "reimburse_license";
const BATCHES_KEY = "reimburse_batches";
const PROFILES_KEY = "reimburse_import_profiles";
const ALIASES_KEY = "reimburse_merchant_aliases";

// Transactions
export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  await set(TRANSACTIONS_KEY, transactions);
}

export async function loadTransactions(): Promise<Transaction[]> {
  const data = await get<Transaction[]>(TRANSACTIONS_KEY);
  return data || [];
}

export async function addTransactions(newTransactions: Transaction[]): Promise<Transaction[]> {
  const existing = await loadTransactions();
  // Dedupe by checking if transaction with same date, description, amount exists
  const deduped = newTransactions.filter((newTx) => {
    return !existing.some(
      (existingTx) =>
        existingTx.date === newTx.date &&
        existingTx.description === newTx.description &&
        existingTx.amount === newTx.amount
    );
  });
  const merged = [...existing, ...deduped];
  await saveTransactions(merged);
  return merged;
}

export async function updateTransaction(
  id: string,
  updates: Partial<Transaction>
): Promise<Transaction[]> {
  const transactions = await loadTransactions();
  const updated = transactions.map((tx) =>
    tx.id === id ? { ...tx, ...updates } : tx
  );
  await saveTransactions(updated);
  return updated;
}

export async function deleteTransaction(id: string): Promise<Transaction[]> {
  const transactions = await loadTransactions();
  // Also delete any children if this is a parent
  const filtered = transactions.filter((tx) => tx.id !== id && tx.parentId !== id);
  await saveTransactions(filtered);
  return filtered;
}

export async function clearAllTransactions(): Promise<void> {
  await del(TRANSACTIONS_KEY);
}

// Rules
export async function saveRules(rules: Rule[]): Promise<void> {
  await set(RULES_KEY, rules);
}

export async function loadRules(): Promise<Rule[]> {
  const data = await get<Rule[]>(RULES_KEY);
  return data || [];
}

export async function addRule(rule: Rule): Promise<Rule[]> {
  const rules = await loadRules();
  rules.push(rule);
  await saveRules(rules);
  return rules;
}

export async function deleteRule(id: string): Promise<Rule[]> {
  const rules = await loadRules();
  const filtered = rules.filter((r) => r.id !== id);
  await saveRules(filtered);
  return filtered;
}

// Card Safety
export async function saveCardSafety(data: CardSafetyData): Promise<void> {
  await set(CARD_SAFETY_KEY, data);
}

export async function loadCardSafety(): Promise<CardSafetyData | null> {
  const data = await get<CardSafetyData>(CARD_SAFETY_KEY);
  return data || null;
}

// License
export async function saveLicense(key: string): Promise<void> {
  await set(LICENSE_KEY, { key, validatedAt: new Date().toISOString() });
}

export async function loadLicense(): Promise<{ key: string; validatedAt: string } | null> {
  const data = await get<{ key: string; validatedAt: string }>(LICENSE_KEY);
  return data || null;
}

export async function clearLicense(): Promise<void> {
  await del(LICENSE_KEY);
}

// Claim Batches
export async function saveBatches(batches: ClaimBatch[]): Promise<void> {
  await set(BATCHES_KEY, batches);
}

export async function loadBatches(): Promise<ClaimBatch[]> {
  const data = await get<ClaimBatch[]>(BATCHES_KEY);
  return data || [];
}

export async function addBatch(batch: ClaimBatch): Promise<ClaimBatch[]> {
  const batches = await loadBatches();
  batches.push(batch);
  await saveBatches(batches);
  return batches;
}

export async function updateBatch(
  id: string,
  updates: Partial<ClaimBatch>
): Promise<ClaimBatch[]> {
  const batches = await loadBatches();
  const updated = batches.map((b) =>
    b.id === id ? { ...b, ...updates } : b
  );
  await saveBatches(updated);
  return updated;
}

export async function deleteBatch(id: string): Promise<ClaimBatch[]> {
  const batches = await loadBatches();
  const filtered = batches.filter((b) => b.id !== id);
  await saveBatches(filtered);
  return filtered;
}

// Import Profiles
export async function saveProfiles(profiles: ImportProfile[]): Promise<void> {
  await set(PROFILES_KEY, profiles);
}

export async function loadProfiles(): Promise<ImportProfile[]> {
  const data = await get<ImportProfile[]>(PROFILES_KEY);
  return data || [];
}

export async function addProfile(profile: ImportProfile): Promise<ImportProfile[]> {
  const profiles = await loadProfiles();
  profiles.push(profile);
  await saveProfiles(profiles);
  return profiles;
}

export async function deleteProfile(id: string): Promise<ImportProfile[]> {
  const profiles = await loadProfiles();
  const filtered = profiles.filter((p) => p.id !== id);
  await saveProfiles(filtered);
  return filtered;
}

// Merchant Aliases
export async function saveAliases(aliases: MerchantAlias[]): Promise<void> {
  await set(ALIASES_KEY, aliases);
}

export async function loadAliases(): Promise<MerchantAlias[]> {
  const data = await get<MerchantAlias[]>(ALIASES_KEY);
  return data || getDefaultAliases();
}

export async function addAlias(alias: MerchantAlias): Promise<MerchantAlias[]> {
  const aliases = await loadAliases();
  aliases.push(alias);
  await saveAliases(aliases);
  return aliases;
}

export async function updateAlias(
  id: string,
  updates: Partial<MerchantAlias>
): Promise<MerchantAlias[]> {
  const aliases = await loadAliases();
  const updated = aliases.map((a) =>
    a.id === id ? { ...a, ...updates } : a
  );
  await saveAliases(updated);
  return updated;
}

export async function deleteAlias(id: string): Promise<MerchantAlias[]> {
  const aliases = await loadAliases();
  const filtered = aliases.filter((a) => a.id !== id);
  await saveAliases(filtered);
  return filtered;
}

// Default merchant aliases
function getDefaultAliases(): MerchantAlias[] {
  return [
    { id: "careem", variants: ["CAREEM", "CAREEM HALA", "CAREEM UAE"], normalizedName: "Careem" },
    { id: "uber", variants: ["UBER", "UBER BV", "UBER TRIP", "UBER EATS"], normalizedName: "Uber" },
    { id: "amazon", variants: ["AMAZON", "AMAZON.AE", "AMZN", "AMAZON AWS"], normalizedName: "Amazon" },
    { id: "netflix", variants: ["NETFLIX", "NETFLIX.COM"], normalizedName: "Netflix" },
    { id: "spotify", variants: ["SPOTIFY", "SPOTIFY AB"], normalizedName: "Spotify" },
    { id: "starbucks", variants: ["STARBUCKS", "STARBUCKS COFFEE"], normalizedName: "Starbucks" },
    { id: "marriott", variants: ["MARRIOTT", "MARRIOTT HOTEL", "MARRIOTT BONVOY"], normalizedName: "Marriott" },
    { id: "hilton", variants: ["HILTON", "HILTON HOTEL", "HILTON HONORS"], normalizedName: "Hilton" },
  ];
}
