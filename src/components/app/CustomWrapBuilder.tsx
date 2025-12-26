"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { generateCustomWrap } from "@/lib/wrapComputation";
import { saveWrapSnapshot } from "@/lib/storage";
import type { WrapScope } from "@/lib/types";

interface CustomWrapBuilderProps {
  onComplete?: (wrapId: string) => void;
}

export function CustomWrapBuilder({ onComplete }: CustomWrapBuilderProps) {
  const { transactions, recurring, goals, profile } = useApp();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [scope, setScope] = useState<WrapScope>("all");
  const [isGenerating, setIsGenerating] = useState(false);

  const presets = [
    {
      id: "this-month",
      label: "This month",
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return { start, end };
      },
    },
    {
      id: "last-month",
      label: "Last month",
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { start, end };
      },
    },
    {
      id: "last-90",
      label: "Last 90 days",
      getDates: () => {
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - 90);
        return { start, end };
      },
    },
    {
      id: "ytd",
      label: "Year to date",
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date();
        return { start, end };
      },
    },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let period: { start: Date; end: Date };

      if (selectedPreset === "custom") {
        if (!customStart || !customEnd) {
          alert("Please select both start and end dates");
          setIsGenerating(false);
          return;
        }
        period = {
          start: new Date(customStart),
          end: new Date(customEnd),
        };
      } else {
        const preset = presets.find((p) => p.id === selectedPreset);
        if (!preset) {
          alert("Please select a period");
          setIsGenerating(false);
          return;
        }
        period = preset.getDates();
      }

      const wrap = generateCustomWrap(period, scope, {
        transactions,
        recurring,
        period,
        scope,
        currency: profile?.currency || "AED",
        goals: goals.map((g) => ({
          id: g.id,
          name: g.name,
          currentAmount: g.currentAmount,
          targetAmount: g.targetAmount,
        })),
      });

      await saveWrapSnapshot(wrap);
      onComplete?.(wrap.id);
    } catch (error) {
      console.error("Failed to generate wrap:", error);
      alert("Failed to generate wrap. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Note: Wrap playback is handled by parent component
  // This component just generates and saves the wrap

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
          Create a Wrap
        </h1>
        <p className="text-[15px] text-muted-foreground mt-2" style={{ lineHeight: 1.6 }}>
          Generate a personalized recap for any time period
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Presets */}
          <div className="grid grid-cols-2 gap-3">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={`
                  p-4 rounded-xl border text-left transition-all
                  ${selectedPreset === preset.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                  }
                `}
              >
                <p className="font-medium">{preset.label}</p>
              </button>
            ))}
            <button
              onClick={() => setSelectedPreset("custom")}
              className={`
                p-4 rounded-xl border text-left transition-all
                ${selectedPreset === "custom"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
                }
              `}
            >
              <p className="font-medium">Custom range</p>
            </button>
          </div>

          {/* Custom date range */}
          {selectedPreset === "custom" && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">Start date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scope toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Scope</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { value: "all" as WrapScope, label: "All transactions" },
              { value: "reimbursements" as WrapScope, label: "Reimbursements only" },
              { value: "personal" as WrapScope, label: "Personal only" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <input
                  type="radio"
                  name="scope"
                  value={option.value}
                  checked={scope === option.value}
                  onChange={() => setScope(option.value)}
                  className="w-4 h-4"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={!selectedPreset || isGenerating}
        size="lg"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            Analyzing... Finding patterns... Building your story...
          </>
        ) : (
          "Generate Wrap →"
        )}
      </Button>
    </div>
  );
}

