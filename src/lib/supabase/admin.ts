// Admin Supabase client using service role key
// This bypasses RLS and should only be used server-side
// Use this for database operations when using NextAuth (not Supabase Auth)

import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient> | null = null;

export function getAdminClient() {
  if (!adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
      );
    }

    // On the client side, we can't use the service role key (it's server-only)
    // So we use the anon key, but this means RLS policies will apply
    // Since we're using NextAuth, we need to handle this differently
    if (typeof window !== "undefined") {
      // Client-side: use anon key
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!anonKey) {
        throw new Error(
          "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable for client-side operations."
        );
      }
      adminClient = createClient(supabaseUrl, anonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } else {
      // Server-side: prefer service role key, fallback to anon key
      if (serviceRoleKey) {
        adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
      } else {
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!anonKey) {
          throw new Error(
            "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY for server-side operations."
          );
        }
        adminClient = createClient(supabaseUrl, anonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
      }
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

