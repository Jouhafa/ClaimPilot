/**
 * Cache for AI Deep Dive responses
 * Caches per {monthKey, layerKey, topicKey, payloadHash, modelTier}
 * Uses IndexedDB for persistence across page refreshes
 */

import { get, set, del, keys } from "idb-keyval";

type CacheKey = string;

interface CacheEntry {
  data: any;
  timestamp: number;
}

// In-memory cache for quick access (backed by IndexedDB)
const memoryCache = new Map<CacheKey, CacheEntry>();

// Cache TTL: 7 days
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CACHE_PREFIX = "claimpilot_ai_deep_dive_";

/**
 * Load cache from IndexedDB on initialization (optional - for warmup)
 * This is called lazily - cache is loaded on-demand when getCachedDeepDive is called
 */
let cacheInitialized = false;

async function initializeCacheIfNeeded(): Promise<void> {
  if (cacheInitialized || typeof window === "undefined") return;
  
  try {
    cacheInitialized = true;
    // Only preload a limited set to avoid blocking
    // Most cache access happens on-demand anyway
  } catch (e) {
    // Ignore initialization errors - cache will work on-demand
  }
}

/**
 * Generate cache key from parameters
 */
export function getCacheKey(params: {
  monthKey: string;
  layer: "home" | "story" | "analyst";
  topicKey: string;
  payloadHash: string;
  modelTier?: "default" | "premium";
}): CacheKey {
  const tier = params.modelTier || "default";
  return `${params.monthKey}:${params.layer}:${params.topicKey}:${params.payloadHash}:${tier}`;
}

/**
 * Get cached deep dive data
 * Checks in-memory cache first, then IndexedDB
 * Results persist across page refreshes via IndexedDB
 */
export async function getCachedDeepDive(cacheKey: CacheKey): Promise<any | null> {
  // Check in-memory cache first (fast path)
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry) {
    const age = Date.now() - memoryEntry.timestamp;
    if (age <= CACHE_TTL_MS) {
      return memoryEntry.data;
    } else {
      // Expired, remove from memory and IndexedDB
      memoryCache.delete(cacheKey);
      try {
        if (typeof window !== "undefined") {
          await del(`${CACHE_PREFIX}${cacheKey}`);
        }
      } catch (e) {
        // Ignore errors
      }
      return null;
    }
  }

  // Check IndexedDB (persistent storage)
  if (typeof window === "undefined") {
    return null; // SSR - no IndexedDB
  }

  try {
    const storedEntry = await get<CacheEntry>(`${CACHE_PREFIX}${cacheKey}`);
    if (storedEntry) {
      const age = Date.now() - storedEntry.timestamp;
      if (age <= CACHE_TTL_MS) {
        // Valid entry, add to memory cache for faster future access
        memoryCache.set(cacheKey, storedEntry);
        return storedEntry.data;
      } else {
        // Expired, remove from IndexedDB
        await del(`${CACHE_PREFIX}${cacheKey}`);
        return null;
      }
    }
  } catch (e) {
    // IndexedDB might not be available - continue without cache
    console.warn(`Failed to get cache entry from IndexedDB:`, e);
  }

  return null;
}

/**
 * Cache deep dive data
 * Stores in both memory cache and IndexedDB for persistence across page refreshes
 */
export async function setCachedDeepDive(cacheKey: CacheKey, data: any): Promise<void> {
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
  };

  // Store in memory cache (fast access)
  memoryCache.set(cacheKey, entry);

  // Store in IndexedDB for persistence (survives page refresh)
  if (typeof window === "undefined") {
    return; // SSR - skip IndexedDB
  }

  try {
    await set(`${CACHE_PREFIX}${cacheKey}`, entry);
  } catch (e) {
    console.warn(`Failed to store cache entry in IndexedDB:`, e);
    // Continue even if IndexedDB storage fails - memory cache still works
  }
}

/**
 * Clear cache for a specific month
 */
export async function clearCacheForMonth(monthKey: string): Promise<void> {
  const keysToDelete: CacheKey[] = [];
  memoryCache.forEach((_, key) => {
    if (key.startsWith(`${monthKey}:`)) {
      keysToDelete.push(key);
    }
  });
  
  // Remove from memory cache
  keysToDelete.forEach((key) => memoryCache.delete(key));

  // Remove from IndexedDB
  try {
    const allKeys = await keys();
    const cacheKeys = allKeys.filter((key) => 
      typeof key === "string" && key.startsWith(CACHE_PREFIX) && key.includes(`${monthKey}:`)
    ) as string[];

    for (const key of cacheKeys) {
      await del(key);
    }
  } catch (e) {
    console.warn("Failed to clear cache from IndexedDB:", e);
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  // Clear memory cache
  memoryCache.clear();

  // Clear IndexedDB
  try {
    const allKeys = await keys();
    const cacheKeys = allKeys.filter((key) => 
      typeof key === "string" && key.startsWith(CACHE_PREFIX)
    ) as string[];

    for (const key of cacheKeys) {
      await del(key);
    }
  } catch (e) {
    console.warn("Failed to clear all cache from IndexedDB:", e);
  }
}

/**
 * Generate hash from payload object using SHA-256
 * Includes monthKey, viewKey, topicKey, payload, and modelTier in the hash
 */
export function hashPayload(params: {
  monthKey: string;
  viewKey?: string; // optional view identifier
  topicKey: string;
  payload: any;
  modelTier?: "default" | "premium";
}): string {
  // Use a simple hash function for client-side (not cryptographically secure, just for caching)
  // In a production environment, you might want to use crypto.subtle.digest or a library
  const str = JSON.stringify({
    monthKey: params.monthKey,
    viewKey: params.viewKey,
    topicKey: params.topicKey,
    payload: params.payload,
    modelTier: params.modelTier || "default",
  });
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Legacy hashPayload function for backward compatibility
 * @deprecated Use the new hashPayload with object parameter
 */
export function hashPayloadLegacy(payload: any): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
