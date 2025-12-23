"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Transaction, TransactionTag } from "@/lib/types";

interface SplitTransactionModalProps {
  transaction: Transaction;
  onSplit: (splits: { percentage: number; tag: TransactionTag }[]) => Promise<void>;
  onClose: () => void;
}

export function SplitTransactionModal({ transaction, onSplit, onClose }: SplitTransactionModalProps) {
  const [splits, setSplits] = useState<{ percentage: number; tag: TransactionTag }[]>([
    { percentage: 70, tag: "reimbursable" },
    { percentage: 30, tag: "personal" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);

  const handleAddSplit = () => {
    const remaining = 100 - totalPercentage;
    if (remaining > 0) {
      setSplits([...splits, { percentage: remaining, tag: "personal" }]);
    }
  };

  const handleRemoveSplit = (index: number) => {
    if (splits.length > 2) {
      setSplits(splits.filter((_, i) => i !== index));
    }
  };

  const handlePercentageChange = (index: number, value: number) => {
    const updated = [...splits];
    updated[index].percentage = Math.max(0, Math.min(100, value));
    setSplits(updated);
  };

  const handleTagChange = (index: number, tag: TransactionTag) => {
    const updated = [...splits];
    updated[index].tag = tag;
    setSplits(updated);
  };

  const handleSubmit = async () => {
    if (Math.abs(totalPercentage - 100) > 0.01) {
      setError("Percentages must sum to 100%");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSplit(splits);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to split transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTagColor = (tag: TransactionTag) => {
    switch (tag) {
      case "reimbursable": return "text-green-500";
      case "personal": return "text-blue-500";
      case "ignore": return "text-gray-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Split Transaction</CardTitle>
              <CardDescription>
                Divide this transaction into multiple parts
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Original Transaction Info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{transaction.merchant}</p>
                <p className="text-sm text-muted-foreground">{transaction.date}</p>
              </div>
              <p className="text-lg font-mono font-bold">
                {Math.abs(transaction.amount).toFixed(2)} {transaction.currency}
              </p>
            </div>
          </div>

          {/* Split Configuration */}
          <div className="space-y-3">
            <Label>Split Parts</Label>
            {splits.map((split, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={split.percentage}
                      onChange={(e) => handlePercentageChange(index, Number(e.target.value))}
                      className="w-20 text-center"
                    />
                    <span className="text-muted-foreground">%</span>
                    <span className="text-sm text-muted-foreground">
                      = {((Math.abs(transaction.amount) * split.percentage) / 100).toFixed(2)} {transaction.currency}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {(["reimbursable", "personal", "ignore"] as TransactionTag[]).map((tag) => (
                      <Button
                        key={tag}
                        variant={split.tag === tag ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTagChange(index, tag)}
                        className={split.tag === tag ? "" : getTagColor(tag)}
                      >
                        {tag === "reimbursable" ? "Reimbursable" : tag === "personal" ? "Personal" : "Ignore"}
                      </Button>
                    ))}
                  </div>
                </div>
                {splits.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSplit(index)}
                    className="text-destructive"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add Split Button */}
          {totalPercentage < 100 && (
            <Button variant="outline" size="sm" onClick={handleAddSplit} className="w-full">
              + Add Another Split
            </Button>
          )}

          {/* Total Indicator */}
          <div className={`p-3 rounded-lg border ${
            Math.abs(totalPercentage - 100) < 0.01 
              ? "bg-green-500/10 border-green-500/30" 
              : "bg-destructive/10 border-destructive/30"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className={`font-bold ${
                Math.abs(totalPercentage - 100) < 0.01 ? "text-green-500" : "text-destructive"
              }`}>
                {totalPercentage}%
              </span>
            </div>
            {Math.abs(totalPercentage - 100) >= 0.01 && (
              <p className="text-xs text-destructive mt-1">
                Must equal 100% ({totalPercentage < 100 ? `${100 - totalPercentage}% remaining` : `${totalPercentage - 100}% over`})
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || Math.abs(totalPercentage - 100) >= 0.01}
            >
              {isSubmitting ? "Splitting..." : "Split Transaction"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

