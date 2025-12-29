import { NextResponse } from "next/server";
import { validateToken, markTokenAsUsed } from "@/lib/auth-tokens";
import { verifyUserEmail } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Validate token
    const validation = await validateToken(token, "email-verification");
    if (!validation.valid || !validation.userId) {
      return NextResponse.json(
        { error: validation.error || "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Verify user email
    await verifyUserEmail(validation.userId);

    // Mark token as used
    await markTokenAsUsed(token);

    return NextResponse.json(
      { message: "Email verified successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}

