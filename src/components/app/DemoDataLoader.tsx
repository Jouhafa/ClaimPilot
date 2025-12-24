"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { generateAllDemoData } from "@/lib/demoData";
import {
  saveTransactions,
  saveGoals,
  saveBuckets,
  saveBatches,
  saveRules,
  saveRecurring,
  saveIncomeConfig,
  saveAliases,
  saveCardSafety,
} from "@/lib/storage";

interface DemoDataLoaderProps {
  variant?: "banner" | "card" | "button";
  onLoaded?: () => void;
}

export function DemoDataLoader({ variant = "card", onLoaded }: DemoDataLoaderProps) {
  const { transactions, refreshData, setLicense } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadDemoData = async () => {
    setIsLoading(true);
    try {
      const demoData = generateAllDemoData();
      
      // Save all demo data to storage
      await Promise.all([
        saveTransactions(demoData.transactions),
        saveGoals(demoData.goals),
        saveBuckets(demoData.buckets),
        saveBatches(demoData.batches),
        saveRules(demoData.rules),
        saveRecurring(demoData.recurring),
        saveIncomeConfig(demoData.incomeConfig),
        saveAliases(demoData.aliases),
        saveCardSafety(demoData.cardSafety),
      ]);
      
      // Also set a demo license to unlock all features
      await setLicense({
        key: "DEMO-LICENSE-KEY-2024",
        tier: "premium",
        validatedAt: new Date().toISOString(),
        email: "demo@claimpilot.app",
      });
      
      // Refresh context
      await refreshData();
      
      setIsLoaded(true);
      onLoaded?.();
    } catch (error) {
      console.error("Failed to load demo data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearDemoData = async () => {
    setIsLoading(true);
    try {
      // Clear all data
      await Promise.all([
        saveTransactions([]),
        saveGoals([]),
        saveBatches([]),
        saveRules([]),
        saveRecurring([]),
      ]);
      
      await refreshData();
      setIsLoaded(false);
    } catch (error) {
      console.error("Failed to clear data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show if user already has data
  const hasData = transactions.length > 5;

  if (variant === "button") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={hasData ? clearDemoData : loadDemoData}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </>
        ) : hasData ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Demo Data
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Load Demo Data
          </>
        )}
      </Button>
    );
  }

  if (variant === "banner" && !hasData) {
    return (
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xl">✨</span>
            </div>
            <div>
              <p className="font-medium">New here? Try the demo!</p>
              <p className="text-sm text-muted-foreground">
                Load realistic sample data to explore all features
              </p>
            </div>
          </div>
          <Button onClick={loadDemoData} disabled={isLoading} size="sm">
            {isLoading ? "Loading..." : "Load Demo Data"}
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "card") {
    if (hasData && !isLoaded) return null;

    return (
      <Card className={isLoaded ? "border-green-500/30 bg-green-500/5" : "border-primary/20"}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLoaded ? "bg-green-500/20" : "bg-primary/10"}`}>
              <span className="text-2xl">{isLoaded ? "✅" : "🎯"}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">
                  {isLoaded ? "Demo Data Loaded!" : "Try Demo Data"}
                </h3>
                {isLoaded && (
                  <Badge className="bg-green-500/20 text-green-500">Active</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {isLoaded 
                  ? "Explore the app with realistic consultant expense data. All features are unlocked."
                  : "Load sample transactions, goals, and budgets to see ClaimPilot in action. Perfect for demos."}
              </p>
              
              {isLoaded ? (
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {["💳", "✈️", "🎯", "📊"].map((emoji, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                        {emoji}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    32 transactions • 4 goals • 3 buckets
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearDemoData} disabled={isLoading}>
                    Clear Data
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button onClick={loadDemoData} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Load Demo Data
                      </>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Unlocks all features
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// Compact version for sidebar or header
export function DemoModeIndicator() {
  const { transactions, license } = useApp();
  
  const isDemo = license?.key?.startsWith("DEMO") && transactions.length > 0;
  
  if (!isDemo) return null;

  return (
    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
      <span className="mr-1">🎭</span> Demo Mode
    </Badge>
  );
}

