"use client";

import { Badge } from "@/components/ui/badge";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Import statements",
      description: "Upload your bank statement as CSV, Excel, or PDF. Works with any bank — no account linking needed.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      tier: null,
    },
    {
      number: "02",
      title: "Understand your spend",
      description: "See categories, recurring bills, top merchants, and unusual spikes — all auto-detected.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      tier: { label: "Free", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
    },
    {
      number: "03",
      title: "Set goals & buckets",
      description: "Define savings goals, allocate Needs/Wants/Goals budgets, and track your progress month over month.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      tier: { label: "Free", color: "bg-primary/10 text-primary border-primary/20" },
    },
    {
      number: "04",
      title: "Get a monthly action plan",
      description: "Receive a clear monthly playbook: what to pay, save, and invest. Your personal finance coach.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      tier: { label: "Free", color: "bg-primary/10 text-primary border-primary/20" },
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 relative">
      <div className="absolute inset-0 radial-overlay opacity-50" />
      
      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-20 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            How it works
          </h2>
          <p className="text-muted-foreground text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed">
            From statement chaos to financial clarity — all features included, completely free
          </p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent hidden lg:block" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-center">
                  {/* Step number with icon */}
                  <div className="relative inline-flex mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-all">
                      <div className="text-primary">
                        {step.icon}
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {step.number}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                  
                  {/* Tier badge */}
                  {step.tier && (
                    <Badge 
                      variant="outline" 
                      className={`mb-4 text-base px-3 py-1 ${step.tier.color}`}
                    >
                      {step.tier.label}
                    </Badge>
                  )}
                  
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
