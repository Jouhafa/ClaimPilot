"use client";

export function Outcomes() {
  const outcomes = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      title: "Your spending map",
      description: "See exactly where every dollar goes",
      features: [
        "Top categories ranked by spend",
        "Merchants you visit most",
        "Recurring subscriptions auto-detected",
        "Unusual spikes flagged instantly",
      ],
      color: "from-blue-500/20 to-cyan-500/20",
      iconBg: "bg-blue-500/10 text-blue-500",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      title: "Your monthly budget targets",
      description: "Allocate money with intention",
      features: [
        "Needs / Wants / Goals buckets",
        "Realistic targets based on history",
        "Track pacing through the month",
        "Adjust when life happens",
      ],
      color: "from-emerald-500/20 to-green-500/20",
      iconBg: "bg-emerald-500/10 text-emerald-500",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      title: "Your action plan",
      description: "Know exactly what to do this month",
      features: [
        "What to pay (avoid interest)",
        "What to save (hit your goals)",
        "What to invest (grow wealth)",
        "Clear priorities, no guesswork",
      ],
      color: "from-violet-500/20 to-purple-500/20",
      iconBg: "bg-violet-500/10 text-violet-500",
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What you&apos;ll get
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Not just charts and graphs — actionable outputs that tell you exactly what to do with your money.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {outcomes.map((outcome, index) => (
            <div
              key={index}
              className="relative group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${outcome.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl`} />
              <div className="relative p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors h-full">
                <div className={`w-16 h-16 rounded-2xl ${outcome.iconBg} flex items-center justify-center mb-6`}>
                  {outcome.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{outcome.title}</h3>
                <p className="text-muted-foreground mb-6">{outcome.description}</p>
                
                <ul className="space-y-3">
                  {outcome.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

