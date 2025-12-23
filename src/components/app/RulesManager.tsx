"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { v4 as uuidv4 } from "uuid";
import type { Rule, TransactionTag } from "@/lib/types";

interface RulesManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesManager({ isOpen, onClose }: RulesManagerProps) {
  const { rules, addRule, deleteRule, transactions, updateTransaction } = useApp();
  const [newContains, setNewContains] = useState("");
  const [newTag, setNewTag] = useState<Exclude<TransactionTag, null>>("reimbursable");

  if (!isOpen) return null;

  const handleAddRule = async () => {
    if (!newContains.trim()) return;

    const rule: Rule = {
      id: uuidv4(),
      contains: newContains.trim(),
      tag: newTag,
    };

    await addRule(rule);
    setNewContains("");
  };

  const handleDeleteRule = async (id: string) => {
    await deleteRule(id);
  };

  const handleApplyRules = async () => {
    let applied = 0;
    
    for (const tx of transactions) {
      if (tx.tag) continue; // Skip already tagged
      
      const searchText = `${tx.merchant} ${tx.description}`.toLowerCase();
      
      for (const rule of rules) {
        if (searchText.includes(rule.contains.toLowerCase())) {
          await updateTransaction(tx.id, { 
            tag: rule.tag,
            status: rule.tag === "reimbursable" ? "draft" : undefined
          });
          applied++;
          break;
        }
      }
    }
    
    alert(`Applied rules to ${applied} transactions`);
  };

  const getTagBadge = (tag: Exclude<TransactionTag, null>) => {
    switch (tag) {
      case "reimbursable":
        return <Badge className="bg-green-500/10 text-green-500">Reimbursable</Badge>;
      case "personal":
        return <Badge className="bg-blue-500/10 text-blue-500">Personal</Badge>;
      case "ignore":
        return <Badge className="bg-gray-500/10 text-gray-500">Ignore</Badge>;
    }
  };

  const untaggedCount = transactions.filter((t) => !t.tag).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Auto-Tagging Rules</CardTitle>
              <CardDescription>
                Create rules to automatically tag transactions
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 flex-1 overflow-auto">
          {/* Add new rule */}
          <div className="space-y-4 mb-6 pb-6 border-b">
            <div className="space-y-2">
              <Label>If merchant/description contains:</Label>
              <Input
                placeholder="e.g., UBER, MARRIOTT, CAREEM"
                value={newContains}
                onChange={(e) => setNewContains(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Then tag as:</Label>
              <div className="flex gap-2">
                <Button
                  variant={newTag === "reimbursable" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewTag("reimbursable")}
                >
                  Reimbursable
                </Button>
                <Button
                  variant={newTag === "personal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewTag("personal")}
                >
                  Personal
                </Button>
                <Button
                  variant={newTag === "ignore" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewTag("ignore")}
                >
                  Ignore
                </Button>
              </div>
            </div>
            
            <Button onClick={handleAddRule} disabled={!newContains.trim()} className="w-full">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Rule
            </Button>
          </div>
          
          {/* Existing rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Your Rules ({rules.length})</h4>
              {rules.length > 0 && untaggedCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleApplyRules}>
                  Apply to {untaggedCount} untagged
                </Button>
              )}
            </div>
            
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No rules yet. Add a rule above to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono">&quot;{rule.contains}&quot;</span>
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      {getTagBadge(rule.tag)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Common suggestions */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-3">Quick Add Common Rules</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { contains: "UBER", tag: "personal" as const },
                { contains: "CAREEM", tag: "personal" as const },
                { contains: "MARRIOTT", tag: "reimbursable" as const },
                { contains: "HILTON", tag: "reimbursable" as const },
                { contains: "EMIRATES", tag: "reimbursable" as const },
                { contains: "AMAZON", tag: "personal" as const },
              ].filter(
                (suggestion) => !rules.some((r) => r.contains.toLowerCase() === suggestion.contains.toLowerCase())
              ).map((suggestion) => (
                <Button
                  key={suggestion.contains}
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await addRule({
                      id: uuidv4(),
                      contains: suggestion.contains,
                      tag: suggestion.tag,
                    });
                  }}
                >
                  {suggestion.contains} → {suggestion.tag}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

