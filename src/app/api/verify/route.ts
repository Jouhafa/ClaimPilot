import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { licenseKey } = await request.json();

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, error: "Please enter a license key" },
        { status: 400 }
      );
    }

    const productId = process.env.GUMROAD_PRODUCT_ID;
    
    if (!productId) {
      console.error("GUMROAD_PRODUCT_ID environment variable not set");
      return NextResponse.json(
        { valid: false, error: "Payment system not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Call Gumroad's license verification API
    const response = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        product_id: productId,
        license_key: licenseKey.trim(),
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
      // Provide helpful error messages
      let errorMessage = "Invalid license key";
      if (data.message?.includes("not found")) {
        errorMessage = "License key not found. Please check and try again.";
      } else if (data.message?.includes("refunded")) {
        errorMessage = "This license has been refunded and is no longer valid.";
      } else if (data.message?.includes("chargebacked")) {
        errorMessage = "This license has been disputed and is no longer valid.";
      } else if (data.message) {
        errorMessage = data.message;
      }
      
      return NextResponse.json({
        valid: false,
        error: errorMessage,
      });
    }
  } catch (error) {
    console.error("License verification error:", error);
    return NextResponse.json(
      { valid: false, error: "Unable to verify license. Please check your internet connection and try again." },
      { status: 500 }
    );
  }
}
