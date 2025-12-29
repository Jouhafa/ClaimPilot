import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { createToken } from "./auth-tokens";
import { sendVerificationEmail } from "./email";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

// User record interface matching Supabase schema
interface UserRecord {
  id: string;
  email: string;
  password_hash?: string; // Hashed password
  name?: string;
  email_verified?: Date;
  image?: string;
  provider?: string; // 'credentials' | 'google' | 'apple'
  created_at: Date;
  updated_at: Date;
}

// Helper to get Supabase client (server-side)
async function getSupabase() {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  return await createClient();
}

// Fallback in-memory store for development when Supabase is not configured
const users: Map<string, UserRecord> = new Map();

export const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const supabase = await getSupabase();
        
        if (supabase) {
          // Use Supabase
          const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", credentials.email)
            .single();

          if (error) {
            console.error("Supabase user lookup error:", error);
            // Fall through to in-memory fallback
          } else if (user && user.password_hash) {
            // Type assertion for Supabase query result
            const hash: string = String(user.password_hash);
            if (hash.length > 0) {
              // Verify password - explicit type assertion
              const password = String(credentials.password);
              const isValid = await bcrypt.compare(password, hash);
              if (isValid) {
                return {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  image: user.image,
                };
              }
            }
          }
        }
        
        // Fallback to in-memory store (or if Supabase lookup failed)
        {
          // Fallback to in-memory store
          const user = Array.from(users.values()).find(
            (u) => u.email === credentials.email
          );

          if (!user || !user.password_hash) {
            console.error("User not found in memory store:", credentials.email, "Available users:", Array.from(users.keys()));
            return null;
          }

          // Type assertion for in-memory store  
          const hash: string = String(user.password_hash);
          const password = String(credentials.password);
          const isValid = await bcrypt.compare(password, hash);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.APPLE_ID && process.env.APPLE_SECRET
      ? [
          AppleProvider({
            clientId: process.env.APPLE_ID,
            clientSecret: process.env.APPLE_SECRET,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/auth/new-user",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Ensure user exists in Supabase for all sign-in methods
      try {
        const adminClient = getAdminClient();
        const userId = user.id || crypto.randomUUID();
        
        // Check if user exists by ID first
        const { data: existingUserById } = await (adminClient.from("users") as any)
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        
        // Also check by email (in case ID doesn't match)
        const { data: existingUserByEmail } = user.email ? await (adminClient.from("users") as any)
          .select("*")
          .eq("email", user.email)
          .maybeSingle() : { data: null };

        const existingUser = existingUserById || existingUserByEmail;

        if (!existingUser) {
          // Create new user
          const { error } = await (adminClient.from("users") as any).insert({
            id: userId,
            email: user.email || `${userId}@temp.local`,
            name: user.name || undefined,
            image: user.image || undefined,
            provider: account?.provider || "credentials",
            email_verified: account?.provider === "google" || account?.provider === "apple" 
              ? new Date().toISOString() 
              : undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (error) {
            console.error("Error creating user in Supabase during sign-in:", error);
            // If this is an RLS error, it means we're not using the service role key
            if (error.message?.includes("row-level security") || error.code === "42501") {
              console.error(
                "CRITICAL: User creation failed due to RLS. " +
                "This means getAdminClient() is not using the service role key. " +
                "Check that SUPABASE_SERVICE_ROLE_KEY is set and getAdminClient() is running server-side."
              );
            }
            // Don't block sign-in, but log the error
            // The user will need to be created manually or via API route
          } else {
            console.log(`✅ Created user ${userId} in Supabase during sign-in`);
          }
        } else {
          // User exists - use their existing ID
          // This is critical: if user exists by email with different ID, we need to use the existing ID
          // so that all their data (transactions, etc.) is accessible
          if (existingUserByEmail && existingUserByEmail.id !== userId) {
            console.log(
              `User exists with different ID. Session ID: ${userId}, DB ID: ${existingUserByEmail.id}. ` +
              `Using DB ID to access existing data.`
            );
            // Store the correct ID to be used in JWT callback
            // We'll handle this in the JWT callback by looking up the user
          }
          
          // Update user if needed (e.g., update image, name, or ensure ID matches)
          const updates: any = {
            updated_at: new Date().toISOString(),
          };
          
          if (user.name && !existingUser.name) updates.name = user.name;
          if (user.image && !existingUser.image) updates.image = user.image;
          if (account?.provider && !existingUser.provider) updates.provider = account.provider;
          
          if (Object.keys(updates).length > 1) {
            await (adminClient.from("users") as any)
              .update(updates)
              .eq("id", existingUser.id);
          }
        }
      } catch (error) {
        console.error("Error ensuring user exists in Supabase:", error);
        // Don't block sign-in, but log the error
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in - look up user in database to get correct ID
      if (user) {
        try {
          const adminClient = getAdminClient();
          if (user.email) {
            // Always look up user by email to get the correct ID from database
            // This ensures we use the same ID as the data in the database
            const { data: existingUser } = await (adminClient.from("users") as any)
              .select("id")
              .eq("email", user.email)
              .maybeSingle();
            
            if (existingUser) {
              // Use the existing user's ID from database
              // This is critical: if user signed in before, their data is stored with this ID
              token.id = existingUser.id;
              console.log(`✅ Using existing user ID from database: ${existingUser.id} for email: ${user.email}`);
            } else {
              // New user, use the ID from NextAuth
              token.id = user.id;
              console.log(`✅ New user, using NextAuth ID: ${user.id} for email: ${user.email}`);
            }
          } else {
            // No email, use NextAuth ID
            token.id = user.id;
          }
        } catch (error) {
          console.error("Error looking up user in JWT callback:", error);
          // Fallback to NextAuth user ID
          token.id = user.id;
        }
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-change-in-production",
};

// Helper functions for user management
export async function createUser(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<UserRecord> {
  const supabase = await getSupabase();
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  if (supabase) {
    // Use Supabase
    // Check if user already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", data.email)
      .single();

    if (existing) {
      throw new Error("User already exists");
    }

    // Create user
    const { data: user, error } = await supabase
      .from("users")
      .insert({
        id: userId,
        email: data.email,
        password_hash: hashedPassword,
        name: data.name,
        provider: "credentials",
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      // Check if error is due to duplicate email (unique constraint violation)
      // Supabase error codes: 23505 = unique_violation, PGRST116 = not found (but can also mean duplicate)
      if (
        error.code === "23505" ||
        error.message?.includes("duplicate key") ||
        error.message?.includes("unique constraint") ||
        error.message?.includes("already exists")
      ) {
        throw new Error("User already exists");
      }
      // Check if RLS error might be due to existing user
      if (
        error.message?.includes("row-level security") ||
        error.message?.includes("violates row-level security policy")
      ) {
        // Double-check if user exists (RLS might be blocking the insert)
        const { data: checkExisting } = await supabase
          .from("users")
          .select("id")
          .eq("email", data.email)
          .maybeSingle();
        
        if (checkExisting) {
          throw new Error("User already exists");
        }
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }

    // Send verification email
    try {
      const token = await createToken(userId, "email-verification", 24);
      await sendVerificationEmail(data.email, token);
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }

    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      name: user.name,
      email_verified: user.email_verified ? new Date(user.email_verified) : undefined,
      image: user.image,
      provider: user.provider,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
    };
  } else {
    // Fallback to in-memory store
    const existing = Array.from(users.values()).find((u) => u.email === data.email);
    if (existing) {
      throw new Error("User already exists");
    }

    const user: UserRecord = {
      id: userId,
      email: data.email,
      password_hash: hashedPassword,
      name: data.name,
      provider: "credentials",
      created_at: new Date(),
      updated_at: new Date(),
    };

    users.set(user.id, user);

    // Send verification email
    try {
      const token = await createToken(user.id, "email-verification", 24);
      await sendVerificationEmail(user.email, token);
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }

    return user;
  }
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const supabase = await getSupabase();

  if (supabase) {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      name: user.name,
      email_verified: user.email_verified ? new Date(user.email_verified) : undefined,
      image: user.image,
      provider: user.provider,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
    };
  } else {
    const user = Array.from(users.values()).find((u) => u.email === email);
    return user || null;
  }
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const supabase = await getSupabase();

  if (supabase) {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      name: user.name,
      email_verified: user.email_verified ? new Date(user.email_verified) : undefined,
      image: user.image,
      provider: user.provider,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
    };
  } else {
    return users.get(id) || null;
  }
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const supabase = await getSupabase();
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  if (supabase) {
    const { error } = await supabase
      .from("users")
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  } else {
    const user = users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    user.password_hash = hashedPassword;
    user.updated_at = new Date();
    users.set(userId, user);
  }
}

export async function verifyUserEmail(userId: string): Promise<void> {
  const supabase = await getSupabase();

  if (supabase) {
    const { error } = await supabase
      .from("users")
      .update({
        email_verified: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      throw new Error(`Failed to verify email: ${error.message}`);
    }
  } else {
    const user = users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    user.email_verified = new Date();
    user.updated_at = new Date();
    users.set(userId, user);
  }
}

