"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Do I need to connect my bank?",
    answer: "No. Just import a statement (CSV, Excel, or PDF). That's it. No bank linking, no credentials, no waiting for account verification.",
  },
  {
    question: "What features are included?",
    answer: "Everything is free! You get: goal tracking with feasibility scores, Needs/Wants/Goals budget buckets, scenario mode (what-if calculator), reimbursement tracking with batches, credit card safety calculator, advanced CSV/Excel exports, AI-powered parsing, auto-tagging rules, monthly action plans, and investment policy builder. All features are available at no cost.",
  },
  {
    question: "Is my financial data safe?",
    answer: "Yes, 100%. Your data is stored securely in the cloud (Supabase) with encryption. You can also use local storage if you prefer. We use industry-standard security practices and your data is protected with authentication.",
  },
  {
    question: "What banks/statements are supported?",
    answer: "Any bank that lets you export statements as CSV, Excel, or PDF. We've tested extensively with Emirates NBD, but the AI-powered parser works with most formats. If yours doesn't work, reach out and we'll add support.",
  },
  {
    question: "Is it really free?",
    answer: "Yes! All features are completely free. We're in development and testing phase, so we're making everything available at no cost. Sign up and start using all features immediately.",
  },
  {
    question: "Do I need to sign up?",
    answer: "Yes, you'll need to create a free account to use the app. This allows us to sync your data across devices and keep it secure. Sign up is quick and free.",
  },
  {
    question: "What's the Card Safety feature?",
    answer: "It calculates exactly how much you need to pay by your due date to avoid interest charges, accounting for payments you've already made and pending reimbursements. No more guessing.",
  },
  {
    question: "Can I use it on multiple devices?",
    answer: "Yes! Your data syncs across all your devices when you're signed in. Just sign in on any device and your transactions, goals, and settings will be there.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 px-6 bg-card/30">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know before getting started
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-border rounded-xl overflow-hidden bg-card/50"
            >
              <button
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-medium">{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 text-muted-foreground">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Still have questions?
          </p>
          <a
            href="mailto:hello@claimpilot.com"
            className="text-primary hover:underline"
          >
            Email us at hello@claimpilot.com
          </a>
        </div>
      </div>
    </section>
  );
}
