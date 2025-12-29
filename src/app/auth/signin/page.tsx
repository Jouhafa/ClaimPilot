"use client";

import { useState } from "react";
import Link from "next/link";
import { SignInForm } from "@/components/auth/SignInForm";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function SignInPage() {
  const [isSignIn, setIsSignIn] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <span className="font-semibold text-lg">ClaimPilot</span>
          </Link>
        </div>

        {isSignIn ? (
          <SignInForm onSwitchToRegister={() => setIsSignIn(false)} />
        ) : (
          <RegisterForm onSwitchToSignIn={() => setIsSignIn(true)} />
        )}
      </div>
    </div>
  );
}

