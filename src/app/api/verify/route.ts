import { NextRequest, NextResponse } from "next/server";

// Gumroad product ID - replace with your actual product ID
const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID || "your-product-id";

export async function POST(request: NextRequest) {
  try {
    const { licenseKey } = await request.json();

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, error: "License key is required" },
        { status: 400 }
      );
    }

    // Call Gumroad's license verification API
    const response = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        product_id: GUMROAD_PRODUCT_ID,
        license_key: licenseKey,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({
        valid: true,
        purchase: {
          email: data.purchase?.email,
          createdAt: data.purchase?.created_at,
          productName: data.purchase?.product_name,
        },
      });
    } else {
      return NextResponse.json({
        valid: false,
        error: data.message || "Invalid license key",
      });
    }
  } catch (error) {
    console.error("License verification error:", error);
    return NextResponse.json(
      { valid: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}

