"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const tiers = [
  {
    name: "Free",
    subtitle: "All Features Included",
    price: "0",
    currency: "USD",
    description: "Everything you need to understand your finances, set goals, track progress, and take action — completely free.",
    features: [
      "Import unlimited statements (CSV/PDF)",
      "Auto-categorization (Groceries, Dining, etc.)",
      "Monthly spend breakdown & top merchants",
      "Recurring/subscription detection",
      "Fixed vs variable spending analysis",
      "Goal feasibility engine",
      "Bucket allocation (Needs/Wants/Goals)",
      "Scenario mode (what-if calculator)",
      "Smart budget suggestions",
      "Reimbursement tracker & batches",
      "Credit card safety calculator",
      "Advanced CSV/Excel exports",
      "AI-powered insights",
      "Personalized 30-day action plans",
      "Investment policy builder",
      "Monthly narrative & progress tracking",
      "Cloud sync & multi-device access",
      "Privacy-first — your data, your control",
    ],
    lockedFeatures: [],
    cta: "Get Started Free",
    ctaLink: "/app",
    highlighted: true,
    comingSoon: false,
    badge: undefined as string | undefined,
    localPrice: undefined as string | undefined,
    originalPrice: undefined as string | undefined,
  },
];

export function Pricing() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need, completely free
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            All features are available at no cost. Get started today and take control of your finances.
          </p>
        </div>

        <div className="grid md:grid-cols-1 gap-6 lg:gap-8 max-w-2xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col p-6 lg:p-8 rounded-2xl border ${
                tier.highlighted
                  ? "border-2 border-primary bg-card shadow-lg scale-[1.02]"
                  : "border-border bg-card/50"
              } ${tier.comingSoon ? "opacity-80" : ""}`}
            >
              {tier.badge && (
                <Badge
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 ${
                    tier.comingSoon 
                      ? "bg-muted text-muted-foreground" 
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {tier.badge}
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-1">{tier.name}</h3>
                <p className="text-sm text-primary font-medium">{tier.subtitle}</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {tier.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  {tier.price !== "0" && <span className="text-lg">$</span>}
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground ml-1">{tier.currency}</span>
                </div>
                {tier.localPrice && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {tier.localPrice}
                    {tier.originalPrice && (
                      <> · <span className="line-through">{tier.originalPrice}</span></>
                    )}
                  </p>
                )}
                {!tier.localPrice && tier.price === "0" && (
                  <p className="text-sm text-muted-foreground mt-1">Forever free</p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <svg 
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        feature.startsWith("Everything") 
                          ? "text-primary" 
                          : "text-green-500"
                      }`} 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    <span className={feature.startsWith("Everything") ? "font-medium" : ""}>
                      {feature}
                    </span>
                  </li>
                ))}
                {tier.lockedFeatures.map((feature, i) => (
                  <li key={`locked-${i}`} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path 
                        fillRule="evenodd" 
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.ctaLink.startsWith("/") ? (
                <Link href={tier.ctaLink}>
                  <Button 
                    variant={tier.highlighted ? "default" : "outline"} 
                    className="w-full"
                    disabled={tier.comingSoon}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              ) : (
                <a
                  href={tier.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button 
                    variant={tier.highlighted ? "default" : "outline"} 
                    className="w-full"
                    disabled={tier.comingSoon}
                  >
                    {tier.cta}
                    {!tier.comingSoon && (
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                  </Button>
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Trusted by consultants and frequent travelers
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-muted-foreground/70 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Privacy-First
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Free Forever
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secure & Private
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
