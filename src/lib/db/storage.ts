// Supabase-based storage layer
// This replaces IndexedDB storage with Supabase database calls
// Maintains the same API surface for backward compatibility

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
  CardSafetyData,
  WrapSnapshot,
  ROITrackerData,
  Reminder,
  ExpenseCoverageConfig,
  ExpenseCoverageItem,
  ImportProfile,
} from "@/lib/types";
import type { UserProfile } from "@/lib/appState";

// Get current user ID from session
async function getUserId(): Promise<string | null> {
  // This will be called from client components that have access to session
  // For now, we'll need to pass userId explicitly or get it from NextAuth session
  // TODO: Integrate with NextAuth session
  return null;
}

// Transactions
export async function loadTransactions(userId: string): Promise<Transaction[]> {
  const supabase = getAdminClient();
  const { data, error } = await (supabase.from("transactions") as any)
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error loading transactions:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.date,
    postingDate: row.posting_date,
    merchant: row.merchant,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    balance: row.balance,
    accountId: row.account_id,
    tag: row.tag as Transaction["tag"],
    status: row.status as Transaction["status"],
    transactionStatus: row.transaction_status as Transaction["transactionStatus"],
    isManual: row.is_manual,
    note: row.note,
    batchId: row.batch_id,
    category: row.category as Transaction["category"],
    spendingType: row.spending_type as Transaction["spendingType"],
    kind: row.kind as Transaction["kind"],
    sourceDocType: row.source_doc_type as Transaction["sourceDocType"],
    sourceFileName: row.source_file_name,
    isRecurring: row.is_recurring,
    recurringFrequency: row.recurring_frequency as Transaction["recurringFrequency"],
    parentId: row.parent_id,
    splitPercentage: row.split_percentage,
    isSplit: row.is_split,
    suggestedTag: row.suggested_tag as Transaction["suggestedTag"],
    suggestedCategory: row.suggested_category as Transaction["suggestedCategory"],
    tagConfidence: row.tag_confidence as Transaction["tagConfidence"],
    tagReason: row.tag_reason,
    isAutoTagged: row.is_auto_tagged,
    isAutoCategorized: row.is_auto_categorized,
    createdAt: row.created_at,
  }));
}

