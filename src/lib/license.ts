/**
 * License verification and caching utility
 * Handles license status checking and caching client-side
 */

import { verifyLicense as verifyLicenseAPI } from "./api";
import { get, set } from "idb-keyval";

const LICENSE_CACHE_KEY = "license_status";
const LICENSE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface LicenseStatus {
  valid: boolean;
  tier: string;
  expiresAt?: string;
  cachedAt: number;
}

/**
 * Get cached license status
 */
export async function getCachedLicense(): Promise<LicenseStatus | null> {
  try {
    const cached = await get<LicenseStatus>(LICENSE_CACHE_KEY);
    if (!cached) return null;

    // Check if cache is still valid
    const now = Date.now();
    if (now - cached.cachedAt > LICENSE_CACHE_TTL) {
      return null; // Cache expired
    }

    return cached;
  } catch (error) {
    console.error("Error reading license cache:", error);
    return null;
  }
}

/**
 * Cache license status
 */
async function cacheLicense(status: Omit<LicenseStatus, "cachedAt">): Promise<void> {
  try {
    await set(LICENSE_CACHE_KEY, {
      ...status,
      cachedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error caching license:", error);
  }
}

/**
 * Verify license key (with caching)
 */
export async function verifyLicense(licenseKey: string): Promise<LicenseStatus> {
  // Check cache first
  const cached = await getCachedLicense();
  if (cached) {
    return cached;
  }

  // Verify with backend
  try {
    const result = await verifyLicenseAPI(licenseKey);
    const status: LicenseStatus = {
      ...result,
      cachedAt: Date.now(),
    };

    // Cache the result
    await cacheLicense(result);

    return status;
  } catch (error) {
    console.error("License verification failed:", error);
    // Return invalid license on error (fail closed for security)
    return {
      valid: false,
      tier: "free",
      cachedAt: Date.now(),
    };
  }
}

/**
 * Clear license cache (e.g., on logout or license change)
 */
export async function clearLicenseCache(): Promise<void> {
  try {
    await set(LICENSE_CACHE_KEY, null);
  } catch (error) {
    console.error("Error clearing license cache:", error);
  }
}

/**
 * Check if user has premium features
 */
export async function hasPremiumAccess(): Promise<boolean> {
  const cached = await getCachedLicense();
  return cached?.valid === true && cached.tier !== "free";
}



