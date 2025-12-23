"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Pricing() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple pricing
          </h2>
          <p className="text-muted-foreground text-lg">
            Try everything free. Pay once to unlock exports.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free tier */}
          <div className="p-8 rounded-2xl border border-border bg-card/50">
            <h3 className="text-xl font-semibold mb-2">Free</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Everything except export
            </p>
            <div className="text-4xl font-bold mb-6">
              0 <span className="text-lg font-normal text-muted-foreground">AED</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Import unlimited statements",
                "Tag all transactions",
                "Track reimbursement status",
                "Card safety calculator",
                "Local data storage",
              ].map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Export reports (locked)
              </li>
            </ul>
            <Link href="/app">
              <Button variant="outline" className="w-full">
                Start Free
              </Button>
            </Link>
          </div>

          {/* Paid tier */}
          <div className="relative p-8 rounded-2xl border-2 border-primary bg-card">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
              Early Access
            </Badge>
            <h3 className="text-xl font-semibold mb-2">Lifetime Access</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Full access forever
            </p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$54</span>
              <span className="text-lg font-normal text-muted-foreground"> USD</span>
              <p className="text-sm text-muted-foreground mt-1">
                ~199 AED · <span className="line-through">$79</span> — First 20 buyers only
              </p>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Everything in Free",
                "Export reports (CSV)",
                "Monthly totals breakdown",
                "Status summaries",
                "Future updates included",
              ].map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <a
              href="https://gumroad.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full">
                Get Lifetime Access
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

