"use client";

import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { getCategoryBreakdown, getFixedVsVariable, getCashflowSummary, getTopMerchants } from "@/lib/categories";
import { getRecurringSummary } from "@/lib/recurringDetector";
import { CATEGORY_CONFIG } from "@/lib/types";

interface SpendingSummaryExportProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpendingSummaryExport({ isOpen, onClose }: SpendingSummaryExportProps) {
  const { transactions, recurring, incomeConfig } = useApp();
  const printRef = useRef<HTMLDivElement>(null);

  const categoryBreakdown = useMemo(() => getCategoryBreakdown(transactions), [transactions]);
  const fixedVsVariable = useMemo(() => getFixedVsVariable(transactions), [transactions]);
  const cashflow = useMemo(() => getCashflowSummary(transactions), [transactions]);
  const topMerchants = useMemo(() => getTopMerchants(transactions, 5), [transactions]);
  const recurringSummary = useMemo(() => getRecurringSummary(recurring), [recurring]);

  const totalSpend = useMemo(() => {
    return transactions
      .filter(tx => tx.amount < 0 && !tx.parentId)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [transactions]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Spending Summary - ClaimPilot</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
            .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
            .stat-card { background: #f9fafb; border-radius: 8px; padding: 16px; }
            .stat-label { font-size: 12px; color: #6b7280; }
            .stat-value { font-size: 24px; font-weight: bold; }
            .stat-desc { font-size: 12px; color: #9ca3af; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
            th { font-size: 12px; color: #6b7280; font-weight: 500; }
            td { font-size: 14px; }
            .amount { font-family: monospace; text-align: right; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
            .bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 4px; }
            .bar-fill { height: 100%; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportCSV = () => {
    const rows = [
      ["Category", "Amount (AED)", "Count", "Percentage"],
      ...categoryBreakdown.map(c => [
        c.label,
        c.total.toFixed(2),
        c.count.toString(),
        `${c.percentage.toFixed(1)}%`
      ]),
      [],
      ["Top Merchants", "Amount (AED)", "Count", "Category"],
      ...topMerchants.map(m => [
        m.merchant,
        m.total.toFixed(2),
        m.count.toString(),
        CATEGORY_CONFIG[m.category]?.label || m.category
      ]),
      [],
      ["Summary", "Value"],
      ["Total Spending", totalSpend.toFixed(2)],
      ["Fixed Costs", fixedVsVariable.fixed.total.toFixed(2)],
      ["Variable Costs", fixedVsVariable.variable.total.toFixed(2)],
      ["Monthly Recurring", recurringSummary.totalMonthly.toFixed(2)],
    ];

    const csv = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spending-summary-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle>Spending Summary</CardTitle>
            <CardDescription>Free monthly overview of your spending</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6">
          <div ref={printRef}>
            <h1>Spending Summary</h1>
            <p className="subtitle">Generated by ClaimPilot • {currentMonth}</p>

            {/* Summary Stats */}
            <div className="grid">
              <div className="stat-card">
                <p className="stat-label">Total Spending</p>
                <p className="stat-value">{totalSpend.toLocaleString()} AED</p>
                <p className="stat-desc">{transactions.filter(tx => tx.amount < 0).length} transactions</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Fixed Costs</p>
                <p className="stat-value">{fixedVsVariable.fixed.total.toLocaleString()} AED</p>
                <p className="stat-desc">{((fixedVsVariable.fixed.total / totalSpend) * 100).toFixed(0)}% of spending</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Variable Costs</p>
                <p className="stat-value">{fixedVsVariable.variable.total.toLocaleString()} AED</p>
                <p className="stat-desc">{((fixedVsVariable.variable.total / totalSpend) * 100).toFixed(0)}% of spending</p>
              </div>
            </div>

            {/* Category Breakdown */}
            <h2>Spending by Category</h2>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Transactions</th>
                  <th className="amount">Amount</th>
                  <th className="amount">%</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.slice(0, 10).map(({ category, label, total, count, percentage, color }) => (
                  <tr key={category}>
                    <td>
                      <span style={{ 
                        display: "inline-block", 
                        width: 8, 
                        height: 8, 
                        borderRadius: "50%", 
                        backgroundColor: color,
                        marginRight: 8 
                      }} />
                      {label}
                    </td>
                    <td>{count}</td>
                    <td className="amount">{total.toLocaleString()} AED</td>
                    <td className="amount">{percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Top Merchants */}
            <h2>Top Merchants</h2>
            <table>
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Visits</th>
                  <th className="amount">Total</th>
                </tr>
              </thead>
              <tbody>
                {topMerchants.map(({ merchant, category, total, count }) => (
                  <tr key={merchant}>
                    <td>{merchant}</td>
                    <td>{CATEGORY_CONFIG[category]?.label || category}</td>
                    <td>{count}</td>
                    <td className="amount">{total.toLocaleString()} AED</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Recurring */}
            {recurringSummary.activeCount > 0 && (
              <>
                <h2>Recurring Costs</h2>
                <div className="grid">
                  <div className="stat-card">
                    <p className="stat-label">Monthly Recurring</p>
                    <p className="stat-value">{recurringSummary.totalMonthly.toLocaleString()} AED</p>
                    <p className="stat-desc">{recurringSummary.activeCount} subscriptions</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Yearly Projection</p>
                    <p className="stat-value">{recurringSummary.totalYearly.toLocaleString()} AED</p>
                    <p className="stat-desc">Based on current recurring</p>
                  </div>
                </div>
              </>
            )}

            <div className="footer">
              <p>Generated by ClaimPilot • {new Date().toLocaleDateString()}</p>
              <p>This is a summary report. For detailed transactions, upgrade to paid.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

