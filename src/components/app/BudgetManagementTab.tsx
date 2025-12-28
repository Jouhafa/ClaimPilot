"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { v4 as uuidv4 } from "uuid";
import type { Budget, TransactionCategory, BudgetTemplate } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";

// Budget Templates
const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: "conservative",
    name: "Conservative",
    description: "Focus on essentials, minimal discretionary spending",
    budgets: [
      { category: "groceries", percentage: 15 },
      { category: "rent", percentage: 30 },
      { category: "utilities", percentage: 5 },
      { category: "transport", percentage: 8 },
      { category: "dining", percentage: 5 },
      { category: "shopping", percentage: 2 },
      { category: "entertainment", percentage: 3 },
      { category: "subscriptions", percentage: 3 },
      { category: "health", percentage: 5 },
      { category: "savings", percentage: 20 },
      { category: "other", percentage: 4 },
    ],
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "Moderate spending across categories",
    budgets: [
      { category: "groceries", percentage: 12 },
      { category: "rent", percentage: 25 },
      { category: "utilities", percentage: 5 },
      { category: "transport", percentage: 10 },
      { category: "dining", percentage: 10 },
      { category: "shopping", percentage: 8 },
      { category: "entertainment", percentage: 8 },
      { category: "subscriptions", percentage: 5 },
      { category: "health", percentage: 5 },
      { category: "travel", percentage: 5 },
      { category: "savings", percentage: 15 },
      { category: "other", percentage: 2 },
    ],
  },
  {
    id: "aggressive",
    name: "Aggressive",
    description: "Higher discretionary spending, lifestyle-focused",
    budgets: [
      { category: "groceries", percentage: 10 },
      { category: "rent", percentage: 20 },
      { category: "utilities", percentage: 4 },
      { category: "transport", percentage: 12 },
      { category: "dining", percentage: 15 },
      { category: "shopping", percentage: 12 },
      { category: "entertainment", percentage: 12 },
      { category: "subscriptions", percentage: 6 },
      { category: "health", percentage: 4 },
      { category: "travel", percentage: 10 },
      { category: "savings", percentage: 10 },
      { category: "other", percentage: 5 },
    ],
  },
];

