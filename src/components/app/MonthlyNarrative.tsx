"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { getCategoryBreakdown, getMonthOverMonthComparison, getCashflowSummary } from "@/lib/categories";
import { getRecurringSummary } from "@/lib/recurringDetector";
import { CATEGORY_CONFIG } from "@/lib/types";

interface NarrativeSection {
  title: string;
  content: string;
  type: "positive" | "negative" | "neutral" | "suggestion";
}

export function MonthlyNarrative() {
  const { transactions, goals, recurring, incomeConfig } = useApp();
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);

  // Generate local narrative
  const localNarrative = useMemo(() => {
    const sections: NarrativeSection[] = [];
    
    const categoryBreakdown = getCategoryBreakdown(transactions);
    const monthComparison = getMonthOverMonthComparison(transactions);
    const cashflow = getCashflowSummary(transactions);
    const recurringSummary = getRecurringSummary(recurring);

    // 1. Overall cashflow
    const totalSpending = categoryBreakdown.reduce((sum, c) => sum + c.total, 0);
    const income = incomeConfig?.monthlyIncome || cashflow.totalInflow;
    const savingsRate = income > 0 ? ((income - totalSpending) / income) * 100 : 0;

    if (savingsRate >= 20) {
      sections.push({
        title: "Strong Savings",
        content: `You're saving ${savingsRate.toFixed(0)}% of your income this month - above the recommended 20%. Keep it up!`,
        type: "positive",
      });
    } else if (savingsRate >= 10) {
      sections.push({
        title: "Moderate Savings",
        content: `Your savings rate is ${savingsRate.toFixed(0)}%. Getting close to the 20% target - a few cuts could get you there.`,
        type: "neutral",
      });
    } else if (savingsRate > 0) {
      sections.push({
        title: "Low Savings",
        content: `Only saving ${savingsRate.toFixed(0)}% this month. Consider reviewing your variable spending to improve this.`,
        type: "negative",
      });
    } else {
      sections.push({
        title: "Negative Cashflow",
        content: `You're spending more than you earn. This is unsustainable - urgent review needed.`,
        type: "negative",
      });
    }

    // 2. Biggest changes
    const significantChanges = monthComparison.filter(c => Math.abs(c.changePercentage) > 20 && c.currentMonth > 100);
    
    if (significantChanges.length > 0) {
      const increases = significantChanges.filter(c => c.changePercentage > 0);
      const decreases = significantChanges.filter(c => c.changePercentage < 0);

      if (increases.length > 0) {
        const topIncrease = increases[0];
        sections.push({
          title: `${topIncrease.label} Up ${topIncrease.changePercentage.toFixed(0)}%`,
          content: `You spent ${topIncrease.currentMonth.toFixed(0)} AED on ${topIncrease.label.toLowerCase()} vs ${topIncrease.previousMonth.toFixed(0)} AED last month. That's ${Math.abs(topIncrease.change).toFixed(0)} AED more.`,
          type: "negative",
        });
      }

      if (decreases.length > 0) {
        const topDecrease = decreases[0];
        sections.push({
          title: `${topDecrease.label} Down ${Math.abs(topDecrease.changePercentage).toFixed(0)}%`,
          content: `Great job reducing ${topDecrease.label.toLowerCase()} spending to ${topDecrease.currentMonth.toFixed(0)} AED from ${topDecrease.previousMonth.toFixed(0)} AED!`,
          type: "positive",
        });
      }
    }

    // 3. Top spending category
    if (categoryBreakdown.length > 0) {
      const topCategory = categoryBreakdown[0];
      sections.push({
        title: `Top Spend: ${topCategory.label}`,
        content: `${topCategory.label} accounts for ${topCategory.percentage.toFixed(0)}% of your spending (${topCategory.total.toFixed(0)} AED). ${
          topCategory.percentage > 30 ? "This is quite high - worth reviewing." : "This seems reasonable."
        }`,
        type: topCategory.percentage > 40 ? "negative" : "neutral",
      });
    }

    // 4. Recurring costs
    if (recurringSummary.totalMonthly > 0) {
      const recurringPercent = income > 0 ? (recurringSummary.totalMonthly / income) * 100 : 0;
      sections.push({
        title: `${recurringSummary.activeCount} Recurring Payments`,
        content: `Your subscriptions and bills total ${recurringSummary.totalMonthly.toFixed(0)} AED/month (${recurringPercent.toFixed(0)}% of income). ${
          recurringPercent > 40 ? "Consider reviewing which ones you actually need." : "This is a reasonable fixed cost base."
        }`,
        type: recurringPercent > 50 ? "negative" : "neutral",
      });
    }

    // 5. Goal progress (if any)
    if (goals.length > 0) {
      const onTrackGoals = goals.filter(g => {
        const remaining = g.targetAmount - g.currentAmount;
        const months = Math.max(1, Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
        const required = remaining / months;
        return (income - totalSpending) >= required;
      });

      if (onTrackGoals.length === goals.length) {
        sections.push({
          title: "All Goals On Track",
          content: `Great news! All ${goals.length} of your goals are progressing as planned at your current savings rate.`,
          type: "positive",
        });
      } else if (onTrackGoals.length > 0) {
        sections.push({
          title: `${onTrackGoals.length}/${goals.length} Goals On Track`,
          content: `Some goals need attention. Consider adjusting timelines or increasing contributions.`,
          type: "neutral",
        });
      } else {
        sections.push({
          title: "Goals Need Attention",
          content: `At your current savings rate, you may not hit your goal deadlines. Review your budget or adjust expectations.`,
          type: "negative",
        });
      }
    }

    // 6. Suggestion
    if (categoryBreakdown.some(c => c.category === "dining" && c.percentage > 15)) {
      sections.push({
        title: "Quick Win",
        content: "Dining is over 15% of spending. Cooking 2 more meals at home per week could save 400-600 AED/month.",
        type: "suggestion",
      });
    } else if (recurringSummary.byCategory.some(c => c.category === "subscriptions" && c.count > 3)) {
      sections.push({
        title: "Quick Win",
        content: "You have multiple subscriptions. Do an audit - canceling just one could save 50-100 AED/month.",
        type: "suggestion",
      });
    }

    return sections;
  }, [transactions, goals, recurring, incomeConfig]);

  const handleGenerateAI = async () => {
    if (!aiEnabled) return;
    
    setIsGeneratingAI(true);
    try {
      // Prepare summary data
      const categoryBreakdown = getCategoryBreakdown(transactions);
      const monthComparison = getMonthOverMonthComparison(transactions);
      const cashflow = getCashflowSummary(transactions);

      const summaryData = {
        totalSpending: categoryBreakdown.reduce((sum, c) => sum + c.total, 0),
        topCategories: categoryBreakdown.slice(0, 5).map(c => ({
          category: c.label,
          amount: c.total,
          percentage: c.percentage,
        })),
        monthOverMonth: monthComparison.slice(0, 3).map(c => ({
          category: c.label,
          change: c.changePercentage,
        })),
        cashflow: {
          inflow: cashflow.totalInflow,
          outflow: cashflow.totalOutflow,
          net: cashflow.netCashflow,
        },
        goalsCount: goals.length,
        income: incomeConfig?.monthlyIncome,
      };

      const response = await fetch("/api/generate-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryData }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiNarrative(data.narrative);
      } else {
        setAiNarrative("Unable to generate AI narrative. Using local insights instead.");
      }
    } catch (error) {
      console.error("AI narrative error:", error);
      setAiNarrative("Unable to generate AI narrative. Using local insights instead.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getTypeStyles = (type: NarrativeSection["type"]) => {
    switch (type) {
      case "positive":
        return "border-green-500/30 bg-green-500/5";
      case "negative":
        return "border-red-500/30 bg-red-500/5";
      case "suggestion":
        return "border-blue-500/30 bg-blue-500/5";
      default:
        return "border-muted";
    }
  };

  const getTypeIcon = (type: NarrativeSection["type"]) => {
    switch (type) {
      case "positive":
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "negative":
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "suggestion":
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const currentMonth = new Date().toLocaleDateString("en-AE", { month: "long", year: "numeric" });

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Import transactions to see your monthly narrative.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Monthly Narrative</CardTitle>
            <CardDescription>What changed in {currentMonth}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiEnabled(!aiEnabled)}
              className={aiEnabled ? "bg-primary/10" : ""}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              AI {aiEnabled ? "On" : "Off"}
            </Button>
            {aiEnabled && (
              <Button size="sm" onClick={handleGenerateAI} disabled={isGeneratingAI}>
                {isGeneratingAI ? "Generating..." : "Generate AI Narrative"}
              </Button>
            )}
          </div>
        </div>
        {aiEnabled && (
          <p className="text-xs text-muted-foreground mt-2">
            AI mode sends anonymized spending summaries to Gemini for personalized insights.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {aiNarrative ? (
          <div className="p-4 rounded-lg border bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">AI Generated</Badge>
            </div>
            <p className="text-sm whitespace-pre-line">{aiNarrative}</p>
          </div>
        ) : (
          localNarrative.map((section, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${getTypeStyles(section.type)}`}
            >
              <div className="flex items-start gap-3">
                {getTypeIcon(section.type)}
                <div>
                  <p className="font-medium">{section.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{section.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

