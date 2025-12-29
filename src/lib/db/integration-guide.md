# Database Integration Guide

## Current Status

✅ **Completed:**
- Supabase client setup (client & server)
- Complete database schema
- Supabase storage layer (DAL) for all data types
- Migration utilities
- Storage adapter pattern

⏳ **Next Steps:**

### 1. Update App Context to Use Supabase

The `AppContext` needs to be updated to:
- Get user ID from NextAuth session
- Use storage adapter to switch between IndexedDB and Supabase
- Handle authentication state changes

**File to update:** `src/lib/context.tsx`

```typescript
import { useSession } from "next-auth/react";
import { getStorageAdapter } from "./storage-adapter";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const storage = getStorageAdapter(userId);
  
  // Replace all storage calls with storage.*
  const refreshData = useCallback(async () => {
    const [transactions, rules, ...] = await Promise.all([
      storage.loadTransactions(),
      storage.loadRules(),
      // ...
    ]);
  }, [storage]);
}
```

### 2. Migrate Auth to Supabase

Update `src/lib/auth.ts` to use Supabase users table instead of in-memory store.

### 3. Add Real-time Sync

Implement Supabase real-time subscriptions for live updates across devices.

### 4. Implement Offline Queue

Create sync queue system for offline changes.

## Testing

1. Test with authenticated user (Supabase)
2. Test with unauthenticated user (IndexedDB fallback)
3. Test migration from IndexedDB to Supabase
4. Test real-time sync between devices

