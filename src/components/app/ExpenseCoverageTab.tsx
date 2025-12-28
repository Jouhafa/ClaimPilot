"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/context";
import { formatCurrency } from "@/lib/utils";
import { 
  detectLikelyWorkExpenses, 
  calculateExpenseCoverageGap 
} from "@/lib/expenseCoverage";
import { 
  loadExpenseCoverageConfig, 
  saveExpenseCoverageConfig,
  loadExpenseCoverageItems,
  saveExpenseCoverageItems 
} from "@/lib/storage";
import type { ExpenseCoverageItem, Transaction } from "@/lib/types";

export function ExpenseCoverageTab() {
  const { transactions, profile } = useApp();
  const [config, setConfig] = useState({ claimsSubmittedTotal: 0, lastAnalyzed: new Date().toISOString() });
  const [claimsSubmittedTotal, setClaimsSubmittedTotal] = useState(0);
  const [claimsSubmittedDate, setClaimsSubmittedDate] = useState("");
  const [detectedItems, setDetectedItems] = useState<ExpenseCoverageItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const currency = profile?.currency || "AED";

  // Load config and items
  useEffect(() => {
    loadExpenseCoverageConfig().then((loaded) => {
      if (loaded) {
        setConfig(loaded);
        setClaimsSubmittedTotal(loaded.claimsSubmittedTotal);
        setClaimsSubmittedDate(loaded.claimsSubmittedDate || "");
      }
    });
    loadExpenseCoverageItems().then(setDetectedItems);
  }, []);

  // Analyze transactions
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const items = detectLikelyWorkExpenses(transactions);
      setDetectedItems(items);
      await saveExpenseCoverageItems(items);
      await saveExpenseCoverageConfig({
        ...config,
        lastAnalyzed: new Date().toISOString(),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save claims submitted
  const handleSaveClaimsSubmitted = async () => {
    const updated = {
      ...config,
      claimsSubmittedTotal,
      claimsSubmittedDate: claimsSubmittedDate || new Date().toISOString(),
      lastAnalyzed: new Date().toISOString(),
    };
    await saveExpenseCoverageConfig(updated);
    setConfig(updated);
  };

  // Calculate gap
  const gap = useMemo(() => {
    return calculateExpenseCoverageGap(detectedItems, transactions, claimsSubmittedTotal);
  }, [detectedItems, transactions, claimsSubmittedTotal]);

  // Get transactions for detected items
  const detectedTransactions = useMemo(() => {
    return detectedItems
      .map(item => transactions.find(t => t.id === item.transactionId))
      .filter((t): t is Transaction => t !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [detectedItems, transactions]);

  // Export missing claims report
  const handleExportMissingClaims = () => {
    const missingTransactions = detectedTransactions.filter(tx => {
      const item = detectedItems.find(i => i.transactionId === tx.id);
      return item && (item.confidence === "high" || item.confidence === "medium");
    });

    if (missingTransactions.length === 0) {
      alert("No missing claims to export");
      return;
    }

    // Create CSV with relevant fields
    const csvRows = [
      ["Date", "Merchant", "Description", "Amount", "Currency", "Reason", "Confidence"].join(","),
      ...missingTransactions.map(tx => {
        const item = detectedItems.find(i => i.transactionId === tx.id);
        return [
          tx.date,
          `"${tx.merchant.replace(/"/g, '""')}"`,
          `"${tx.description.replace(/"/g, '""')}"`,
          Math.abs(tx.amount).toFixed(2),
          tx.currency,
          `"${(item?.reason || "").replace(/"/g, '""')}"`,
          item?.confidence || "low",
        ].join(",");
      }),
    ];

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `missing-claims-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
          Expense Coverage
        </h1>
        <p className="text-[15px] text-muted-foreground mt-2" style={{ lineHeight: 1.6 }}>
          Find work expenses you might have forgotten to claim
        </p>
      </div>

      {/* Gap Summary */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>
            Coverage Gap Analysis
          </CardTitle>
          <CardDescription>Compare detected expenses vs claims submitted</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Detected Work Expenses</p>
              <p className="text-lg font-semibold">
                {formatCurrency(gap.detectedTotal, currency, 0)}
              </p>
              <p className="text-xs text-muted-foreground">{detectedItems.length} items</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tagged Reimbursables</p>
              <p className="text-lg font-semibold">
                {formatCurrency(gap.taggedTotal, currency, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Claims Submitted</p>
              <p className="text-lg font-semibold">
                {formatCurrency(gap.claimsSubmittedTotal, currency, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Potential Gap</p>
              <p className={`text-lg font-bold ${gap.gap > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                {formatCurrency(gap.gap, currency, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claims Submitted Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>
            Claims Submitted
          </CardTitle>
          <CardDescription>Enter total amount you've submitted for reimbursement this month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="claimsTotal">Total Amount</Label>
              <Input
                id="claimsTotal"
                type="number"
                placeholder="0"
                value={claimsSubmittedTotal || ""}
                onChange={(e) => setClaimsSubmittedTotal(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="claimsDate">Date Submitted</Label>
              <Input
                id="claimsDate"
                type="date"
                value={claimsSubmittedDate.split("T")[0]}
                onChange={(e) => setClaimsSubmittedDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <Button onClick={handleSaveClaimsSubmitted}>
            Save
          </Button>
        </CardContent>
      </Card>

      {/* Likely Work Items Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>
                Likely Work Items Not Claimed
              </CardTitle>
              <CardDescription>
                {detectedItems.length} items detected that might be work-related
              </CardDescription>
            </div>
            <Button onClick={handleAnalyze} disabled={isAnalyzing} variant="outline">
              {isAnalyzing ? "Analyzing..." : "Re-analyze"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {detectedItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No likely work expenses detected. Click "Re-analyze" to scan your transactions.
              </p>
              <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? "Analyzing..." : "Analyze Transactions"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {detectedTransactions.map((tx) => {
                const item = detectedItems.find(i => i.transactionId === tx.id);
                if (!item) return null;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{tx.merchant}</span>
                        <Badge
                          variant={item.confidence === "high" ? "default" : item.confidence === "medium" ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {item.confidence}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tx.date} · {item.reason}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold">
                        {formatCurrency(Math.abs(tx.amount), currency, 2)}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          // Navigate to transactions tab with this transaction selected
                          window.location.href = `/app?tab=transactions&highlight=${tx.id}`;
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Missing Claims */}
      {detectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>
              Export Missing Claims Report
            </CardTitle>
            <CardDescription>Generate a CSV report of likely work expenses not yet claimed</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportMissingClaims} variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Missing Claims CSV
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

