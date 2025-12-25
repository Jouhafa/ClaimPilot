import { Hero, ProofSection, Outcomes, HowItWorks, WhyClaimPilot, CoachTeaser, Pricing, FAQ, FinalCTA, Footer } from "@/components/landing";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <ProofSection />
      <Outcomes />
      <HowItWorks />
      <CoachTeaser />
      <WhyClaimPilot />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
