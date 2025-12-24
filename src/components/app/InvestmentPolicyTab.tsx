"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";

type RiskProfile = "conservative" | "moderate" | "aggressive";
type TimeHorizon = "short" | "medium" | "long";

interface AllocationRecommendation {
  asset: string;
  percentage: number;
  description: string;
  color: string;
}

const RISK_PROFILES: Record<RiskProfile, { label: string; description: string }> = {
  conservative: {
    label: "Conservative",
    description: "Preserve capital, lower returns, minimal volatility",
  },
  moderate: {
    label: "Moderate",
    description: "Balanced growth with manageable risk",
  },
  aggressive: {
    label: "Aggressive",
    description: "Higher returns, accept higher volatility",
  },
};

const TIME_HORIZONS: Record<TimeHorizon, { label: string; years: string }> = {
  short: { label: "Short-term", years: "< 1 year" },
  medium: { label: "Medium-term", years: "1-3 years" },
  long: { label: "Long-term", years: "3+ years" },
};

// Allocation matrices based on risk + horizon
const ALLOCATIONS: Record<RiskProfile, Record<TimeHorizon, AllocationRecommendation[]>> = {
  conservative: {
    short: [
      { asset: "Savings/Cash", percentage: 70, description: "High-yield savings, money market", color: "#22c55e" },
      { asset: "Short-term Bonds", percentage: 25, description: "UAE govt bonds, sukuk", color: "#3b82f6" },
      { asset: "Gold", percentage: 5, description: "Physical gold or ETF", color: "#eab308" },
    ],
    medium: [
      { asset: "Savings/Cash", percentage: 40, description: "Emergency buffer", color: "#22c55e" },
      { asset: "Bonds/Sukuk", percentage: 40, description: "Investment-grade bonds", color: "#3b82f6" },
      { asset: "Dividend Stocks", percentage: 15, description: "Stable dividend payers", color: "#8b5cf6" },
      { asset: "Gold", percentage: 5, description: "Inflation hedge", color: "#eab308" },
    ],
    long: [
      { asset: "Savings/Cash", percentage: 20, description: "Emergency fund only", color: "#22c55e" },
      { asset: "Bonds/Sukuk", percentage: 40, description: "Core fixed income", color: "#3b82f6" },
      { asset: "Equity ETFs", percentage: 30, description: "Broad market exposure", color: "#8b5cf6" },
      { asset: "Gold/Commodities", percentage: 10, description: "Diversification", color: "#eab308" },
    ],
  },
  moderate: {
    short: [
      { asset: "Savings/Cash", percentage: 50, description: "Liquidity focus", color: "#22c55e" },
      { asset: "Short-term Bonds", percentage: 30, description: "Low duration", color: "#3b82f6" },
      { asset: "Balanced Funds", percentage: 20, description: "Mixed assets", color: "#8b5cf6" },
    ],
    medium: [
      { asset: "Savings/Cash", percentage: 20, description: "Buffer", color: "#22c55e" },
      { asset: "Bonds/Sukuk", percentage: 30, description: "Income", color: "#3b82f6" },
      { asset: "Equity ETFs", percentage: 40, description: "Growth", color: "#8b5cf6" },
      { asset: "REITs", percentage: 10, description: "Real estate exposure", color: "#f97316" },
    ],
    long: [
      { asset: "Savings/Cash", percentage: 10, description: "Emergency only", color: "#22c55e" },
      { asset: "Bonds/Sukuk", percentage: 20, description: "Stability", color: "#3b82f6" },
      { asset: "Equity ETFs", percentage: 50, description: "US + Intl", color: "#8b5cf6" },
      { asset: "Emerging Markets", percentage: 10, description: "Higher growth", color: "#ec4899" },
      { asset: "REITs", percentage: 10, description: "Diversification", color: "#f97316" },
    ],
  },
  aggressive: {
    short: [
      { asset: "Savings/Cash", percentage: 30, description: "Buffer for opportunities", color: "#22c55e" },
      { asset: "Equity ETFs", percentage: 50, description: "Broad market", color: "#8b5cf6" },
      { asset: "Growth Stocks", percentage: 20, description: "High potential", color: "#ec4899" },
    ],
    medium: [
      { asset: "Savings/Cash", percentage: 10, description: "Minimal buffer", color: "#22c55e" },
      { asset: "Equity ETFs", percentage: 50, description: "Core portfolio", color: "#8b5cf6" },
      { asset: "Growth/Tech", percentage: 25, description: "Sector bets", color: "#ec4899" },
      { asset: "Emerging Markets", percentage: 15, description: "Higher risk/reward", color: "#f97316" },
    ],
    long: [
      { asset: "Savings/Cash", percentage: 5, description: "Emergency only", color: "#22c55e" },
      { asset: "Equity ETFs", percentage: 40, description: "Broad market core", color: "#8b5cf6" },
      { asset: "Growth/Tech", percentage: 30, description: "High growth sectors", color: "#ec4899" },
      { asset: "Emerging Markets", percentage: 15, description: "High potential", color: "#f97316" },
      { asset: "Alternatives", percentage: 10, description: "Crypto, startups", color: "#ef4444" },
    ],
  },
};

