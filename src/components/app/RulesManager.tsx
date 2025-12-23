"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { v4 as uuidv4 } from "uuid";
import { ruleMatchesTransaction, getRuleTag } from "@/lib/types";
import type { Rule, RuleCondition, TransactionTag } from "@/lib/types";

interface RulesManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ConditionField = "merchant" | "description" | "amount" | "currency";
type ConditionOperator = "contains" | "equals" | "startsWith" | "greaterThan" | "lessThan";

export function RulesManager({ isOpen, onClose }: RulesManagerProps) {
  const { rules, addRule, deleteRule, transactions, updateTransaction } = useApp();
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Simple rule state
  const [newContains, setNewContains] = useState("");
  const [newTag, setNewTag] = useState<Exclude<TransactionTag, null>>("reimbursable");

  // Advanced rule state
  const [advancedName, setAdvancedName] = useState("");
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { field: "merchant", operator: "contains", value: "" }
  ]);
  const [advancedTag, setAdvancedTag] = useState<Exclude<TransactionTag, null>>("reimbursable");

  if (!isOpen) return null;

  const handleAddSimpleRule = async () => {
    if (!newContains.trim()) return;

    const rule: Rule = {
      id: uuidv4(),
      contains: newContains.trim(),
      tag: newTag,
      conditions: [],
      action: { tag: newTag },
    };

    await addRule(rule);
    setNewContains("");
  };

  const handleAddAdvancedRule = async () => {
    const validConditions = conditions.filter(c => c.value !== "" && c.value !== 0);
    if (validConditions.length === 0) return;

    const rule: Rule = {
      id: uuidv4(),
      name: advancedName || undefined,
      conditions: validConditions,
      action: { tag: advancedTag },
    };

    await addRule(rule);
    setAdvancedName("");
    setConditions([{ field: "merchant", operator: "contains", value: "" }]);
    setShowAdvanced(false);
  };

  const handleDeleteRule = async (id: string) => {
    await deleteRule(id);
  };

  const handleApplyRules = async () => {
    let applied = 0;
    
    for (const tx of transactions) {
      if (tx.tag) continue; // Skip already tagged
      
      for (const rule of rules) {
        if (ruleMatchesTransaction(rule, tx)) {
          const tag = getRuleTag(rule);
          await updateTransaction(tx.id, { 
            tag,
            status: tag === "reimbursable" ? "draft" : undefined
          });
          applied++;
          break;
        }
      }
    }
    
    alert(`Applied rules to ${applied} transactions`);
  };

  const addCondition = () => {
    setConditions([...conditions, { field: "merchant", operator: "contains", value: "" }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setConditions(conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)));
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

  const getRuleDescription = (rule: Rule): string => {
    if (rule.contains) {
      return `Contains "${rule.contains}"`;
    }
    if (rule.conditions && rule.conditions.length > 0) {
      return rule.conditions.map(c => {
        const opLabels: Record<string, string> = {
          contains: "contains",
          equals: "equals",
          startsWith: "starts with",
          greaterThan: ">",
          lessThan: "<",
        };
        return `${c.field} ${opLabels[c.operator]} "${c.value}"`;
      }).join(" AND ");
    }
    return "No conditions";
  };

  const untaggedCount = transactions.filter((t) => !t.tag).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
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
          {/* Toggle between simple and advanced */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={!showAdvanced ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAdvanced(false)}
            >
              Simple Rule
            </Button>
            <Button
              variant={showAdvanced ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAdvanced(true)}
            >
              Advanced Rule
            </Button>
          </div>

          {/* Simple Rule Builder */}
          {!showAdvanced && (
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
              
              <Button onClick={handleAddSimpleRule} disabled={!newContains.trim()} className="w-full">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Rule
              </Button>
            </div>
          )}

          {/* Advanced Rule Builder */}
          {showAdvanced && (
            <div className="space-y-4 mb-6 pb-6 border-b">
              <div className="space-y-2">
                <Label>Rule Name (optional)</Label>
                <Input
                  placeholder="e.g., Hotel Bookings"
                  value={advancedName}
                  onChange={(e) => setAdvancedName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Conditions (all must match)</Label>
                {conditions.map((condition, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(index, { field: e.target.value as ConditionField })}
                      className="text-sm border rounded px-2 py-1.5 bg-background"
                    >
                      <option value="merchant">Merchant</option>
                      <option value="description">Description</option>
                      <option value="amount">Amount</option>
                      <option value="currency">Currency</option>
                    </select>
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, { operator: e.target.value as ConditionOperator })}
                      className="text-sm border rounded px-2 py-1.5 bg-background"
                    >
                      <option value="contains">contains</option>
                      <option value="equals">equals</option>
                      <option value="startsWith">starts with</option>
                      {condition.field === "amount" && (
                        <>
                          <option value="greaterThan">greater than</option>
                          <option value="lessThan">less than</option>
                        </>
                      )}
                    </select>
                    <Input
                      type={condition.field === "amount" ? "number" : "text"}
                      placeholder="Value..."
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { 
                        value: condition.field === "amount" ? Number(e.target.value) : e.target.value 
                      })}
                      className="flex-1"
                    />
                    {conditions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(index)}
                        className="text-destructive"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addCondition}>
                  + Add Condition
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label>Then tag as:</Label>
                <div className="flex gap-2">
                  <Button
                    variant={advancedTag === "reimbursable" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdvancedTag("reimbursable")}
                  >
                    Reimbursable
                  </Button>
                  <Button
                    variant={advancedTag === "personal" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdvancedTag("personal")}
                  >
                    Personal
                  </Button>
                  <Button
                    variant={advancedTag === "ignore" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdvancedTag("ignore")}
                  >
                    Ignore
                  </Button>
                </div>
              </div>
              
              <Button 
                onClick={handleAddAdvancedRule} 
                disabled={conditions.every(c => c.value === "" || c.value === 0)} 
                className="w-full"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Advanced Rule
              </Button>
            </div>
          )}
          
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
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        {rule.name && (
                          <p className="text-sm font-medium truncate">{rule.name}</p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {getRuleDescription(rule)}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      {getTagBadge(getRuleTag(rule))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-destructive hover:text-destructive ml-2"
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
                { contains: "NETFLIX", tag: "personal" as const },
                { contains: "ZOOM", tag: "reimbursable" as const },
              ].filter(
                (suggestion) => !rules.some((r) => 
                  r.contains?.toLowerCase() === suggestion.contains.toLowerCase()
                )
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
                      conditions: [],
                      action: { tag: suggestion.tag },
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
