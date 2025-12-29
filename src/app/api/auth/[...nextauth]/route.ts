import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth v5 returns an object with handlers
const { handlers } = NextAuth(authOptions);

export const { GET, POST } = handlers;
