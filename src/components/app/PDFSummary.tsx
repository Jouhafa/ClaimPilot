"use client";

import { useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Transaction } from "@/lib/types";

interface PDFSummaryProps {
  transactions: Transaction[];
  batchName?: string;
  onClose: () => void;
}

export function PDFSummary({ transactions, batchName, onClose }: PDFSummaryProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const summary = useMemo(() => {
    const reimbursables = transactions.filter((t) => t.tag === "reimbursable" && !t.isSplit);
    
    const byStatus = {
      draft: reimbursables.filter((t) => !t.status || t.status === "draft"),
      submitted: reimbursables.filter((t) => t.status === "submitted"),
      paid: reimbursables.filter((t) => t.status === "paid"),
    };

    const byCurrency = new Map<string, number>();
    reimbursables.forEach((t) => {
      const current = byCurrency.get(t.currency) || 0;
      byCurrency.set(t.currency, current + Math.abs(t.amount));
    });

    const total = reimbursables.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return { reimbursables, byStatus, byCurrency, total };
  }, [transactions]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to generate the PDF");
      return;
    }

    const styles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .header p { color: #666; font-size: 14px; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .summary-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; }
        .summary-card h3 { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .summary-card .value { font-size: 28px; font-weight: bold; }
        .summary-card .sub { font-size: 12px; color: #666; margin-top: 4px; }
        .table-section { margin-bottom: 30px; }
        .table-section h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; padding: 10px; background: #f5f5f5; border-bottom: 2px solid #e5e5e5; font-weight: 600; }
        td { padding: 10px; border-bottom: 1px solid #e5e5e5; }
        .amount { text-align: right; font-family: monospace; }
        .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .status-draft { background: #fef3c7; color: #92400e; }
        .status-submitted { background: #dbeafe; color: #1e40af; }
        .status-paid { background: #d1fae5; color: #065f46; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666; font-size: 11px; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reimbursement Report${batchName ? ` - ${batchName}` : ""}</title>
          ${styles}
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle>PDF Summary Preview</CardTitle>
            <CardDescription>Review before printing to PDF</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save as PDF
            </Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-6">
          {/* Printable Content */}
          <div ref={printRef} className="bg-white text-black p-8 rounded-lg">
            {/* Header */}
            <div className="header text-center mb-8">
              <h1 className="text-2xl font-bold mb-1">Reimbursement Report</h1>
              <p className="text-muted-foreground">
                {batchName ? batchName : `Generated on ${formatDate(new Date())}`}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid grid grid-cols-3 gap-4 mb-8">
              <div className="summary-card border rounded-lg p-4">
                <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Total Amount</h3>
                <div className="value text-3xl font-bold">{summary.total.toFixed(2)}</div>
                <div className="sub text-sm text-muted-foreground">{summary.reimbursables.length} transactions</div>
              </div>
              <div className="summary-card border rounded-lg p-4">
                <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Status Breakdown</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Draft</span>
                    <span className="font-mono">{summary.byStatus.draft.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Submitted</span>
                    <span className="font-mono">{summary.byStatus.submitted.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Paid</span>
                    <span className="font-mono">{summary.byStatus.paid.length}</span>
                  </div>
                </div>
              </div>
              <div className="summary-card border rounded-lg p-4">
                <h3 className="text-xs text-muted-foreground uppercase tracking-wide mb-2">By Currency</h3>
                <div className="space-y-1">
                  {Array.from(summary.byCurrency.entries()).map(([currency, total]) => (
                    <div key={currency} className="flex justify-between text-sm">
                      <span>{currency}</span>
                      <span className="font-mono">{total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="table-section mb-8">
              <h2 className="text-lg font-semibold mb-3">Transaction Details</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Merchant</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-right p-3 font-medium">Amount</th>
                    <th className="text-center p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.reimbursables.map((tx) => (
                    <tr key={tx.id} className="border-b">
                      <td className="p-3 text-muted-foreground">{tx.date}</td>
                      <td className="p-3 font-medium">{tx.merchant}</td>
                      <td className="p-3 text-muted-foreground truncate max-w-[200px]" title={tx.description}>
                        {tx.description.substring(0, 40)}{tx.description.length > 40 ? "..." : ""}
                      </td>
                      <td className="amount p-3 text-right font-mono">{Math.abs(tx.amount).toFixed(2)} {tx.currency}</td>
                      <td className="p-3 text-center">
                        <span className={`status inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          tx.status === "paid" 
                            ? "status-paid bg-green-100 text-green-700" 
                            : tx.status === "submitted" 
                            ? "status-submitted bg-blue-100 text-blue-700" 
                            : "status-draft bg-yellow-100 text-yellow-700"
                        }`}>
                          {tx.status || "draft"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={3} className="p-3 text-right">Total:</td>
                    <td className="p-3 text-right font-mono">{summary.total.toFixed(2)} AED</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="footer pt-6 border-t text-center text-xs text-muted-foreground">
              <p>Generated by ClaimPilot • {formatDate(new Date())}</p>
              <p className="mt-1">This is an auto-generated report for reimbursement purposes.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

