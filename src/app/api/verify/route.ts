import { NextRequest, NextResponse } from "next/server";
import type { LicenseTier } from "@/lib/types";

// Determine tier from product name or variant
function determineTier(purchase: {
  product_name?: string;
  variants?: string[];
  price?: number;
}): LicenseTier {
  const productName = (purchase.product_name || "").toLowerCase();
  const variants = purchase.variants || [];
  const price = purchase.price || 0;
  
  // Check for premium keywords
  if (
    productName.includes("premium") ||
    variants.some(v => v.toLowerCase().includes("premium")) ||
    price >= 9900 // $99+ in cents
  ) {
    return "premium";
  }
  
  // Check for paid tier
  if (
    productName.includes("lifetime") ||
    productName.includes("pro") ||
    variants.some(v => v.toLowerCase().includes("pro")) ||
    price >= 4900 // $49+ in cents
  ) {
    return "paid";
  }
  
  // Default to paid for any valid license
  return "paid";
}

export async function POST(request: NextRequest) {
  try {
    const { licenseKey } = await request.json();

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, error: "Please enter a license key" },
        { status: 400 }
      );
    }

    // Support multiple product IDs for different tiers
    const productIds = [
      process.env.GUMROAD_PRODUCT_ID,
      process.env.GUMROAD_PREMIUM_PRODUCT_ID,
    ].filter(Boolean);
    
    if (productIds.length === 0) {
      console.error("No GUMROAD_PRODUCT_ID environment variables set");
      return NextResponse.json(
        { valid: false, error: "Payment system not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Try each product ID until we find a match
    for (const productId of productIds) {
      const response = await fetch("https://api.gumroad.com/v2/licenses/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          product_id: productId!,
          license_key: licenseKey.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const tier = determineTier({
          product_name: data.purchase?.product_name,
          variants: data.purchase?.variants,
          price: data.purchase?.price,
        });
        
        return NextResponse.json({
          valid: true,
          tier,
          purchase: {
            email: data.purchase?.email,
            createdAt: data.purchase?.created_at,
            productName: data.purchase?.product_name,
          },
        });
      }
    }

    // If we get here, no product matched
    return NextResponse.json({
      valid: false,
      error: "License key not found. Please check and try again.",
    });
  } catch (error) {
    console.error("License verification error:", error);
    return NextResponse.json(
      { valid: false, error: "Unable to verify license. Please check your internet connection and try again." },
      { status: 500 }
    );
  }
}
