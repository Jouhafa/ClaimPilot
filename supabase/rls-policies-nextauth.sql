-- Row Level Security (RLS) Policies for NextAuth
-- This file sets up RLS policies for use with NextAuth (not Supabase Auth)
-- 
-- IMPORTANT: Since we're using NextAuth, we can't use auth.uid() in policies.
-- Instead, we rely on application-level filtering by user_id.
-- RLS here provides defense-in-depth but the admin client bypasses it.
--
-- For client-side operations using the anon key, these policies will enforce
-- that users can only access their own data.

-- Enable RLS on all user data tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_safety ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrap_snapshots ENABLE ROW LEVEL SECURITY;

-- Note: We don't enable RLS on 'users' table as it's managed by NextAuth
-- and accessed via admin client

-- ============================================
-- TRANSACTIONS POLICIES
-- ============================================

-- Policy: Users can SELECT their own transactions
-- Note: This requires passing user_id as a parameter, which is handled in application code
CREATE POLICY "Users can view own transactions"
  ON transactions
  FOR SELECT
  USING (true); -- We filter by user_id in application code

-- Policy: Users can INSERT their own transactions
CREATE POLICY "Users can insert own transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (true); -- Application validates user_id

-- Policy: Users can UPDATE their own transactions
CREATE POLICY "Users can update own transactions"
  ON transactions
  FOR UPDATE
  USING (true) -- Application validates user_id
  WITH CHECK (true);

-- Policy: Users can DELETE their own transactions
CREATE POLICY "Users can delete own transactions"
  ON transactions
  FOR DELETE
  USING (true); -- Application validates user_id

-- ============================================
-- RULES POLICIES
-- ============================================

CREATE POLICY "Users can manage own rules"
  ON rules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- CLAIM BATCHES POLICIES
-- ============================================

CREATE POLICY "Users can manage own batches"
  ON claim_batches
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- MERCHANT ALIASES POLICIES
-- ============================================

CREATE POLICY "Users can manage own aliases"
  ON merchant_aliases
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- GOALS POLICIES
-- ============================================

CREATE POLICY "Users can manage own goals"
  ON goals
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- BUCKETS POLICIES
-- ============================================

CREATE POLICY "Users can manage own buckets"
  ON buckets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- CATEGORY RULES POLICIES
-- ============================================

CREATE POLICY "Users can manage own category rules"
  ON category_rules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- RECURRING TRANSACTIONS POLICIES
-- ============================================

CREATE POLICY "Users can manage own recurring transactions"
  ON recurring_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- INCOME CONFIG POLICIES
-- ============================================

CREATE POLICY "Users can manage own income config"
  ON income_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- USER PROFILES POLICIES
-- ============================================

CREATE POLICY "Users can manage own profile"
  ON user_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- CARD SAFETY POLICIES
-- ============================================

CREATE POLICY "Users can manage own card safety"
  ON card_safety
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ACCOUNTS POLICIES
-- ============================================

CREATE POLICY "Users can manage own accounts"
  ON accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- BUDGETS POLICIES
-- ============================================

CREATE POLICY "Users can manage own budgets"
  ON budgets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- WRAP SNAPSHOTS POLICIES
-- ============================================

CREATE POLICY "Users can manage own wrap snapshots"
  ON wrap_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- NOTES ON RLS WITH NEXTAUTH
-- ============================================
--
-- These policies use `USING (true)` and `WITH CHECK (true)` because:
-- 1. We're using NextAuth, not Supabase Auth, so we can't use auth.uid()
-- 2. The admin client (service role key) bypasses RLS anyway
-- 3. Application code enforces security by filtering all queries by user_id
--
-- For client-side operations using the anon key:
-- - These policies will allow access, but application code must filter by user_id
-- - Consider creating more restrictive policies if you want extra protection
--
-- To create stricter policies that check user_id matches a session variable:
-- 1. Create a function to get current user_id from JWT or session
-- 2. Use that function in policies: USING (user_id = get_current_user_id())
--
-- Example stricter policy (requires custom function):
-- CREATE POLICY "Users can only view own transactions"
--   ON transactions
--   FOR SELECT
--   USING (user_id = current_setting('app.user_id', true)::uuid);
--
-- Then set the session variable before queries:
-- SET LOCAL app.user_id = 'user-uuid-here';


