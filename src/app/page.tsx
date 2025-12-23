import { Hero, PainPoints, HowItWorks, Features, Pricing, Footer } from "@/components/landing";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <PainPoints />
      <HowItWorks />
      <Features />
      <Pricing />
      <Footer />
    </main>
  );
}
