"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid verification link");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          setError(data.error || "Failed to verify email");
        } else {
          setStatus("success");
        }
      } catch (err) {
        setStatus("error");
        setError("An error occurred. Please try again.");
      }
    };

    verifyEmail();
  }, [token]);

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

        <Card className="w-full max-w-md" style={{ borderRadius: "16px" }}>
          <CardHeader style={{ padding: "24px 24px 16px" }}>
            <CardTitle className="text-2xl" style={{ fontWeight: 700 }}>
              {status === "verifying" && "Verifying Email"}
              {status === "success" && "Email Verified"}
              {status === "error" && "Verification Failed"}
            </CardTitle>
            <CardDescription>
              {status === "verifying" && "Please wait while we verify your email..."}
              {status === "success" && "Your email has been verified successfully"}
              {status === "error" && "We couldn't verify your email"}
            </CardDescription>
          </CardHeader>
          <CardContent style={{ padding: "0 24px 24px" }}>
            {status === "verifying" && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Verifying your email...</p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-foreground text-center">
                    Your email has been verified! You can now use all features of ClaimPilot.
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => router.push("/app")}
                  size="lg"
                >
                  Go to App
                </Button>
                <div className="text-center text-sm">
                  <Link
                    href="/auth/signin"
                    className="text-primary hover:underline"
                  >
                    Or sign in
                  </Link>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  <p>The verification link may have expired or is invalid.</p>
                  <p className="mt-2">Please request a new verification email.</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link href="/auth/signin">Back to Sign In</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}

