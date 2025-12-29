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
      // Handle OAuth sign-ins
      if (account?.provider === "google" || account?.provider === "apple") {
        // Use admin client to bypass RLS
        try {
          const adminClient = getAdminClient();
          
          // Check if user exists
          const { data: existingUser } = await (adminClient.from("users") as any)
            .select("*")
            .eq("email", user.email)
            .maybeSingle();

          if (!existingUser) {
            // Create new user
            const { error } = await (adminClient.from("users") as any).insert({
              id: user.id || crypto.randomUUID(),
              email: user.email!,
              name: user.name || undefined,
              image: user.image || undefined,
              provider: account.provider,
              email_verified: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            if (error) {
              console.error("Error creating OAuth user:", error);
            }
          } else {
            // Update user if needed (e.g., update image or name)
            const updates: any = {
              updated_at: new Date().toISOString(),
            };
            if (user.name && !existingUser.name) updates.name = user.name;
            if (user.image && !existingUser.image) updates.image = user.image;
            if (!existingUser.provider) updates.provider = account.provider;
            
            if (Object.keys(updates).length > 1) {
              await (adminClient.from("users") as any)
                .update(updates)
                .eq("id", existingUser.id);
            }
          }
        } catch (error) {
          console.error("Error in OAuth sign-in:", error);
          // Fallback to in-memory store if Supabase fails
          const existingUser = Array.from(users.values()).find(
            (u) => u.email === user.email
          );

          if (!existingUser) {
            const newUser: UserRecord = {
              id: user.id || crypto.randomUUID(),
              email: user.email!,
              name: user.name || undefined,
              image: user.image || undefined,
              provider: account.provider,
              email_verified: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
            };
            users.set(newUser.id, newUser);
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
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

