import type { LicenseVerificationRequest, LicenseVerificationResponse } from "../types.js";

/**
 * Verify Gumroad license key
 * This is a placeholder implementation - replace with actual Gumroad API integration
 */
export async function verifyLicense(
  request: LicenseVerificationRequest
): Promise<LicenseVerificationResponse> {
  const { licenseKey } = request;

  if (!licenseKey || licenseKey.trim().length === 0) {
    return {
      valid: false,
      tier: "free",
    };
  }

  // TODO: Replace with actual Gumroad API call
  // Example Gumroad API endpoint: https://api.gumroad.com/v2/licenses/verify
  // You'll need GUMROAD_API_KEY environment variable
  
  const gumroadApiKey = process.env.GUMROAD_API_KEY;
  
  if (!gumroadApiKey) {
    console.warn("GUMROAD_API_KEY not configured, using mock verification");
    // Mock verification for development
    return {
      valid: licenseKey.length > 10, // Simple mock check
      tier: licenseKey.length > 20 ? "premium" : "standard",
    };
  }

  try {
    const response = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_permalink: process.env.GUMROAD_PRODUCT_PERMALINK || "claimpilot",
        license_key: licenseKey,
      }),
    });

    if (!response.ok) {
      return {
        valid: false,
        tier: "free",
      };
    }

    const data = await response.json();
    
    if (data.success) {
      return {
        valid: true,
        tier: data.purchase?.tier || "standard",
        expiresAt: data.purchase?.expires_at,
      };
    }

    return {
      valid: false,
      tier: "free",
    };
  } catch (error) {
    console.error("Gumroad API error:", error);
    // Fail open - allow access if API is down
    return {
      valid: false,
      tier: "free",
    };
  }
}


