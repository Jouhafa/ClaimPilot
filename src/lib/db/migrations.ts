// Migration utilities for moving data from IndexedDB to Supabase

import { getAdminClient } from "@/lib/supabase/admin";
import type {
  Transaction,
  Rule,
  Goal,
  Bucket,
  ClaimBatch,
  MerchantAlias,
  CategoryRule,
  RecurringTransaction,
  IncomeConfig,
  Account,
  Budget,
  WrapSnapshot,
} from "@/lib/types";
import {
  loadTransactions,
  loadRules,
  loadGoals,
  loadBuckets,
  loadBatches,
  loadAliases,
  loadCategoryRules,
  loadRecurring,
  loadIncomeConfig,
  loadAccounts,
  loadBudgets,
  getMonthlyWrap,
} from "@/lib/storage";

export interface MigrationResult {
  success: boolean;
  migrated: {
    transactions: number;
    rules: number;
    goals: number;
    buckets: number;
    batches: number;
    aliases: number;
    categoryRules: number;
    recurring: number;
    accounts: number;
    budgets: number;
    wraps: number;
  };
  errors: string[];
}

export async function migrateLocalDataToSupabase(userId: string): Promise<MigrationResult> {
  const supabase = getAdminClient();
  const result: MigrationResult = {
    success: true,
    migrated: {
      transactions: 0,
      rules: 0,
      goals: 0,
      buckets: 0,
      batches: 0,
      aliases: 0,
      categoryRules: 0,
      recurring: 0,
      accounts: 0,
      budgets: 0,
      wraps: 0,
    },
    errors: [],
  };

  try {
    // Migrate transactions
    try {
      const transactions = await loadTransactions();
      if (transactions.length > 0) {
        const { error } = await (supabase.from("transactions") as any).upsert(
          transactions.map((tx) => ({
            user_id: userId,
            date: tx.date,
            posting_date: tx.postingDate,
            merchant: tx.merchant,
            description: tx.description,
            amount: tx.amount,
            currency: tx.currency,
            balance: tx.balance,
            account_id: tx.accountId,
            tag: tx.tag,
            status: tx.status,
            transaction_status: tx.transactionStatus,
            is_manual: tx.isManual,
            note: tx.note,
            batch_id: tx.batchId,
            category: tx.category,
            spending_type: tx.spendingType,
            kind: tx.kind,
            source_doc_type: tx.sourceDocType,
            source_file_name: tx.sourceFileName,
            is_recurring: tx.isRecurring,
            recurring_frequency: tx.recurringFrequency,
            parent_id: tx.parentId,
            split_percentage: tx.splitPercentage,
            is_split: tx.isSplit,
            suggested_tag: tx.suggestedTag,
            suggested_category: tx.suggestedCategory,
            tag_confidence: tx.tagConfidence,
            tag_reason: tx.tagReason,
            is_auto_tagged: tx.isAutoTagged,
            is_auto_categorized: tx.isAutoCategorized,
            created_at: tx.createdAt,
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
        result.migrated.transactions = transactions.length;
      }
    } catch (error: any) {
      result.errors.push(`Transactions: ${error.message}`);
      result.success = false;
    }

    // Migrate rules
    try {
      const rules = await loadRules();
      if (rules.length > 0) {
        const { error } = await (supabase.from("rules") as any).upsert(
          rules.map((rule) => ({
            user_id: userId,
            id: rule.id,
            name: rule.name,
            conditions: rule.conditions,
            action: rule.action,
            created_at: new Date().toISOString(),
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
        result.migrated.rules = rules.length;
      }
    } catch (error: any) {
      result.errors.push(`Rules: ${error.message}`);
    }

    // Migrate goals
    try {
      const goals = await loadGoals();
      if (goals.length > 0) {
        const { error } = await (supabase.from("goals") as any).upsert(
          goals.map((goal) => ({
            user_id: userId,
            id: goal.id,
            name: goal.name,
            target_amount: goal.targetAmount,
            current_amount: goal.currentAmount,
            target_date: goal.targetDate,
            category: goal.category,
            priority: goal.priority,
            notes: null, // Goal interface doesn't have notes property
            created_at: goal.createdAt,
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
        result.migrated.goals = goals.length;
      }
    } catch (error: any) {
      result.errors.push(`Goals: ${error.message}`);
    }

    // Migrate buckets
    try {
      const buckets = await loadBuckets();
      if (buckets.length > 0) {
        const { error } = await (supabase.from("buckets") as any).upsert(
          buckets.map((bucket) => ({
            user_id: userId,
            id: bucket.id,
            name: bucket.name,
            target_percentage: bucket.targetPercentage,
            color: bucket.color,
            linked_categories: bucket.linkedCategories,
            created_at: bucket.createdAt,
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
        result.migrated.buckets = buckets.length;
      }
    } catch (error: any) {
      result.errors.push(`Buckets: ${error.message}`);
    }

    // Migrate batches
    try {
      const batches = await loadBatches();
      if (batches.length > 0) {
        const { error } = await (supabase.from("claim_batches") as any).upsert(
          batches.map((batch) => ({
            user_id: userId,
            id: batch.id,
            name: batch.name,
            status: batch.status,
            created_at: batch.createdAt,
            submitted_at: batch.submittedAt,
            paid_at: batch.paidAt,
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
        result.migrated.batches = batches.length;
      }
    } catch (error: any) {
      result.errors.push(`Batches: ${error.message}`);
    }

    // Migrate aliases
    try {
      const aliases = await loadAliases();
      if (aliases.length > 0) {
        const { error } = await (supabase.from("merchant_aliases") as any).upsert(
          aliases.map((alias) => ({
            user_id: userId,
            id: alias.id,
            alias: alias.normalizedName, // MerchantAlias uses normalizedName
            canonical_name: alias.normalizedName,
            created_at: new Date().toISOString(), // MerchantAlias doesn't have createdAt
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
        result.migrated.aliases = aliases.length;
      }
    } catch (error: any) {
      result.errors.push(`Aliases: ${error.message}`);
    }

    // Migrate category rules
    try {
      const categoryRules = await loadCategoryRules();
      if (categoryRules.length > 0) {
        const { error } = await (supabase.from("category_rules") as any).upsert(
          categoryRules.map((rule) => ({
            user_id: userId,
            id: rule.id,
            category: rule.category,
            conditions: rule.conditions,
            created_at: rule.createdAt,
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
        result.migrated.categoryRules = categoryRules.length;
      }
    } catch (error: any) {
      result.errors.push(`Category Rules: ${error.message}`);
    }

    // Migrate recurring
    try {
      const recurring = await loadRecurring();
      if (recurring.length > 0) {
        const { error } = await (supabase.from("recurring_transactions") as any).upsert(
          recurring.map((rec) => ({
            user_id: userId,
            id: rec.id,
            merchant: rec.normalizedMerchant || rec.merchantPattern || "", // RecurringTransaction uses normalizedMerchant
            amount: rec.averageAmount,
            frequency: rec.frequency,
            last_occurrence: rec.lastOccurrence,
            category: rec.category,
            tag: null, // RecurringTransaction doesn't have tag
            created_at: new Date().toISOString(), // RecurringTransaction doesn't have createdAt
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
        result.migrated.recurring = recurring.length;
      }
    } catch (error: any) {
      result.errors.push(`Recurring: ${error.message}`);
    }

    // Migrate accounts
    try {
      const accounts = await loadAccounts();
      if (accounts.length > 0) {
        const { error } = await (supabase.from("accounts") as any).upsert(
          accounts.map((account) => ({
            user_id: userId,
            id: account.id,
            name: account.name,
            type: account.type,
            balance: account.currentBalance || 0, // Account uses currentBalance, not balance
            currency: account.currency,
            is_active: account.isActive,
            created_at: account.createdAt || new Date().toISOString(),
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
        result.migrated.accounts = accounts.length;
      }
    } catch (error: any) {
      result.errors.push(`Accounts: ${error.message}`);
    }

    // Migrate budgets
    try {
      const budgets = await loadBudgets();
      if (budgets.length > 0) {
        const { error } = await (supabase.from("budgets") as any).upsert(
          budgets.map((budget) => ({
            user_id: userId,
            id: budget.id,
            name: budget.category, // Budget doesn't have name, use category
            amount: budget.monthlyAmount, // Budget uses monthlyAmount
            period: "monthly" as const, // Budget is always monthly
            category: budget.category,
            created_at: budget.createdAt,
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
        result.migrated.budgets = budgets.length;
      }
    } catch (error: any) {
      result.errors.push(`Budgets: ${error.message}`);
    }

    // Migrate wraps (get all months)
    try {
      // This would need to be implemented to get all wrap snapshots
      // For now, we'll skip this as it requires additional logic
      result.migrated.wraps = 0;
    } catch (error: any) {
      result.errors.push(`Wraps: ${error.message}`);
    }
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Migration failed: ${error.message}`);
  }

  return result;
}