export function InvestmentPolicyTab() {
  const { goals, incomeConfig } = useApp();
  const [riskSlider, setRiskSlider] = useState([50]);
  const [selectedHorizon, setSelectedHorizon] = useState<TimeHorizon>("medium");

  // Derive risk profile from slider
  const riskProfile: RiskProfile = useMemo(() => {
    const value = riskSlider[0];
    if (value < 33) return "conservative";
    if (value < 67) return "moderate";
    return "aggressive";
  }, [riskSlider]);

  // Get allocation based on risk + horizon
  const allocation = ALLOCATIONS[riskProfile][selectedHorizon];

  // Calculate suggested monthly investment
  const suggestedMonthly = useMemo(() => {
    const totalGoalContributions = goals.reduce((sum, g) => {
      const remaining = g.targetAmount - g.currentAmount;
      const months = Math.max(1, Math.ceil(
        (new Date(g.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
      ));
      return sum + remaining / months;
    }, 0);

    // Suggest investing what's left after goals, or 20% of income if no goals
    const income = incomeConfig?.monthlyIncome || 0;
    const surplus = income * 0.2 - totalGoalContributions;
    return Math.max(0, surplus);
  }, [goals, incomeConfig]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Investment Policy</h1>
        <p className="text-muted-foreground mt-2">
          Get a personalized asset allocation based on your risk tolerance
        </p>
      </div>

      {/* Disclaimer */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-yellow-500">This is not financial advice</p>
              <p className="text-muted-foreground">
                These are general guidelines based on common investment principles. 
                Consult a licensed financial advisor before making investment decisions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Risk Slider */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Risk Tolerance</CardTitle>
            <CardDescription>How much volatility can you handle?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Slider
                value={riskSlider}
                onValueChange={setRiskSlider}
                max={100}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conservative</span>
                <span>Moderate</span>
                <span>Aggressive</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-semibold text-primary">{RISK_PROFILES[riskProfile].label}</p>
              <p className="text-sm text-muted-foreground">{RISK_PROFILES[riskProfile].description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Time Horizon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Investment Horizon</CardTitle>
            <CardDescription>When will you need this money?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.entries(TIME_HORIZONS) as [TimeHorizon, { label: string; years: string }][]).map(
              ([key, { label, years }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedHorizon(key)}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    selectedHorizon === key
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{years}</p>
                </button>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommended Allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recommended Allocation</CardTitle>
          <CardDescription>
            Based on {RISK_PROFILES[riskProfile].label.toLowerCase()} risk with {TIME_HORIZONS[selectedHorizon].label.toLowerCase()} horizon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visual Bar */}
          <div className="h-8 rounded-full overflow-hidden flex">
            {allocation.map((item, idx) => (
              <div
                key={idx}
                className="h-full flex items-center justify-center text-xs font-medium text-white"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.color,
                }}
              >
                {item.percentage}%
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="space-y-3">
            {allocation.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="font-medium">{item.asset}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Badge variant="secondary">{item.percentage}%</Badge>
              </div>
            ))}
          </div>

          {/* Suggested Monthly */}
          {suggestedMonthly > 0 && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm text-green-500 font-medium">Suggested Monthly Investment</p>
              <p className="text-2xl font-bold text-green-500">
                {suggestedMonthly.toFixed(0)} AED
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on your income and goal allocations
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goal-Based Recommendations */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Goal-Specific Guidance</CardTitle>
            <CardDescription>Investment approach for each goal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((goal) => {
              const monthsToGoal = Math.ceil(
                (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
              );
              const horizon: TimeHorizon = monthsToGoal < 12 ? "short" : monthsToGoal < 36 ? "medium" : "long";
              const riskLevel: RiskProfile = 
                goal.category === "emergency" ? "conservative" :
                goal.priority === "critical" ? "conservative" :
                horizon === "short" ? "conservative" : "moderate";

              return (
                <div key={goal.id} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{goal.name}</p>
                    <Badge variant="outline">{monthsToGoal} months</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recommended: <span className="font-medium text-primary">{RISK_PROFILES[riskLevel].label}</span> approach
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {riskLevel === "conservative" 
                      ? "Keep mostly in savings or low-risk instruments" 
                      : "Can allocate some to bonds and stable equities"}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

