"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { CATEGORY_CONFIG } from "@/lib/types";
import type { Transaction, TransactionCategory } from "@/lib/types";

interface Anomaly {
  id: string;
  type: "high_spend" | "new_merchant" | "duplicate" | "large_transaction" | "price_increase";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  amount?: number;
  transaction?: Transaction;
  relatedTransactions?: Transaction[];
}

export function AnomaliesPanel() {
  const { transactions, recurring } = useApp();

  const anomalies = useMemo(() => {
    const results: Anomaly[] = [];
    
    // Filter to only expenses and non-split-children
    const expenses = transactions.filter(tx => tx.amount < 0 && !tx.parentId);
    
    // Get current month transactions
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const currentMonth = expenses.filter(tx => new Date(tx.date) >= currentMonthStart);
    const previousMonth = expenses.filter(tx => {
      const d = new Date(tx.date);
      return d >= previousMonthStart && d <= previousMonthEnd;
    });

    // 1. High spend by category (>1.5x previous month)
    const currentByCategory: Record<string, number> = {};
    const previousByCategory: Record<string, number> = {};
    
    currentMonth.forEach(tx => {
      const cat = tx.category || "other";
      currentByCategory[cat] = (currentByCategory[cat] || 0) + Math.abs(tx.amount);
    });
    
    previousMonth.forEach(tx => {
      const cat = tx.category || "other";
      previousByCategory[cat] = (previousByCategory[cat] || 0) + Math.abs(tx.amount);
    });

    Object.entries(currentByCategory).forEach(([cat, current]) => {
      const previous = previousByCategory[cat] || 0;
      if (previous > 0 && current > previous * 1.5) {
        const increase = ((current - previous) / previous) * 100;
        results.push({
          id: `high_spend_${cat}`,
          type: "high_spend",
          severity: increase > 100 ? "high" : "medium",
          title: `${CATEGORY_CONFIG[cat as TransactionCategory]?.label || cat} spending up ${increase.toFixed(0)}%`,
          description: `You spent ${current.toFixed(0)} AED this month vs ${previous.toFixed(0)} AED last month`,
          amount: current - previous,
        });
      }
    });

    // 2. New merchants (first time this month)
    const allMerchantsBefore = new Set(
      transactions
        .filter(tx => new Date(tx.date) < currentMonthStart)
        .map(tx => tx.merchant.toLowerCase())
    );
    
    const newMerchantsThisMonth = new Map<string, Transaction[]>();
    currentMonth.forEach(tx => {
      const merchantLower = tx.merchant.toLowerCase();
      if (!allMerchantsBefore.has(merchantLower)) {
        if (!newMerchantsThisMonth.has(merchantLower)) {
          newMerchantsThisMonth.set(merchantLower, []);
        }
        newMerchantsThisMonth.get(merchantLower)!.push(tx);
      }
    });

    // Only flag new merchants with significant spend (>100 AED total)
    newMerchantsThisMonth.forEach((txs, merchantLower) => {
      const total = txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      if (total > 100) {
        results.push({
          id: `new_merchant_${merchantLower}`,
          type: "new_merchant",
          severity: "low",
          title: `New merchant: ${txs[0].merchant}`,
          description: `First time spending here - ${txs.length} transaction(s) totaling ${total.toFixed(0)} AED`,
          amount: total,
          transaction: txs[0],
          relatedTransactions: txs,
        });
      }
    });

    // 3. Potential duplicates (same merchant, amount, close dates)
    const potentialDupes = new Map<string, Transaction[]>();
    expenses.forEach(tx => {
      const key = `${tx.merchant.toLowerCase()}-${Math.abs(tx.amount).toFixed(0)}`;
      if (!potentialDupes.has(key)) {
        potentialDupes.set(key, []);
      }
      potentialDupes.get(key)!.push(tx);
    });

    potentialDupes.forEach((txs, key) => {
      if (txs.length >= 2) {
        // Check if any are within 3 days of each other
        const sorted = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        for (let i = 1; i < sorted.length; i++) {
          const daysDiff = Math.abs(
            (new Date(sorted[i].date).getTime() - new Date(sorted[i-1].date).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysDiff <= 3 && daysDiff > 0) {
            results.push({
              id: `duplicate_${sorted[i].id}`,
              type: "duplicate",
              severity: "medium",
              title: `Possible duplicate: ${sorted[i].merchant}`,
              description: `Two charges of ${Math.abs(sorted[i].amount).toFixed(0)} AED within ${daysDiff.toFixed(0)} days`,
              amount: Math.abs(sorted[i].amount),
              transaction: sorted[i],
              relatedTransactions: [sorted[i-1], sorted[i]],
            });
            break; // Only flag once per merchant-amount combo
          }
        }
      }
    });

    // 4. Large transactions (>500 AED single transaction)
    currentMonth.forEach(tx => {
      const amount = Math.abs(tx.amount);
      if (amount > 500) {
        // Check if this is a known recurring
        const isRecurring = recurring.some(r => 
          r.normalizedMerchant.toLowerCase() === tx.merchant.toLowerCase()
        );
        
        if (!isRecurring) {
          results.push({
            id: `large_${tx.id}`,
            type: "large_transaction",
            severity: amount > 1000 ? "medium" : "low",
            title: `Large transaction: ${tx.merchant}`,
            description: `${amount.toFixed(0)} AED on ${new Date(tx.date).toLocaleDateString("en-AE", { day: "numeric", month: "short" })}`,
            amount,
            transaction: tx,
          });
        }
      }
    });

    // 5. Price increases on recurring
    recurring.forEach(rec => {
      const recentTxs = transactions
        .filter(tx => 
          tx.merchant.toLowerCase() === rec.normalizedMerchant.toLowerCase() &&
          new Date(tx.date) >= currentMonthStart
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (recentTxs.length > 0) {
        const latestAmount = Math.abs(recentTxs[0].amount);
        const avgAmount = rec.averageAmount;
        const increase = ((latestAmount - avgAmount) / avgAmount) * 100;
        
        if (increase > 20) {
          results.push({
            id: `price_increase_${rec.id}`,
            type: "price_increase",
            severity: increase > 50 ? "high" : "medium",
            title: `${rec.normalizedMerchant} price increased`,
            description: `Now ${latestAmount.toFixed(0)} AED vs usual ${avgAmount.toFixed(0)} AED (+${increase.toFixed(0)}%)`,
            amount: latestAmount - avgAmount,
            transaction: recentTxs[0],
          });
        }
      }
    });

    // Sort by severity (high first) then by amount
    return results.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return (b.amount || 0) - (a.amount || 0);
    });
  }, [transactions, recurring]);

  const getSeverityColor = (severity: Anomaly["severity"]) => {
    switch (severity) {
      case "high": return "bg-red-500/10 text-red-500 border-red-500/30";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "low": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    }
  };

  const getTypeIcon = (type: Anomaly["type"]) => {
    switch (type) {
      case "high_spend":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case "new_merchant":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "duplicate":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case "large_transaction":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "price_increase":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
    }
  };

  if (anomalies.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <CardTitle className="text-lg">Attention Needed</CardTitle>
          <Badge variant="secondary">{anomalies.length}</Badge>
        </div>
        <CardDescription>Unusual patterns detected in your spending</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {anomalies.slice(0, 5).map((anomaly) => (
            <div
              key={anomaly.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(anomaly.severity)}`}
            >
              <div className="mt-0.5">
                {getTypeIcon(anomaly.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{anomaly.title}</p>
                <p className="text-sm opacity-80">{anomaly.description}</p>
              </div>
              {anomaly.amount && (
                <div className="text-right">
                  <p className="font-mono font-semibold">
                    {anomaly.type === "high_spend" || anomaly.type === "price_increase" ? "+" : ""}
                    {anomaly.amount.toFixed(0)} AED
                  </p>
                </div>
              )}
            </div>
          ))}
          {anomalies.length > 5 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              +{anomalies.length - 5} more alerts
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