export function BudgetManagementTab() {
  const { budgets, transactions, incomeConfig, profile, addBudget, updateBudget, deleteBudget } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [formData, setFormData] = useState<Partial<Budget>>({
    category: "groceries",
    monthlyAmount: 0,
    currency: profile?.currency || "AED",
    rolloverEnabled: false,
    alertThreshold: 80,
    isActive: true,
  });

  const monthlyIncome = incomeConfig?.monthlyIncome || 45000;
  const currency = profile?.currency || "AED";

  // Calculate current month spending by category
  const currentMonthSpending = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthTransactions = transactions.filter((tx) => {
      const date = new Date(tx.date);
      return (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear &&
        tx.amount < 0 &&
        !tx.parentId
      );
    });

    const spendingByCategory: Record<TransactionCategory, number> = {} as Record<
      TransactionCategory,
      number
    >;

    monthTransactions.forEach((tx) => {
      if (tx.category) {
        spendingByCategory[tx.category] =
          (spendingByCategory[tx.category] || 0) + Math.abs(tx.amount);
      }
    });

    return spendingByCategory;
  }, [transactions]);

  // Calculate budget status
  const budgetStatus = useMemo(() => {
    return budgets
      .filter((b) => b.isActive)
      .map((budget) => {
        const spent = currentMonthSpending[budget.category] || 0;
        const budgetAmount = budget.monthlyAmount;
        const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
        const remaining = budgetAmount - spent;
        const isOverBudget = spent > budgetAmount;
        const isNearLimit =
          budget.alertThreshold && percentage >= budget.alertThreshold;

        return {
          budget,
          spent,
          budgetAmount,
          percentage,
          remaining,
          isOverBudget,
          isNearLimit,
        };
      });
  }, [budgets, currentMonthSpending]);

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      category: "groceries",
      monthlyAmount: 0,
      currency: currency,
      rolloverEnabled: false,
      alertThreshold: 80,
      isActive: true,
    });
  };

  const handleSave = async () => {
    if (!formData.category || !formData.monthlyAmount || formData.monthlyAmount <= 0) {
      alert("Please enter a valid category and budget amount");
      return;
    }

    // Check if budget already exists for this category
    const existing = budgets.find(
      (b) => b.category === formData.category && b.id !== editingId
    );
    if (existing && !editingId) {
      if (
        !confirm(
          `A budget already exists for ${CATEGORY_CONFIG[formData.category].label}. Do you want to update it instead?`
        )
      ) {
        return;
      }
      await updateBudget(existing.id, {
        monthlyAmount: formData.monthlyAmount,
        rolloverEnabled: formData.rolloverEnabled,
        alertThreshold: formData.alertThreshold,
        isActive: formData.isActive,
      });
      setIsAdding(false);
      setEditingId(null);
      return;
    }

    const budget: Budget = {
      id: editingId || uuidv4(),
      category: formData.category,
      monthlyAmount: formData.monthlyAmount,
      currency: formData.currency || currency,
      rolloverEnabled: formData.rolloverEnabled ?? false,
      alertThreshold: formData.alertThreshold,
      isActive: formData.isActive ?? true,
      createdAt: editingId
        ? budgets.find((b) => b.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      await updateBudget(editingId, budget);
      setEditingId(null);
    } else {
      await addBudget(budget);
      setIsAdding(false);
    }

    setFormData({
      category: "groceries",
      monthlyAmount: 0,
      currency: currency,
      rolloverEnabled: false,
      alertThreshold: 80,
      isActive: true,
    });
  };

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setFormData({
      category: budget.category,
      monthlyAmount: budget.monthlyAmount,
      currency: budget.currency,
      rolloverEnabled: budget.rolloverEnabled,
      alertThreshold: budget.alertThreshold,
      isActive: budget.isActive,
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this budget?")) {
      await deleteBudget(id);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      category: "groceries",
      monthlyAmount: 0,
      currency: currency,
      rolloverEnabled: false,
      alertThreshold: 80,
      isActive: true,
    });
  };

  const handleApplyTemplate = async (template: BudgetTemplate) => {
    if (
      !confirm(
        `This will create/update budgets for all categories in the "${template.name}" template. Existing budgets will be updated. Continue?`
      )
    ) {
      return;
    }

    for (const budgetItem of template.budgets) {
      const amount = Math.round((monthlyIncome * budgetItem.percentage) / 100);
      const existing = budgets.find((b) => b.category === budgetItem.category);

      const budget: Budget = {
        id: existing?.id || uuidv4(),
        category: budgetItem.category,
        monthlyAmount: amount,
        currency: currency,
        rolloverEnabled: false,
        alertThreshold: 80,
        isActive: true,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existing) {
        await updateBudget(existing.id, budget);
      } else {
        await addBudget(budget);
      }
    }

    setShowTemplates(false);
  };

  const totalBudgeted = budgets
    .filter((b) => b.isActive)
    .reduce((sum, b) => sum + b.monthlyAmount, 0);
  const totalSpent = Object.values(currentMonthSpending).reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
          Budget Management
        </h1>
        <p className="text-[15px] text-muted-foreground mt-2" style={{ lineHeight: 1.6 }}>
          Set monthly budgets by category, track spending, and get alerts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {currency} {totalBudgeted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Spent This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {currency} {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-bold",
                totalBudgeted - totalSpent >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {currency}{" "}
              {(totalBudgeted - totalSpent).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Templates */}
      {!isAdding && budgets.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Start with Templates</CardTitle>
            <CardDescription>Choose a budget template to get started quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {BUDGET_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleApplyTemplate(template)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="text-sm">{template.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Budget" : "Add New Budget"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Category *</label>
                <select
                  value={formData.category || "groceries"}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as TransactionCategory })
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Monthly Budget Amount *</label>
                <Input
                  type="number"
                  value={formData.monthlyAmount || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, monthlyAmount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                />
                {monthlyIncome > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {((((formData.monthlyAmount || 0) / monthlyIncome) * 100).toFixed(1))}% of
                    monthly income
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Alert Threshold (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.alertThreshold || 80}
                  onChange={(e) =>
                    setFormData({ ...formData, alertThreshold: parseInt(e.target.value) || 80 })
                  }
                  placeholder="80"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Alert when spending reaches this percentage
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Currency</label>
                <Input
                  value={formData.currency || currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                  placeholder="AED"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rolloverEnabled"
                checked={formData.rolloverEnabled ?? false}
                onChange={(e) => setFormData({ ...formData, rolloverEnabled: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="rolloverEnabled" className="text-sm">
                Enable rollover (unused budget carries to next month)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm">Active budget</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>{editingId ? "Update" : "Add"} Budget</Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budgets List */}
      <div className="space-y-4">
        {!isAdding && (
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Budgets</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowTemplates(!showTemplates)}>
                {showTemplates ? "Hide" : "Show"} Templates
              </Button>
              <Button onClick={handleAdd}>+ Add Budget</Button>
            </div>
          </div>
        )}

        {showTemplates && !isAdding && (
          <Card>
            <CardHeader>
              <CardTitle>Budget Templates</CardTitle>
              <CardDescription>Apply a template to quickly set up multiple budgets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {BUDGET_TEMPLATES.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleApplyTemplate(template)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="text-sm">{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {template.budgets.length} categories
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {budgets.length === 0 && !isAdding ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No budgets yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create budgets to track your spending by category
              </p>
              <Button onClick={handleAdd}>Add Budget</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {budgetStatus.map(({ budget, spent, budgetAmount, percentage, remaining, isOverBudget, isNearLimit }) => {
              const categoryConfig = CATEGORY_CONFIG[budget.category];
              return (
                <Card key={budget.id} className={cn(isOverBudget && "border-red-500")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: categoryConfig.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{categoryConfig.label}</h3>
                            {isOverBudget && (
                              <Badge variant="destructive" className="text-xs">
                                Over Budget
                              </Badge>
                            )}
                            {isNearLimit && !isOverBudget && (
                              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                Near Limit
                              </Badge>
                            )}
                            {budget.rolloverEnabled && (
                              <Badge variant="secondary" className="text-xs">
                                Rollover
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Budget: {budget.currency} {budgetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(budget)}>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(budget.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Spent</span>
                        <span className={cn("font-medium", isOverBudget && "text-red-600")}>
                          {budget.currency} {spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            isOverBudget
                              ? "bg-red-500"
                              : isNearLimit
                              ? "bg-amber-500"
                              : "bg-primary"
                          )}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Remaining</span>
                        <span
                          className={cn(
                            "font-medium",
                            remaining >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {budget.currency} {Math.abs(remaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

