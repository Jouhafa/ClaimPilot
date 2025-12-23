"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { v4 as uuidv4 } from "uuid";
import type { MerchantAlias } from "@/lib/types";

interface MerchantManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MerchantManager({ isOpen, onClose }: MerchantManagerProps) {
  const { aliases, addAlias, updateAlias, deleteAlias, applyMerchantNormalization, transactions } = useApp();
  const [newNormalizedName, setNewNormalizedName] = useState("");
  const [newVariants, setNewVariants] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (!isOpen) return null;

  const handleAddAlias = async () => {
    if (!newNormalizedName.trim() || !newVariants.trim()) return;

    const variants = newVariants.split(",").map((v) => v.trim()).filter((v) => v);
    if (variants.length === 0) return;

    const alias: MerchantAlias = {
      id: uuidv4(),
      normalizedName: newNormalizedName.trim(),
      variants,
    };

    await addAlias(alias);
    setNewNormalizedName("");
    setNewVariants("");
  };

  const handleDeleteAlias = async (id: string) => {
    if (confirm("Delete this merchant alias?")) {
      await deleteAlias(id);
    }
  };

  const handleApplyNormalization = async () => {
    const count = await applyMerchantNormalization();
    alert(`Normalized ${count} transactions`);
  };

  const handleStartEdit = (alias: MerchantAlias) => {
    setEditingId(alias.id);
    setEditValue(alias.variants.join(", "));
  };

  const handleSaveEdit = async (alias: MerchantAlias) => {
    const variants = editValue.split(",").map((v) => v.trim()).filter((v) => v);
    await updateAlias(alias.id, { variants });
    setEditingId(null);
    setEditValue("");
  };

  // Find merchants that might need aliases
  const merchantCounts = new Map<string, number>();
  transactions.forEach((tx) => {
    const count = merchantCounts.get(tx.merchant) || 0;
    merchantCounts.set(tx.merchant, count + 1);
  });

  // Find potential duplicates (similar merchants)
  const suggestedAliases: { base: string; variants: string[] }[] = [];
  const merchantList = Array.from(merchantCounts.keys());
  
  merchantList.forEach((merchant, i) => {
    const baseWord = merchant.split(" ")[0].toLowerCase();
    const similar = merchantList.filter((m, j) => {
      if (i >= j) return false;
      const mBaseWord = m.split(" ")[0].toLowerCase();
      return baseWord === mBaseWord && merchant !== m;
    });
    
    if (similar.length > 0) {
      const existing = aliases.find(
        (a) => a.normalizedName.toLowerCase() === baseWord || 
               a.variants.some((v) => v.toLowerCase().includes(baseWord))
      );
      if (!existing) {
        suggestedAliases.push({
          base: merchant,
          variants: similar,
        });
      }
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Merchant Normalization</CardTitle>
              <CardDescription>
                Combine similar merchant names for cleaner reports
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 flex-1 overflow-auto space-y-6">
          {/* Add New Alias */}
          <div className="space-y-4 pb-6 border-b">
            <h4 className="font-medium">Add Merchant Alias</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Normalized Name</Label>
                <Input
                  placeholder="e.g., Uber"
                  value={newNormalizedName}
                  onChange={(e) => setNewNormalizedName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Variants (comma-separated)</Label>
                <Input
                  placeholder="e.g., UBER BV, UBER TRIP, Uber Eats"
                  value={newVariants}
                  onChange={(e) => setNewVariants(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddAlias} disabled={!newNormalizedName.trim() || !newVariants.trim()}>
              Add Alias
            </Button>
          </div>

          {/* Apply Normalization */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div>
              <p className="font-medium">Apply to All Transactions</p>
              <p className="text-sm text-muted-foreground">
                Update merchant names based on your aliases
              </p>
            </div>
            <Button onClick={handleApplyNormalization}>
              Apply Now
            </Button>
          </div>

          {/* Suggested Aliases */}
          {suggestedAliases.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Suggested Aliases
              </h4>
              <div className="space-y-2">
                {suggestedAliases.slice(0, 5).map((suggestion, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{suggestion.base}</p>
                      <p className="text-xs text-muted-foreground">
                        Similar: {suggestion.variants.join(", ")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await addAlias({
                          id: uuidv4(),
                          normalizedName: suggestion.base.split(" ")[0],
                          variants: [suggestion.base, ...suggestion.variants],
                        });
                      }}
                    >
                      Create Alias
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Aliases */}
          <div className="space-y-3">
            <h4 className="font-medium">Your Aliases ({aliases.length})</h4>
            {aliases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No aliases yet. Add one above or use the suggestions.
              </p>
            ) : (
              <div className="space-y-2">
                {aliases.map((alias) => (
                  <div key={alias.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-primary">{alias.normalizedName}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editingId === alias.id ? handleSaveEdit(alias) : handleStartEdit(alias)}
                        >
                          {editingId === alias.id ? "Save" : "Edit"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAlias(alias.id)}
                          className="text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    {editingId === alias.id ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Variants (comma-separated)"
                        autoFocus
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {alias.variants.map((variant, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {variant}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

