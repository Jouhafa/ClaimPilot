import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * API route to ensure a user exists in Supabase
 * This is called from client-side when ensureUserExists fails
 * It runs server-side with service role key, so it can bypass RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Get the current session using NextAuth v5
    const { auth } = NextAuth(authOptions);
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const email = session.user.email || `${userId}@temp.local`;
    const name = session.user.name || undefined;
    const image = session.user.image || undefined;

    const adminClient = getAdminClient();
    
    // Check if user exists
    const { data: existingUser, error: checkError } = await (adminClient.from("users") as any)
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    
    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking user existence:", checkError);
      return NextResponse.json(
        { error: "Failed to check user existence", details: checkError.message },
        { status: 500 }
      );
    }
    
    // If user doesn't exist, create them
    if (!existingUser) {
      const { error: createError } = await (adminClient.from("users") as any).insert({
        id: userId,
        email: email,
        name: name,
        image: image,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      if (createError) {
        console.error("Error creating user in Supabase:", createError);
        return NextResponse.json(
          { error: "Failed to create user", details: createError.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: "User created successfully",
        userId: userId,
      });
    }
    
    // User already exists
    return NextResponse.json({
      success: true,
      message: "User already exists",
      userId: userId,
    });
  } catch (error) {
    console.error("Error in ensure user API route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

