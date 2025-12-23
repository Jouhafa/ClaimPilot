"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Is my financial data safe?",
    answer: "Yes, 100%. Your data never leaves your browser. We use IndexedDB (local storage) to save everything on your device. No servers, no cloud, no risk. Even we can't see your transactions.",
  },
  {
    question: "What banks/statements are supported?",
    answer: "Any bank that lets you export statements as CSV, Excel, or PDF. We've tested extensively with Emirates NBD, but the AI-powered parser works with most formats. If yours doesn't work, reach out and we'll add support.",
  },
  {
    question: "What do I get for $54?",
    answer: "Lifetime access to all features including CSV/Excel export, AI-powered parsing, auto-tagging rules, and all future updates. No subscriptions, no recurring fees. Pay once, use forever.",
  },
  {
    question: "Can I try before buying?",
    answer: "Absolutely. The app is fully functional for free — import statements, tag transactions, track reimbursements, use the Card Safety calculator. You only need to pay to export reports.",
  },
  {
    question: "What's the Card Safety feature?",
    answer: "It calculates exactly how much you need to pay by your due date to avoid interest charges, accounting for payments you've already made and pending reimbursements. No more guessing.",
  },
  {
    question: "Do you offer refunds?",
    answer: "Yes, 7-day money-back guarantee. If the tool doesn't save you time or money, just email us and we'll refund you. No questions asked.",
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

