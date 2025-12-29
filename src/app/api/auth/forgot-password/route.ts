import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/auth";
import { createToken } from "@/lib/auth-tokens";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await getUserByEmail(email);

    // Always return success to prevent email enumeration
    // In production, you might want to add rate limiting here
    if (!user) {
      return NextResponse.json(
        { message: "If an account exists with this email, a password reset link has been sent." },
        { status: 200 }
      );
    }

    // Create password reset token
    const token = await createToken(user.id, "password-reset", 24); // 24 hours

    // Send password reset email
    await sendPasswordResetEmail(user.email, token);

    return NextResponse.json(
      { message: "If an account exists with this email, a password reset link has been sent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

