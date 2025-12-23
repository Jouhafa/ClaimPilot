import { get, set, del } from "idb-keyval";
import type { Transaction, Rule, CardSafetyData, ClaimBatch } from "./types";

const TRANSACTIONS_KEY = "reimburse_transactions";
const RULES_KEY = "reimburse_rules";
const CARD_SAFETY_KEY = "reimburse_card_safety";
const LICENSE_KEY = "reimburse_license";
const BATCHES_KEY = "reimburse_batches";

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
  const filtered = transactions.filter((tx) => tx.id !== id);
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
