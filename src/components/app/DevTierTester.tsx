"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import type { LicenseTier } from "@/lib/types";

const TIERS: { tier: LicenseTier; label: string; color: string }[] = [
  { tier: "free", label: "Free", color: "bg-gray-500" },
  { tier: "paid", label: "Paid (Lifetime)", color: "bg-green-500" },
  { tier: "premium", label: "Premium", color: "bg-purple-500" },
];

export function DevTierTester() {
  const { tier, license, setLicense, removeLicense } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const handleSetTier = async (newTier: LicenseTier) => {
    if (newTier === "free") {
      await removeLicense();
    } else {
      await setLicense({
        key: `DEV-TEST-${newTier.toUpperCase()}-KEY`,
        tier: newTier,
        validatedAt: new Date().toISOString(),
        email: "test@claimpilot.dev",
      });
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-full shadow-lg hover:bg-amber-600 transition-colors"
      >
        🧪 Dev: {tier}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-72 shadow-xl border-amber-500/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              🧪 Tier Tester
              <Badge variant="outline" className="text-[10px]">DEV ONLY</Badge>
            </CardTitle>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Current: <span className="font-medium text-foreground">{tier}</span>
            {license && (
              <span className="block mt-1 text-[10px]">
                Key: {license.key.substring(0, 20)}...
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((t) => (
              <Button
                key={t.tier}
                size="sm"
                variant={tier === t.tier ? "default" : "outline"}
                className={`text-xs ${tier === t.tier ? t.color : ""}`}
                onClick={() => handleSetTier(t.tier)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          <div className="pt-2 border-t text-[10px] text-muted-foreground">
            <p className="font-medium mb-1">Test these features:</p>
            <ul className="space-y-0.5">
              <li>• Free: Import, Analytics, Recurring</li>
              <li>• Paid: Goals, Buckets, Reimbursements</li>
              <li>• Premium: Action Plan, Investments</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

