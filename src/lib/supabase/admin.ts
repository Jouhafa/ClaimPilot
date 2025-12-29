// Admin Supabase client using service role key
// This bypasses RLS and should only be used server-side
// Use this for database operations when using NextAuth (not Supabase Auth)

import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient> | null = null;

export function getAdminClient() {
  if (!adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      // Fallback to anon key if service role key not set (for development)
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) {
        throw new Error(
          "Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in your environment variables."
        );
      }
      adminClient = createClient(supabaseUrl, anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } else {
      adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  return adminClient;
}

// Helper to get typed table access (using 'as any' for now until we generate types)
export function getTable<T = any>(tableName: string) {
  return getAdminClient().from(tableName) as any as {
    select: (columns?: string) => any;
    insert: (values: T | T[]) => any;
    upsert: (values: T | T[], options?: { onConflict?: string }) => any;
    update: (values: Partial<T>) => any;
    delete: () => any;
  };
}