// Helper function to ensure user exists in Supabase
async function ensureUserExists(userId: string, email?: string): Promise<void> {
  const supabase = getAdminClient();
  const isClient = typeof window !== "undefined";
  
  // Check if user exists
  const { data: existingUser, error: checkError } = await (supabase.from("users") as any)
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  
  if (checkError && checkError.code !== "PGRST116") {
    // If we can't even check (e.g., RLS blocking), log and continue
    // This might happen on client if RLS is misconfigured
    console.warn("Could not check if user exists:", checkError);
    if (isClient) {
      // On client, try to create via API route
      try {
        const response = await fetch("/api/users/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const result = await response.json();
          console.log("User ensured via API:", result.message);
          return;
        } else {
          const error = await response.json();
          console.error("Failed to ensure user via API:", error);
        }
      } catch (apiError) {
        console.error("Error calling ensure user API:", apiError);
      }
      // If API call fails, continue and let the operation fail naturally
      return;
    }
  }
  
  // If user doesn't exist, try to create them
  if (!existingUser) {
    // On the client side, call API route to create user server-side
    if (isClient) {
      try {
        const response = await fetch("/api/users/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("User created via API:", result.message);
          return;
        } else {
          const error = await response.json();
          console.error("Failed to create user via API:", error);
          throw new Error(`User does not exist and could not be created: ${error.details || error.error}`);
        }
      } catch (apiError) {
        console.error("Error calling ensure user API:", apiError);
        throw new Error(`User does not exist and could not be created: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    }
    
    // On the server side, we can create users directly (using service role key)
    const { error: createError } = await (supabase.from("users") as any).insert({
      id: userId,
      email: email || `${userId}@temp.local`, // Temporary email if not provided
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    if (createError) {
      console.error("Error creating user in Supabase:", createError);
      // On server, we can throw since we have proper permissions
      throw new Error(`User does not exist in database and could not be created: ${createError.message}`);
    }
    
    console.log(`Created user ${userId} in Supabase`);
  }
}

export async function saveTransactions(userId: string, transactions: Transaction[]): Promise<void> {
  if (!userId) {
    throw new Error("saveTransactions requires a userId");
  }
  
  if (!transactions || transactions.length === 0) {
    console.warn("saveTransactions called with empty transactions array");
    return;
  }
  
  // Ensure user exists in Supabase before saving
  await ensureUserExists(userId);
  
  const supabase = getAdminClient();
  const { error } = await (supabase.from("transactions") as any).upsert(
    transactions.map((tx) => ({
      id: tx.id,
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
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "id" }
  );

  if (error) {
    const errorInfo = {
      message: error.message || "Unknown error",
      details: error.details || null,
      hint: error.hint || null,
      code: error.code || null,
      userId,
      transactionCount: transactions.length,
      firstTransaction: transactions[0] ? {
        id: transactions[0].id,
        date: transactions[0].date,
        merchant: transactions[0].merchant,
        amount: transactions[0].amount,
      } : null,
    };
    console.error("Error saving transactions:", JSON.stringify(errorInfo, null, 2));
    throw new Error(`Failed to save transactions: ${error.message || "Unknown error"}`);
  }
}

export async function addTransactions(userId: string, newTransactions: Transaction[]): Promise<Transaction[]> {
  const existing = await loadTransactions(userId);
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
  await saveTransactions(userId, merged);
  return merged;
}

export async function updateTransaction(
  userId: string,
  id: string,
  updates: Partial<Transaction>
): Promise<Transaction[]> {
  const supabase = getAdminClient();
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Map TypeScript field names to database column names
  if (updates.postingDate !== undefined) updateData.posting_date = updates.postingDate;
  if (updates.merchant !== undefined) updateData.merchant = updates.merchant;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.currency !== undefined) updateData.currency = updates.currency;
  if (updates.balance !== undefined) updateData.balance = updates.balance;
  if (updates.accountId !== undefined) updateData.account_id = updates.accountId;
  if (updates.tag !== undefined) updateData.tag = updates.tag;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.transactionStatus !== undefined) updateData.transaction_status = updates.transactionStatus;
  if (updates.isManual !== undefined) updateData.is_manual = updates.isManual;
  if (updates.note !== undefined) updateData.note = updates.note;
  if (updates.batchId !== undefined) updateData.batch_id = updates.batchId;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.spendingType !== undefined) updateData.spending_type = updates.spendingType;
  if (updates.kind !== undefined) updateData.kind = updates.kind;
  if (updates.sourceDocType !== undefined) updateData.source_doc_type = updates.sourceDocType;
  if (updates.sourceFileName !== undefined) updateData.source_file_name = updates.sourceFileName;
  if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring;
  if (updates.recurringFrequency !== undefined) updateData.recurring_frequency = updates.recurringFrequency;
  if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
  if (updates.splitPercentage !== undefined) updateData.split_percentage = updates.splitPercentage;
  if (updates.isSplit !== undefined) updateData.is_split = updates.isSplit;
  if (updates.suggestedTag !== undefined) updateData.suggested_tag = updates.suggestedTag;
  if (updates.suggestedCategory !== undefined) updateData.suggested_category = updates.suggestedCategory;
  if (updates.tagConfidence !== undefined) updateData.tag_confidence = updates.tagConfidence;
  if (updates.tagReason !== undefined) updateData.tag_reason = updates.tagReason;
  if (updates.isAutoTagged !== undefined) updateData.is_auto_tagged = updates.isAutoTagged;
  if (updates.isAutoCategorized !== undefined) updateData.is_auto_categorized = updates.isAutoCategorized;

  const { error } = await (supabase.from("transactions") as any)
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating transaction:", error);
    throw error;
  }

  return loadTransactions(userId);
}

export async function deleteTransaction(userId: string, id: string): Promise<Transaction[]> {
  const supabase = getAdminClient();
  // Also delete any children if this is a parent
  const { error: deleteChildrenError } = await (supabase.from("transactions") as any)
    .delete()
    .eq("parent_id", id)
    .eq("user_id", userId);

  if (deleteChildrenError) {
    console.error("Error deleting child transactions:", deleteChildrenError);
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }

  return loadTransactions(userId);
}

export async function clearAllTransactions(userId: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Error clearing transactions:", error);
    throw error;
  }
}

// Rules
export async function loadRules(userId: string): Promise<Rule[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading rules:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    conditions: row.conditions as Rule["conditions"],
    action: row.action as Rule["action"],
  }));
}

export async function saveRules(userId: string, rules: Rule[]): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("rules") as any).upsert(
    rules.map((rule) => ({
      id: rule.id,
      user_id: userId,
      name: rule.name,
      conditions: rule.conditions,
      action: rule.action,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error saving rules:", error);
    throw error;
  }
}

// Goals
export async function loadGoals(userId: string): Promise<Goal[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading goals:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    targetDate: row.target_date,
    category: row.category as Goal["category"],
    priority: row.priority as Goal["priority"],
      // notes: row.notes, // Goal interface doesn't have notes property
    createdAt: row.created_at,
  }));
}

export async function saveGoals(userId: string, goals: Goal[]): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("goals") as any).upsert(
    goals.map((goal) => ({
      id: goal.id,
      user_id: userId,
      name: goal.name,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      target_date: goal.targetDate,
      category: goal.category,
      priority: goal.priority,
      notes: null, // Goal interface doesn't have notes property
      created_at: goal.createdAt,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error saving goals:", error);
    throw error;
  }
}

// Buckets
export async function loadBuckets(userId: string): Promise<Bucket[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("buckets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading buckets:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    targetPercentage: row.target_percentage,
    color: row.color,
    linkedCategories: row.linked_categories as Bucket["linkedCategories"],
    createdAt: row.created_at,
  }));
}

export async function saveBuckets(userId: string, buckets: Bucket[]): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("buckets") as any).upsert(
    buckets.map((bucket) => ({
      id: bucket.id,
      user_id: userId,
      name: bucket.name,
      target_percentage: bucket.targetPercentage,
      color: bucket.color,
      linked_categories: bucket.linkedCategories,
      created_at: bucket.createdAt,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error saving buckets:", error);
    throw error;
  }
}

// Claim Batches
export async function loadBatches(userId: string): Promise<ClaimBatch[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("claim_batches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading batches:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    status: row.status as ClaimBatch["status"],
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    paidAt: row.paid_at,
  }));
}

export async function saveBatches(userId: string, batches: ClaimBatch[]): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("claim_batches") as any).upsert(
    batches.map((batch) => ({
      id: batch.id,
      user_id: userId,
      name: batch.name,
      status: batch.status,
      created_at: batch.createdAt,
      submitted_at: batch.submittedAt,
      paid_at: batch.paidAt,
    })),
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error saving batches:", error);
    throw error;
  }
}

// Merchant Aliases
export async function loadAliases(userId: string): Promise<MerchantAlias[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("merchant_aliases")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading aliases:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    variants: [row.alias], // Store alias as a variant
    normalizedName: row.canonical_name,
  }));
}

export async function saveAliases(userId: string, aliases: MerchantAlias[]): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("merchant_aliases") as any).upsert(
    aliases.map((alias) => ({
      id: alias.id,
      user_id: userId,
      alias: alias.normalizedName, // Use normalizedName as the alias
      canonical_name: alias.normalizedName,
      created_at: new Date().toISOString(), // MerchantAlias doesn't have createdAt
    })),
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error saving aliases:", error);
    throw error;
  }
}

// Category Rules
export async function loadCategoryRules(userId: string): Promise<CategoryRule[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("category_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading category rules:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: `Category Rule for ${row.category}`,
    category: row.category as CategoryRule["category"],
    conditions: row.conditions as CategoryRule["conditions"],
    priority: 5, // Default priority (number)
    isUserDefined: true, // Default to user-defined
    createdAt: row.created_at || new Date().toISOString(),
  }));
}

export async function saveCategoryRules(userId: string, rules: CategoryRule[]): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("category_rules") as any).upsert(
    rules.map((rule) => ({
      id: rule.id,
      user_id: userId,
      category: rule.category,
      conditions: rule.conditions,
      created_at: rule.createdAt,
    })),
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error saving category rules:", error);
    throw error;
  }
}

// Recurring Transactions
export async function loadRecurring(userId: string): Promise<RecurringTransaction[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading recurring:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    merchantPattern: row.merchant,
    normalizedMerchant: row.merchant,
    category: row.category as RecurringTransaction["category"],
    averageAmount: row.amount,
    frequency: row.frequency as RecurringTransaction["frequency"],
    lastOccurrence: row.last_occurrence,
    nextExpected: row.last_occurrence, // Calculate from lastOccurrence + frequency
    occurrences: 1, // Default
    transactionIds: [], // Default
    isActive: true, // Default
    isUserConfirmed: false, // Default
  }));
}

export async function saveRecurring(userId: string, recurring: RecurringTransaction[]): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("recurring_transactions") as any).upsert(
    recurring.map((rec) => ({
      id: rec.id,
      user_id: userId,
      merchant: rec.normalizedMerchant,
      amount: rec.averageAmount,
      frequency: rec.frequency,
      last_occurrence: rec.lastOccurrence,
      category: rec.category,
      tag: null, // RecurringTransaction doesn't have tag
      created_at: new Date().toISOString(), // RecurringTransaction doesn't have createdAt
    })),
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error saving recurring:", error);
    throw error;
  }
}

// Income Config
export async function loadIncomeConfig(userId: string): Promise<IncomeConfig | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("income_config")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No row found
      return null;
    }
    console.error("Error loading income config:", error);
    return null;
  }

  if (!data) return null;

  const row = data as any;
  return {
    monthlyIncome: row.monthly_income,
    currency: row.currency,
    lastUpdated: row.updated_at || new Date().toISOString(),
  };
}

export async function saveIncomeConfig(userId: string, config: IncomeConfig): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("income_config") as any).upsert(
    {
      user_id: userId,
      monthly_income: config.monthlyIncome,
      currency: config.currency,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Error saving income config:", error);
    throw error;
  }
}

// User Profile
export async function loadProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error loading profile:", error);
    return null;
  }

  if (!data) return null;

  const row = data as any;
  return {
    nickname: row.nickname || undefined,
    currency: row.currency,
    onboardingCompleted: false, // Default
    createdAt: row.updated_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function saveProfile(userId: string, profile: UserProfile): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("user_profiles") as any).upsert(
    {
      user_id: userId,
      nickname: profile.nickname,
      currency: profile.currency,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Error saving profile:", error);
    throw error;
  }
}

// Card Safety
export async function loadCardSafety(userId: string): Promise<CardSafetyData | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("card_safety")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error loading card safety:", error);
    return null;
  }

  if (!data) return null;

  const row = data as any;
  return {
    statementBalance: row.statement_balance,
    dueDate: row.due_date,
    paymentsMade: row.payments_made,
    minimumDue: row.minimum_due,
    statementDate: row.statement_date,
    safetyBuffer: row.safety_buffer,
  };
}

export async function saveCardSafety(userId: string, data: CardSafetyData): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("card_safety") as any).upsert(
    {
      user_id: userId,
      statement_balance: data.statementBalance,
      due_date: data.dueDate,
      payments_made: data.paymentsMade,
      minimum_due: data.minimumDue,
      statement_date: data.statementDate,
      safety_buffer: data.safetyBuffer,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Error saving card safety:", error);
    throw error;
  }
}

// Accounts
export async function loadAccounts(userId: string): Promise<Account[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading accounts:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    type: row.type as Account["type"],
    group: "personal" as Account["group"], // Default to personal group
    currency: row.currency,
    initialBalance: row.balance || 0,
    currentBalance: row.balance || 0,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function saveAccounts(userId: string, accounts: Account[]): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("accounts") as any).upsert(
    accounts.map((account) => ({
      id: account.id,
      user_id: userId,
      name: account.name,
      type: account.type,
      balance: account.currentBalance || account.initialBalance || 0,
      currency: account.currency,
      is_active: account.isActive,
      created_at: account.createdAt,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error saving accounts:", error);
    throw error;
  }
}

// Budgets
export async function loadBudgets(userId: string): Promise<Budget[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading budgets:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    category: row.category as Budget["category"],
    monthlyAmount: row.amount, // Budget uses monthlyAmount
    currency: "AED", // Default currency
    rolloverEnabled: false, // Default
    isActive: true, // Default
    createdAt: row.created_at,
  }));
}

export async function saveBudgets(userId: string, budgets: Budget[]): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("budgets") as any).upsert(
    budgets.map((budget) => ({
      id: budget.id,
      user_id: userId,
      name: budget.category, // Budget doesn't have name, use category
      amount: budget.monthlyAmount, // Budget uses monthlyAmount
      period: "monthly" as const, // Budget is always monthly
      category: budget.category,
      created_at: budget.createdAt,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error saving budgets:", error);
    throw error;
  }
}

// Wrap Snapshots
export async function loadWrapSnapshots(userId: string): Promise<WrapSnapshot[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("wrap_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading wrap snapshots:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    monthKey: row.month_key,
    wrapData: row.wrap_data as WrapSnapshot["wrapData"],
    createdAt: row.created_at,
    watchedAt: row.watched_at,
    version: row.version,
    type: "monthly" as const,
    period: (() => {
      const [year, month] = row.month_key.split("-");
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    })(),
    title: `Monthly Wrap - ${row.month_key}`, // Generate title from monthKey
  }));
}

export async function saveWrapSnapshot(userId: string, wrap: WrapSnapshot): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("wrap_snapshots") as any).upsert(
    {
      id: wrap.id,
      user_id: userId,
      month_key: wrap.monthKey,
      wrap_data: wrap.wrapData,
      created_at: wrap.createdAt,
      watched_at: wrap.watchedAt,
      version: wrap.version,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error saving wrap snapshot:", error);
    throw error;
  }
}

export async function getMonthlyWrap(userId: string, monthKey: string): Promise<WrapSnapshot | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("wrap_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error loading monthly wrap:", error);
    return null;
  }

  if (!data) return null;

  const row = data as any;
  return {
    id: row.id,
    monthKey: row.month_key,
    wrapData: row.wrap_data as WrapSnapshot["wrapData"],
    createdAt: row.created_at,
    watchedAt: row.watched_at,
    version: row.version,
    type: "monthly" as const,
    period: (() => {
      const [year, month] = row.month_key.split("-");
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    })(),
    title: `Monthly Wrap - ${row.month_key}`, // Generate title from monthKey
  };
}

export async function updateWrapWatchedAt(userId: string, id: string, watchedAt: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await (supabase.from("wrap_snapshots") as any)
    .update({ watched_at: watchedAt })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating wrap watched at:", error);
    throw error;
  }
}

// Delete all data for a user
export async function deleteAllData(userId: string): Promise<void> {
  const supabase = getAdminClient();
  
  // Delete all user data in parallel
  const tables = [
    "transactions",
    "rules",
    "claim_batches",
    "merchant_aliases",
    "goals",
    "buckets",
    "category_rules",
    "recurring_transactions",
    "wrap_snapshots",
    "accounts",
    "budgets",
  ];

  await Promise.all(
    tables.map((table) =>
      (supabase.from(table) as any).delete().eq("user_id", userId)
    )
  );

  // Delete single-row tables
  await Promise.all([
    (supabase.from("income_config") as any).delete().eq("user_id", userId),
    (supabase.from("user_profiles") as any).delete().eq("user_id", userId),
    (supabase.from("card_safety") as any).delete().eq("user_id", userId),
  ]);
}

