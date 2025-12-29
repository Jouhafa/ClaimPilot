# Supabase Database Setup

This directory contains the database schema and migration scripts for ClaimPilot.

## Setup Instructions

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Run the Schema**
   - Open the Supabase SQL Editor
   - Copy and paste the contents of `schema.sql`
   - Execute the script to create all tables, indexes, and RLS policies

3. **Configure Environment Variables**
   - Add to your `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     ```

4. **Verify Setup**
   - Check that all tables are created in the Supabase dashboard
   - Verify RLS policies are enabled
   - Test a simple query to ensure connection works

## Schema Overview

The database includes tables for:
- **users** - User accounts (extends NextAuth)
- **transactions** - All financial transactions
- **rules** - Auto-tagging rules
- **goals** - Financial goals
- **buckets** - Budget buckets
- **claim_batches** - Reimbursement batches
- **merchant_aliases** - Merchant name normalization
- **accounts** - User accounts (checking, savings, etc.)
- **budgets** - Budget configurations
- And more...

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure users can only access their own data. The policies use `auth.uid()` to match the user ID.

## Migration

Use the migration utilities in `src/lib/db/migrations.ts` to migrate data from IndexedDB to Supabase.

