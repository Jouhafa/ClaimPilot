"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/context";
import { v4 as uuidv4 } from "uuid";
import type { Bucket, TransactionCategory } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/types";
import { calculateBucketSpending } from "@/lib/goalEngine";

export function BucketsTab() {
  const { buckets, addBucket, updateBucket, deleteBucket, transactions, incomeConfig } = useApp();
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [editingBucket, setEditingBucket] = useState<Bucket | null>(null);
  
  // New bucket form state
  const [newBucket, setNewBucket] = useState({
    name: "",
    targetPercentage: "30",
    color: "#3b82f6",
    linkedCategories: [] as TransactionCategory[],
  });

  // Calculate bucket spending
  const bucketSpending = useMemo(() => {
    return calculateBucketSpending(transactions, buckets);
  }, [transactions, buckets]);

  // Calculate total monthly income/spending
  const { totalIncome, totalSpending } = useMemo(() => {
    const spending = transactions
      .filter(tx => tx.amount < 0 && !tx.parentId)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    const income = incomeConfig?.monthlyIncome || 
      transactions
        .filter(tx => tx.amount > 0 && !tx.parentId)
        .reduce((sum, tx) => sum + tx.amount, 0);
    
    return { totalIncome: income, totalSpending: spending };
  }, [transactions, incomeConfig]);

  const handleCreateBucket = async () => {
    const bucket: Bucket = {
      id: uuidv4(),
      name: newBucket.name,
      targetPercentage: parseFloat(newBucket.targetPercentage) || 0,
      linkedCategories: newBucket.linkedCategories,
      color: newBucket.color,
      createdAt: new Date().toISOString(),
    };
    
    await addBucket(bucket);
    setShowAddBucket(false);
    setNewBucket({
      name: "",
      targetPercentage: "30",
      color: "#3b82f6",
      linkedCategories: [],
    });
  };

  const handleUpdateBucket = async (id: string, updates: Partial<Bucket>) => {
    await updateBucket(id, updates);
    setEditingBucket(null);
  };

  const handleDeleteBucket = async (id: string) => {
    if (confirm("Are you sure you want to delete this bucket?")) {
      await deleteBucket(id);
    }
  };

  const toggleCategory = (category: TransactionCategory) => {
    const current = newBucket.linkedCategories;
    if (current.includes(category)) {
      setNewBucket({
        ...newBucket,
        linkedCategories: current.filter(c => c !== category),
      });
    } else {
      setNewBucket({
        ...newBucket,
        linkedCategories: [...current, category],
      });
    }
  };

  const allCategories = Object.keys(CATEGORY_CONFIG) as TransactionCategory[];
  const assignedCategories = new Set(buckets.flatMap(b => b.linkedCategories));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Buckets</h1>
          <p className="text-muted-foreground mt-2">
            Organize spending into Needs, Wants, and Goals
          </p>
        </div>
        <Button onClick={() => setShowAddBucket(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Bucket
        </Button>
      </div>

      {/* Income Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Income</p>
              <p className="text-2xl font-bold text-green-500">
                {totalIncome > 0 ? totalIncome.toLocaleString() : "—"} AED
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spending</p>
              <p className="text-2xl font-bold text-red-500">
                {totalSpending.toLocaleString()} AED
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={`text-2xl font-bold ${totalIncome - totalSpending >= 0 ? "text-green-500" : "text-red-500"}`}>
                {(totalIncome - totalSpending).toLocaleString()} AED
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bucket Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Budget Allocation</CardTitle>
          <CardDescription>Your spending vs budget targets</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Visual bar */}
          <div className="h-8 rounded-full overflow-hidden flex mb-4">
            {buckets.map((bucket) => {
              const spending = bucketSpending.find(b => b.bucketId === bucket.id);
              return (
                <div
                  key={bucket.id}
                  className="h-full flex items-center justify-center text-xs font-medium text-white"
                  style={{
                    width: `${bucket.targetPercentage}%`,
                    backgroundColor: bucket.color,
                  }}
                >
                  {bucket.targetPercentage}%
                </div>
              );
            })}
            {buckets.length === 0 && (
              <div className="h-full w-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
                No buckets defined
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {buckets.map((bucket) => (
              <div key={bucket.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: bucket.color }}
                />
                <span className="text-sm">{bucket.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Buckets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {buckets.map((bucket) => {
          const spending = bucketSpending.find(b => b.bucketId === bucket.id);
          const percentage = spending && spending.target > 0
            ? (spending.actual / spending.target) * 100
            : 0;
          const isOverBudget = percentage > 100;

          return (
            <Card key={bucket.id} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-1 w-full"
                style={{ backgroundColor: bucket.color }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{bucket.name}</CardTitle>
                    <CardDescription>
                      {bucket.targetPercentage}% of income • {bucket.linkedCategories.length} categories
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingBucket(bucket)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBucket(bucket.id)}
                    >
                      <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {spending?.actual.toLocaleString() || 0} / {spending?.target.toLocaleString() || 0} AED
                    </span>
                    <Badge variant={isOverBudget ? "destructive" : "secondary"}>
                      {percentage.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min(100, percentage)}
                    className={`h-2 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`}
                  />
                </div>

                {/* Variance */}
                {spending && (
                  <div className={`p-2 rounded text-sm ${
                    spending.variance > 0 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                  }`}>
                    {spending.variance > 0 ? (
                      <span>Over budget by {spending.variance.toLocaleString()} AED</span>
                    ) : (
                      <span>Under budget by {Math.abs(spending.variance).toLocaleString()} AED</span>
                    )}
                  </div>
                )}

                {/* Linked Categories */}
                <div className="flex flex-wrap gap-1">
                  {bucket.linkedCategories.map(cat => (
                    <Badge
                      key={cat}
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: CATEGORY_CONFIG[cat]?.color }}
                    >
                      {CATEGORY_CONFIG[cat]?.label || cat}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Bucket Modal */}
      {(showAddBucket || editingBucket) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingBucket ? "Edit Bucket" : "Create Bucket"}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowAddBucket(false); setEditingBucket(null); }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bucketName">Bucket Name</Label>
                <Input
                  id="bucketName"
                  placeholder="e.g., Needs, Wants, Goals"
                  value={editingBucket?.name || newBucket.name}
                  onChange={(e) => editingBucket
                    ? setEditingBucket({ ...editingBucket, name: e.target.value })
                    : setNewBucket({ ...newBucket, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetPercentage">Target % of Income</Label>
                  <Input
                    id="targetPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={editingBucket?.targetPercentage.toString() || newBucket.targetPercentage}
                    onChange={(e) => editingBucket
                      ? setEditingBucket({ ...editingBucket, targetPercentage: parseFloat(e.target.value) || 0 })
                      : setNewBucket({ ...newBucket, targetPercentage: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bucketColor">Color</Label>
                  <Input
                    id="bucketColor"
                    type="color"
                    value={editingBucket?.color || newBucket.color}
                    onChange={(e) => editingBucket
                      ? setEditingBucket({ ...editingBucket, color: e.target.value })
                      : setNewBucket({ ...newBucket, color: e.target.value })
                    }
                    className="h-10 p-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Linked Categories</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select which spending categories belong to this bucket
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {allCategories
                    .filter(cat => !["income", "transfer", "savings", "investment"].includes(cat))
                    .map(cat => {
                      const isSelected = editingBucket
                        ? editingBucket.linkedCategories.includes(cat)
                        : newBucket.linkedCategories.includes(cat);
                      const isAssignedElsewhere = !isSelected && assignedCategories.has(cat);

                      return (
                        <button
                          key={cat}
                          disabled={isAssignedElsewhere}
                          onClick={() => {
                            if (editingBucket) {
                              const current = editingBucket.linkedCategories;
                              setEditingBucket({
                                ...editingBucket,
                                linkedCategories: isSelected
                                  ? current.filter(c => c !== cat)
                                  : [...current, cat],
                              });
                            } else {
                              toggleCategory(cat);
                            }
                          }}
                          className={`p-2 text-left rounded-lg border text-sm transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : isAssignedElsewhere
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CATEGORY_CONFIG[cat]?.color }}
                            />
                            <span>{CATEGORY_CONFIG[cat]?.label || cat}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setShowAddBucket(false); setEditingBucket(null); }}>
                  Cancel
                </Button>
                {editingBucket ? (
                  <Button onClick={() => handleUpdateBucket(editingBucket.id, editingBucket)}>
                    Save Changes
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreateBucket}
                    disabled={!newBucket.name || newBucket.linkedCategories.length === 0}
                  >
                    Create Bucket
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

