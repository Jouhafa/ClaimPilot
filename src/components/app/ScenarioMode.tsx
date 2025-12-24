"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import type { Goal } from "@/lib/types";
import {
  calculateRequiredMonthly,
  calculateScenarioImpact,
  estimateMonthlySavings,
  getGoalPriorityColor,
} from "@/lib/goalEngine";

interface ScenarioModeProps {
  isOpen: boolean;
  onClose: () => void;
}

type ScenarioType = "bonus" | "expense_change" | "goal_delay" | "goal_reduce" | "custom";

const SCENARIO_PRESETS = [
  { type: "bonus" as ScenarioType, label: "Receive a bonus", icon: "🎉", description: "One-time cash injection" },
  { type: "expense_change" as ScenarioType, label: "Monthly expense change", icon: "📊", description: "Rent change, salary raise, etc." },
  { type: "goal_delay" as ScenarioType, label: "Delay goal deadline", icon: "📅", description: "Push target date further" },
  { type: "goal_reduce" as ScenarioType, label: "Reduce goal amount", icon: "⬇️", description: "Lower the target" },
  { type: "custom" as ScenarioType, label: "Custom scenario", icon: "✏️", description: "Mix multiple changes" },
];

export function ScenarioMode({ isOpen, onClose }: ScenarioModeProps) {
  const { goals, transactions, incomeConfig } = useApp();
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [scenarioType, setScenarioType] = useState<ScenarioType | null>(null);
  
  // Scenario inputs
  const [bonusAmount, setBonusAmount] = useState("");
  const [monthlyChange, setMonthlyChange] = useState("");
  const [delayMonths, setDelayMonths] = useState("");
  const [newTargetAmount, setNewTargetAmount] = useState("");

  const monthlySavings = useMemo(() => {
    return estimateMonthlySavings(transactions, 3, incomeConfig?.monthlyIncome);
  }, [transactions, incomeConfig]);

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  // Calculate scenario impact
  const impact = useMemo(() => {
    if (!selectedGoal) return null;

    const scenario: {
      oneTimeAmount?: number;
      monthlyChange?: number;
      newTargetDate?: string;
      newTargetAmount?: number;
    } = {};

    if (scenarioType === "bonus" && bonusAmount) {
      scenario.oneTimeAmount = parseFloat(bonusAmount) || 0;
    }
    if (scenarioType === "expense_change" && monthlyChange) {
      scenario.monthlyChange = parseFloat(monthlyChange) || 0;
    }
    if (scenarioType === "goal_delay" && delayMonths) {
      const newDate = new Date(selectedGoal.targetDate);
      newDate.setMonth(newDate.getMonth() + (parseInt(delayMonths) || 0));
      scenario.newTargetDate = newDate.toISOString().split("T")[0];
    }
    if (scenarioType === "goal_reduce" && newTargetAmount) {
      scenario.newTargetAmount = parseFloat(newTargetAmount) || 0;
    }
    if (scenarioType === "custom") {
      if (bonusAmount) scenario.oneTimeAmount = parseFloat(bonusAmount) || 0;
      if (monthlyChange) scenario.monthlyChange = parseFloat(monthlyChange) || 0;
      if (delayMonths) {
        const newDate = new Date(selectedGoal.targetDate);
        newDate.setMonth(newDate.getMonth() + (parseInt(delayMonths) || 0));
        scenario.newTargetDate = newDate.toISOString().split("T")[0];
      }
      if (newTargetAmount) scenario.newTargetAmount = parseFloat(newTargetAmount) || 0;
    }

    return calculateScenarioImpact(selectedGoal, monthlySavings, scenario);
  }, [selectedGoal, scenarioType, bonusAmount, monthlyChange, delayMonths, newTargetAmount, monthlySavings]);

  const resetForm = () => {
    setScenarioType(null);
    setBonusAmount("");
    setMonthlyChange("");
    setDelayMonths("");
    setNewTargetAmount("");
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Never";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-AE", { month: "short", year: "numeric" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scenario Mode</CardTitle>
              <CardDescription>See how changes affect your goal timeline</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Goal Selection */}
          <div className="space-y-2">
            <Label>Select a goal to analyze</Label>
            <Select value={selectedGoalId} onValueChange={(v) => { setSelectedGoalId(v); resetForm(); }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a goal" />
              </SelectTrigger>
              <SelectContent>
                {goals.map(goal => (
                  <SelectItem key={goal.id} value={goal.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getGoalPriorityColor(goal.priority) }}
                      />
                      {goal.name} - {goal.targetAmount.toLocaleString()} AED
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedGoal && (
            <>
              {/* Current Status */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Current Status</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Progress</p>
                      <p className="font-semibold">
                        {selectedGoal.currentAmount.toLocaleString()} / {selectedGoal.targetAmount.toLocaleString()} AED
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Target Date</p>
                      <p className="font-semibold">{formatDate(selectedGoal.targetDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly Needed</p>
                      <p className="font-semibold">{calculateRequiredMonthly(selectedGoal).toFixed(0)} AED</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scenario Type Selection */}
              {!scenarioType && (
                <div className="space-y-2">
                  <Label>What-if scenario</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SCENARIO_PRESETS.map(preset => (
                      <button
                        key={preset.type}
                        onClick={() => setScenarioType(preset.type)}
                        className="p-3 text-left rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{preset.icon}</span>
                          <div>
                            <p className="font-medium text-sm">{preset.label}</p>
                            <p className="text-xs text-muted-foreground">{preset.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scenario Inputs */}
              {scenarioType && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{SCENARIO_PRESETS.find(p => p.type === scenarioType)?.label}</Badge>
                    <Button variant="ghost" size="sm" onClick={resetForm}>Change scenario</Button>
                  </div>

                  {(scenarioType === "bonus" || scenarioType === "custom") && (
                    <div className="space-y-2">
                      <Label>One-time bonus/injection (AED)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 10000"
                        value={bonusAmount}
                        onChange={(e) => setBonusAmount(e.target.value)}
                      />
                    </div>
                  )}

                  {(scenarioType === "expense_change" || scenarioType === "custom") && (
                    <div className="space-y-2">
                      <Label>Monthly change (AED)</Label>
                      <p className="text-xs text-muted-foreground">
                        Positive = more savings (salary raise), Negative = less savings (rent increase)
                      </p>
                      <Input
                        type="number"
                        placeholder="e.g., 1000 or -500"
                        value={monthlyChange}
                        onChange={(e) => setMonthlyChange(e.target.value)}
                      />
                    </div>
                  )}

                  {(scenarioType === "goal_delay" || scenarioType === "custom") && (
                    <div className="space-y-2">
                      <Label>Delay goal by (months)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 6"
                        value={delayMonths}
                        onChange={(e) => setDelayMonths(e.target.value)}
                      />
                    </div>
                  )}

                  {(scenarioType === "goal_reduce" || scenarioType === "custom") && (
                    <div className="space-y-2">
                      <Label>New target amount (AED)</Label>
                      <Input
                        type="number"
                        placeholder={`Current: ${selectedGoal.targetAmount}`}
                        value={newTargetAmount}
                        onChange={(e) => setNewTargetAmount(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Impact Preview */}
                  {impact && (
                    <Card className={`border-2 ${impact.isNowOnTrack ? "border-green-500 bg-green-500/5" : "border-yellow-500 bg-yellow-500/5"}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {impact.isNowOnTrack ? (
                            <>
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              On Track!
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Still Behind
                            </>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">New Progress</p>
                            <p className="font-semibold">
                              {impact.newCurrentAmount.toLocaleString()} / {impact.newTargetAmount.toLocaleString()} AED
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">New Target Date</p>
                            <p className="font-semibold">{formatDate(impact.newTargetDate)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Monthly Savings</p>
                            <p className={`font-semibold ${impact.newMonthlySavings > monthlySavings ? "text-green-500" : impact.newMonthlySavings < monthlySavings ? "text-red-500" : ""}`}>
                              {impact.newMonthlySavings.toFixed(0)} AED
                              {impact.newMonthlySavings !== monthlySavings && (
                                <span className="text-xs ml-1">
                                  ({impact.newMonthlySavings > monthlySavings ? "+" : ""}{(impact.newMonthlySavings - monthlySavings).toFixed(0)})
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Required Monthly</p>
                            <p className="font-semibold">{impact.newRequiredMonthly.toFixed(0)} AED</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Projected Completion</p>
                            <p className={`font-semibold ${impact.isNowOnTrack ? "text-green-500" : "text-yellow-500"}`}>
                              {formatDate(impact.newProjectedDate)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}

          {goals.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Create a goal first to run scenarios</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

