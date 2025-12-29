import { NextResponse } from "next/server";
import { validateToken, markTokenAsUsed } from "@/lib/auth-tokens";
import { updateUserPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate token
    const validation = await validateToken(token, "password-reset");
    if (!validation.valid || !validation.userId) {
      return NextResponse.json(
        { error: validation.error || "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Update password
    await updateUserPassword(validation.userId, password);

    // Mark token as used
    await markTokenAsUsed(token);

    return NextResponse.json(
      { message: "Password has been reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}

