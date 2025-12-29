# Database Integration Guide

This directory contains the Supabase-based data access layer (DAL) that replaces IndexedDB storage.

## Architecture

The system uses a **hybrid approach**:
- **Supabase** when user is authenticated (cloud storage, multi-device sync)
- **IndexedDB** when user is not authenticated (local-only, offline-first)

## Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Run the schema from `../../supabase/schema.sql`

2. **Configure Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Integration Points**
   - The storage adapter (`../storage-adapter.ts`) automatically switches between IndexedDB and Supabase
   - Update `src/lib/context.tsx` to use the adapter with user session

## Migration Strategy

1. **Phase 1: Dual Storage** (Current)
   - Both IndexedDB and Supabase work in parallel
   - New data goes to both
   - Reads prefer Supabase if available

2. **Phase 2: Migration**
   - Use `migrations.ts` to migrate existing IndexedDB data to Supabase
   - Run migration on first login after Supabase setup

3. **Phase 3: Supabase Only**
   - Remove IndexedDB dependency
   - All data in Supabase
   - IndexedDB becomes cache only

## Usage

```typescript
import { getStorageAdapter } from "@/lib/storage-adapter";
import { useSession } from "next-auth/react";

function MyComponent() {
  const { data: session } = useSession();
  const storage = getStorageAdapter(session?.user?.id);
  
  // Use storage functions
  const transactions = await storage.loadTransactions();
}
```

## Real-time Sync

Supabase provides real-time subscriptions. Example:

```typescript
const supabase = createClient();
const channel = supabase
  .channel('transactions')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
    (payload) => {
      // Handle real-time updates
    }
  )
  .subscribe();
```

## Offline Support

1. **Sync Queue**: Store pending changes in IndexedDB
2. **Background Sync**: When online, sync queued changes to Supabase
3. **Conflict Resolution**: Last-write-wins or merge strategy

