"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { RulesManager } from "./RulesManager";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, TransactionTag } from "@/lib/types";

export function TransactionsTab() {
  const { transactions, updateTransaction, isLoading, rules, addRule } = useApp();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<TransactionTag | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRulesManager, setShowRulesManager] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const matches =
            tx.merchant.toLowerCase().includes(searchLower) ||
            tx.description.toLowerCase().includes(searchLower);
          if (!matches) return false;
        }
        // Tag filter
        if (tagFilter !== "all") {
          if (tagFilter === null && tx.tag !== null) return false;
          if (tagFilter !== null && tx.tag !== tagFilter) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, search, tagFilter]);

  const handleTagChange = async (id: string, tag: TransactionTag) => {
    const updates: Partial<Transaction> = { tag };
    if (tag === "reimbursable") {
      updates.status = "draft";
    } else {
      updates.status = undefined;
    }
    await updateTransaction(id, updates);
  };

  const handleBulkTag = async (tag: TransactionTag) => {
    for (const id of selectedIds) {
      await handleTagChange(id, tag);
    }
    setSelectedIds(new Set());
  };

  const handleCreateRuleFromSelection = async () => {
    if (selectedIds.size === 0) return;

    // Get the first selected transaction
    const firstId = Array.from(selectedIds)[0];
    const tx = transactions.find((t) => t.id === firstId);
    if (!tx) return;

    // Extract a keyword from the merchant
    const keyword = tx.merchant.split(" ")[0];
    const promptKeyword = prompt(
      "Create a rule for transactions containing:",
      keyword
    );

    if (!promptKeyword) return;

    const tag = tx.tag || "reimbursable";
    await addRule({
      id: uuidv4(),
      contains: promptKeyword,
      tag: tag as Exclude<TransactionTag, null>,
    });

    alert(`Rule created: "${promptKeyword}" → ${tag}`);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((tx) => tx.id)));
    }
  };

  const getTagBadge = (tag: TransactionTag) => {
    switch (tag) {
      case "reimbursable":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Reimbursable</Badge>;
      case "personal":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Personal</Badge>;
      case "ignore":
        return <Badge className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20">Ignore</Badge>;
      default:
        return <Badge variant="outline">Untagged</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2);
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-2">
            View, search, and tag all imported transactions
          </p>
        </div>
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
            <p className="text-muted-foreground text-sm">
              Import a statement to see your transactions here
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-2">
            View, search, and tag all imported transactions
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowRulesManager(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Rules ({rules.length})
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search merchants, descriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={tagFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTagFilter("all")}
              >
                All ({transactions.length})
              </Button>
              <Button
                variant={tagFilter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setTagFilter(null)}
              >
                Untagged ({transactions.filter((t) => !t.tag).length})
              </Button>
              <Button
                variant={tagFilter === "reimbursable" ? "default" : "outline"}
                size="sm"
                onClick={() => setTagFilter("reimbursable")}
              >
                Reimbursable ({transactions.filter((t) => t.tag === "reimbursable").length})
              </Button>
              <Button
                variant={tagFilter === "personal" ? "default" : "outline"}
                size="sm"
                onClick={() => setTagFilter("personal")}
              >
                Personal ({transactions.filter((t) => t.tag === "personal").length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => handleBulkTag("reimbursable")}>
                  Tag Reimbursable
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkTag("personal")}>
                  Tag Personal
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkTag("ignore")}>
                  Tag Ignore
                </Button>
                <Button size="sm" variant="outline" onClick={handleCreateRuleFromSelection}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Create Rule
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">All Transactions</CardTitle>
              <CardDescription>
                {filteredTransactions.length} of {transactions.length} transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                      onChange={selectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Merchant</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Tag</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => toggleSelect(tx.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tx.date}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{tx.merchant}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs" title={tx.description}>
                        {tx.description.substring(0, 50)}{tx.description.length > 50 ? "..." : ""}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-mono ${tx.amount >= 0 ? "text-green-500" : "text-foreground"}`}>
                      {formatAmount(tx.amount)} {tx.currency}
                    </td>
                    <td className="px-4 py-3 text-center">{getTagBadge(tx.tag)}</td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={tx.tag || ""}
                        onChange={(e) => handleTagChange(tx.id, (e.target.value || null) as TransactionTag)}
                        className="text-sm bg-transparent border rounded px-2 py-1"
                      >
                        <option value="">Untagged</option>
                        <option value="reimbursable">Reimbursable</option>
                        <option value="personal">Personal</option>
                        <option value="ignore">Ignore</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Rules Manager Modal */}
      <RulesManager isOpen={showRulesManager} onClose={() => setShowRulesManager(false)} />
    </div>
  );
}
