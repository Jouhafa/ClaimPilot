"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/context";
import { v4 as uuidv4 } from "uuid";
import type { Goal } from "@/lib/types";
import {
  calculateRequiredMonthly,
  calculateProgress,
  isGoalOnTrack,
  estimateMonthlySavings,
  getGoalPriorityColor,
  suggestGoalAllocation,
} from "@/lib/goalEngine";
import { ScenarioMode } from "./ScenarioMode";

const GOAL_PRESETS = [
  { name: "Emergency Fund", category: "emergency" as const, suggestedAmount: 30000 },
  { name: "Car Down Payment", category: "purchase" as const, suggestedAmount: 50000 },
  { name: "Home Down Payment", category: "purchase" as const, suggestedAmount: 200000 },
  { name: "Wedding Fund", category: "lifestyle" as const, suggestedAmount: 100000 },
  { name: "Vacation Fund", category: "lifestyle" as const, suggestedAmount: 15000 },
  { name: "Investment Portfolio", category: "investment" as const, suggestedAmount: 50000 },
  { name: "Debt Payoff", category: "debt" as const, suggestedAmount: 20000 },
];

export function GoalsTab() {
  const { goals, addGoal, updateGoal, deleteGoal, transactions, incomeConfig } = useApp();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showScenarioMode, setShowScenarioMode] = useState(false);
  
  // New goal form state
  const [newGoal, setNewGoal] = useState({
    name: "",
    targetAmount: "",
    targetDate: "",
    currentAmount: "0",
    priority: "medium" as Goal["priority"],
    category: "purchase" as Goal["category"],
  });

  // Calculate estimated savings
  const monthlySavings = useMemo(() => {
    return estimateMonthlySavings(transactions, 3, incomeConfig?.monthlyIncome);
  }, [transactions, incomeConfig]);

  // Get allocation suggestions
  const allocations = useMemo(() => {
    return suggestGoalAllocation(goals, monthlySavings);
  }, [goals, monthlySavings]);

  const handlePresetSelect = (preset: typeof GOAL_PRESETS[0]) => {
    setNewGoal({
      ...newGoal,
      name: preset.name,
      category: preset.category,
      targetAmount: preset.suggestedAmount.toString(),
    });
    setWizardStep(2);
  };

  const handleCreateGoal = async () => {
    const goal: Goal = {
      id: uuidv4(),
      name: newGoal.name,
      targetAmount: parseFloat(newGoal.targetAmount) || 0,
      targetDate: newGoal.targetDate,
      currentAmount: parseFloat(newGoal.currentAmount) || 0,
      priority: newGoal.priority,
      category: newGoal.category,
      createdAt: new Date().toISOString(),
    };
    
    await addGoal(goal);
    setShowWizard(false);
    setWizardStep(1);
    setNewGoal({
      name: "",
      targetAmount: "",
      targetDate: "",
      currentAmount: "0",
      priority: "medium",
      category: "purchase",
    });
  };

  const handleUpdateCurrentAmount = async (goalId: string, amount: string) => {
    const value = parseFloat(amount);
    if (!isNaN(value)) {
      await updateGoal(goalId, { currentAmount: value });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      await deleteGoal(goalId);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AE", {
      month: "short",
      year: "numeric",
    });
  };

  const getMonthsUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const now = new Date();
    return Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground mt-2">
            Plan your savings and track progress toward financial goals
          </p>
        </div>
        <div className="flex gap-2">
          {goals.length > 0 && (
            <Button variant="outline" onClick={() => setShowScenarioMode(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
              What-If
            </Button>
          )}
          <Button onClick={() => setShowWizard(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Goal
          </Button>
        </div>
      </div>

      {/* Savings Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Monthly Savings</p>
              <p className="text-2xl font-bold">
                {monthlySavings > 0 ? monthlySavings.toLocaleString() : "—"} AED
              </p>
              <p className="text-xs text-muted-foreground">Based on last 3 months</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Goals</p>
              <p className="text-2xl font-bold">{goals.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Target</p>
              <p className="text-2xl font-bold">
                {goals.reduce((sum, g) => sum + g.targetAmount, 0).toLocaleString()} AED
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Set up your first savings goal to start planning
            </p>
            <Button onClick={() => setShowWizard(true)}>Create Your First Goal</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const progress = calculateProgress(goal);
            const required = calculateRequiredMonthly(goal);
            const trackStatus = isGoalOnTrack(goal, monthlySavings);
            const monthsUntil = getMonthsUntil(goal.targetDate);
            const allocation = allocations.find((a) => a.goalId === goal.id);

            return (
              <Card key={goal.id} className="relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-1 w-full"
                  style={{ backgroundColor: getGoalPriorityColor(goal.priority) }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{goal.name}</CardTitle>
                      <CardDescription>
                        Target: {formatDate(goal.targetDate)} ({monthsUntil} months)
                      </CardDescription>
                    </div>
                    <Badge
                      variant={trackStatus.isOnTrack ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {trackStatus.isOnTrack ? "On Track" : "Behind"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {goal.currentAmount.toLocaleString()} / {goal.targetAmount.toLocaleString()} AED
                      </span>
                      <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Required Monthly */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Required monthly:</span>
                      <span className="font-mono font-semibold">{required.toFixed(0)} AED</span>
                    </div>
                    {allocation && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Suggested allocation:</span>
                        <span className="font-mono text-primary">{allocation.suggestedAmount.toFixed(0)} AED</span>
                      </div>
                    )}
                    {trackStatus.projectedDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Projected completion:</span>
                        <span className={trackStatus.isOnTrack ? "text-green-500" : "text-red-500"}>
                          {trackStatus.projectedDate.toLocaleDateString("en-AE", {
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick Update */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Update current amount"
                      className="h-8 text-sm"
                      defaultValue={goal.currentAmount}
                      onBlur={(e) => handleUpdateCurrentAmount(goal.id, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Goal Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {wizardStep === 1 ? "What are you saving for?" : wizardStep === 2 ? "Set your target" : "Review & Create"}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setShowWizard(false); setWizardStep(1); }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-1 flex-1 rounded-full ${
                      step <= wizardStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {wizardStep === 1 && (
                <>
                  <p className="text-sm text-muted-foreground">Choose a preset or create custom:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {GOAL_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handlePresetSelect(preset)}
                        className="p-3 text-left rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <p className="font-medium text-sm">{preset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ~{preset.suggestedAmount.toLocaleString()} AED
                        </p>
                      </button>
                    ))}
                    <button
                      onClick={() => setWizardStep(2)}
                      className="p-3 text-left rounded-lg border border-dashed hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium text-sm">Custom Goal</p>
                      <p className="text-xs text-muted-foreground">Define your own</p>
                    </button>
                  </div>
                </>
              )}

              {wizardStep === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="goalName">Goal Name</Label>
                    <Input
                      id="goalName"
                      placeholder="e.g., Car down payment"
                      value={newGoal.name}
                      onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetAmount">Target Amount (AED)</Label>
                      <Input
                        id="targetAmount"
                        type="number"
                        placeholder="50000"
                        value={newGoal.targetAmount}
                        onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentAmount">Already Saved (AED)</Label>
                      <Input
                        id="currentAmount"
                        type="number"
                        placeholder="0"
                        value={newGoal.currentAmount}
                        onChange={(e) => setNewGoal({ ...newGoal, currentAmount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetDate">Target Date</Label>
                    <Input
                      id="targetDate"
                      type="date"
                      value={newGoal.targetDate}
                      onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={newGoal.priority}
                        onValueChange={(value: Goal["priority"]) => setNewGoal({ ...newGoal, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={newGoal.category}
                        onValueChange={(value: Goal["category"]) => setNewGoal({ ...newGoal, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="emergency">Emergency Fund</SelectItem>
                          <SelectItem value="purchase">Major Purchase</SelectItem>
                          <SelectItem value="investment">Investment</SelectItem>
                          <SelectItem value="lifestyle">Lifestyle</SelectItem>
                          <SelectItem value="debt">Debt Payoff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setWizardStep(1)}>Back</Button>
                    <Button
                      onClick={() => setWizardStep(3)}
                      disabled={!newGoal.name || !newGoal.targetAmount || !newGoal.targetDate}
                    >
                      Next
                    </Button>
                  </div>
                </>
              )}

              {wizardStep === 3 && (
                <>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Goal:</span>
                      <span className="font-medium">{newGoal.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-mono">{parseFloat(newGoal.targetAmount).toLocaleString()} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">By:</span>
                      <span>{new Date(newGoal.targetDate).toLocaleDateString("en-AE", { month: "long", year: "numeric" })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly needed:</span>
                      <span className="font-mono font-semibold text-primary">
                        {calculateRequiredMonthly({
                          ...newGoal as unknown as Goal,
                          id: "",
                          targetAmount: parseFloat(newGoal.targetAmount) || 0,
                          currentAmount: parseFloat(newGoal.currentAmount) || 0,
                          createdAt: "",
                        }).toFixed(0)} AED
                      </span>
                    </div>
                  </div>

                  {monthlySavings > 0 && (
                    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                      <p className="text-sm">
                        Based on your ~{monthlySavings.toFixed(0)} AED monthly savings, this goal is{" "}
                        {monthlySavings >= calculateRequiredMonthly({
                          ...newGoal as unknown as Goal,
                          id: "",
                          targetAmount: parseFloat(newGoal.targetAmount) || 0,
                          currentAmount: parseFloat(newGoal.currentAmount) || 0,
                          createdAt: "",
                        }) ? (
                          <span className="font-semibold text-green-500">achievable</span>
                        ) : (
                          <span className="font-semibold text-yellow-500">ambitious</span>
                        )}
                        {" "}at your current rate.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setWizardStep(2)}>Back</Button>
                    <Button onClick={handleCreateGoal}>Create Goal</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scenario Mode Modal */}
      <ScenarioMode isOpen={showScenarioMode} onClose={() => setShowScenarioMode(false)} />
    </div>
  );
}

