import { Hero, ProofSection, Outcomes, HowItWorks, WhyClaimPilot, Pricing, FAQ, FinalCTA, Footer } from "@/components/landing";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <ProofSection />
      <Outcomes />
      <HowItWorks />
      <WhyClaimPilot />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
