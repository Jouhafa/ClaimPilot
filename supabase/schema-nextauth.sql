-- ClaimPilot Database Schema for NextAuth
-- This version works with NextAuth (not Supabase Auth)
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends NextAuth users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  name TEXT,
  image TEXT,
  password_hash TEXT, -- For email/password auth
  provider TEXT, -- 'credentials', 'google', 'apple'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auth tokens for password reset and email verification
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('password-reset', 'email-verification')),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  posting_date DATE,
  merchant TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'AED',
  balance DECIMAL(12, 2),
  account_id UUID,
  tag TEXT CHECK (tag IN ('reimbursable', 'personal', 'ignore')),
  status TEXT CHECK (status IN ('draft', 'submitted', 'paid')),
  transaction_status TEXT CHECK (transaction_status IN ('pending', 'confirmed')),
  is_manual BOOLEAN DEFAULT FALSE,
  note TEXT,
  batch_id UUID,
  category TEXT,
  spending_type TEXT CHECK (spending_type IN ('fixed', 'variable', 'income', 'transfer')),
  kind TEXT CHECK (kind IN ('spend', 'income', 'transfer', 'reimbursement', 'unknown')),
  source_doc_type TEXT,
  source_file_name TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  parent_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  split_percentage DECIMAL(5, 2),
  is_split BOOLEAN DEFAULT FALSE,
  suggested_tag TEXT,
  suggested_category TEXT,
  tag_confidence TEXT CHECK (tag_confidence IN ('high', 'medium', 'low')),
  tag_reason TEXT,
  is_auto_tagged BOOLEAN DEFAULT FALSE,
  is_auto_categorized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rules for auto-tagging
CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  conditions JSONB NOT NULL,
  action JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim batches
CREATE TABLE IF NOT EXISTS claim_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Merchant aliases
CREATE TABLE IF NOT EXISTS merchant_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, alias)
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  target_date DATE,
  category TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buckets
CREATE TABLE IF NOT EXISTS buckets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_percentage DECIMAL(5, 2) NOT NULL,
  color TEXT,
  linked_categories TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Category rules
CREATE TABLE IF NOT EXISTS category_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  conditions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring transactions
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  last_occurrence DATE NOT NULL,
  category TEXT,
  tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Income configuration
CREATE TABLE IF NOT EXISTS income_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  monthly_income DECIMAL(12, 2),
  currency TEXT DEFAULT 'AED',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profile
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  nickname TEXT,
  currency TEXT DEFAULT 'AED',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Card safety data
CREATE TABLE IF NOT EXISTS card_safety (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  statement_balance DECIMAL(12, 2),
  due_date DATE,
  payments_made DECIMAL(12, 2) DEFAULT 0,
  minimum_due DECIMAL(12, 2),
  statement_date DATE,
  safety_buffer DECIMAL(12, 2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wrap snapshots
CREATE TABLE IF NOT EXISTS wrap_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  wrap_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  watched_at TIMESTAMPTZ,
  version TEXT DEFAULT '1.0',
  UNIQUE(user_id, month_key)
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'investment', 'other')),
  balance DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROI tracker
CREATE TABLE IF NOT EXISTS roi_tracker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense coverage config
CREATE TABLE IF NOT EXISTS expense_coverage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config JSONB,
  items JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import profiles
CREATE TABLE IF NOT EXISTS import_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_name TEXT,
  statement_type TEXT,
  column_mapping JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_batch_id ON transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_buckets_user_id ON buckets(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_wrap_snapshots_user_month ON wrap_snapshots(user_id, month_key);

-- IMPORTANT: For NextAuth, we'll use the service role key for server-side operations
-- This bypasses RLS. Security is handled in the application layer by filtering by user_id.
-- RLS is disabled for now since we're using NextAuth (not Supabase Auth).

-- If you want to enable RLS later, you can create policies that check user_id directly,
-- but you'll need to pass the user_id in the request context somehow.

-- For now, we'll rely on application-level security (all queries filter by user_id).

