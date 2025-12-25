"use client";

export function ProofSection() {
  const proofs = [
    {
      title: "Your spending map",
      description: "Top categories + recurring bills detected",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
      mockContent: (
        <div className="space-y-2 text-left">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Groceries</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 rounded-full bg-primary/60" />
              <span className="text-xs font-medium">AED 1,240</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Dining Out</span>
            <div className="flex items-center gap-2">
              <div className="w-14 h-2 rounded-full bg-primary/40" />
              <span className="text-xs font-medium">AED 890</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Subscriptions</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-2 rounded-full bg-primary/30" />
              <span className="text-xs font-medium">AED 320</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">Recurring</span>
              <span className="text-muted-foreground">Netflix, Spotify, Gym</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Goal feasibility",
      description: "Can you hit Emergency Fund by June?",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      mockContent: (
        <div className="space-y-3 text-left">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">Emergency Fund</span>
              <span className="text-primary">67%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted">
              <div className="w-2/3 h-full rounded-full bg-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">AED 10,000 / 15,000</p>
          </div>
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">On track for June!</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Save AED 1,250/month to hit goal</p>
          </div>
        </div>
      ),
    },
    {
      title: "Monthly action plan",
      description: "What to pay, save, invest this month",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      mockContent: (
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">Pay credit card</p>
              <p className="text-xs text-muted-foreground">AED 3,200 by Jan 15</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">Save to Emergency Fund</p>
              <p className="text-xs text-muted-foreground">AED 1,250</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">Invest in ETF</p>
              <p className="text-xs text-muted-foreground">AED 500</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-16 px-6 relative">
      <div className="absolute inset-0 radial-overlay opacity-30" />
      
      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm text-primary font-medium mb-2 uppercase tracking-wider">See The Output</p>
          <h2 className="text-2xl md:text-3xl font-bold">
            From messy statements to clarity in minutes
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {proofs.map((proof, index) => (
            <div
              key={index}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-all h-full">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    {proof.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{proof.title}</h3>
                    <p className="text-xs text-muted-foreground">{proof.description}</p>
                  </div>
                </div>
                
                {/* Mock screenshot */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  {proof.mockContent}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

