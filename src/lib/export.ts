import type { Transaction } from "./types";
import * as XLSX from "xlsx";

export interface ExportSummary {
  byStatus: {
    draft: { count: number; total: number };
    submitted: { count: number; total: number };
    paid: { count: number; total: number };
  };
  byMonth: { month: string; count: number; total: number }[];
  grandTotal: number;
  totalCount: number;
}

export function calculateSummary(transactions: Transaction[]): ExportSummary {
  const reimbursables = transactions.filter((t) => t.tag === "reimbursable");

  // By status
  const byStatus = {
    draft: { count: 0, total: 0 },
    submitted: { count: 0, total: 0 },
    paid: { count: 0, total: 0 },
  };

  reimbursables.forEach((t) => {
    const status = t.status || "draft";
    byStatus[status].count++;
    byStatus[status].total += Math.abs(t.amount);
  });

  // By month
  const monthMap = new Map<string, { count: number; total: number }>();
  reimbursables.forEach((t) => {
    const month = t.date.substring(0, 7); // YYYY-MM
    const existing = monthMap.get(month) || { count: 0, total: 0 };
    existing.count++;
    existing.total += Math.abs(t.amount);
    monthMap.set(month, existing);
  });

  const byMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => b.month.localeCompare(a.month));

  return {
    byStatus,
    byMonth,
    grandTotal: reimbursables.reduce((sum, t) => sum + Math.abs(t.amount), 0),
    totalCount: reimbursables.length,
  };
}

export function exportToCSV(transactions: Transaction[], includeAll: boolean = false): string {
  const data = includeAll
    ? transactions
    : transactions.filter((t) => t.tag === "reimbursable");

  if (data.length === 0) {
    return "";
  }

  const headers = ["Date", "Merchant", "Description", "Amount", "Currency", "Status"];
  const rows = data.map((t) => [
    t.date,
    t.merchant,
    `"${t.description.replace(/"/g, '""')}"`,
    Math.abs(t.amount).toFixed(2),
    t.currency,
    t.status || "draft",
  ]);

  // Add summary
  const summary = calculateSummary(transactions);
  rows.push([]);
  rows.push(["--- Summary ---"]);
  rows.push(["Draft", "", "", summary.byStatus.draft.total.toFixed(2), "AED", `${summary.byStatus.draft.count} items`]);
  rows.push(["Submitted", "", "", summary.byStatus.submitted.total.toFixed(2), "AED", `${summary.byStatus.submitted.count} items`]);
  rows.push(["Paid", "", "", summary.byStatus.paid.total.toFixed(2), "AED", `${summary.byStatus.paid.count} items`]);
  rows.push([]);
  rows.push(["Total", "", "", summary.grandTotal.toFixed(2), "AED", `${summary.totalCount} items`]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportToExcel(transactions: Transaction[]): Blob {
  const data = transactions.filter((t) => t.tag === "reimbursable");
  const summary = calculateSummary(transactions);

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Transactions sheet
  const txData = data.map((t) => ({
    Date: t.date,
    Merchant: t.merchant,
    Description: t.description,
    Amount: Math.abs(t.amount),
    Currency: t.currency,
    Status: t.status || "draft",
  }));
  const txSheet = XLSX.utils.json_to_sheet(txData);
  XLSX.utils.book_append_sheet(wb, txSheet, "Transactions");

  // Summary sheet
  const summaryData = [
    { Category: "Draft", Count: summary.byStatus.draft.count, Total: summary.byStatus.draft.total },
    { Category: "Submitted", Count: summary.byStatus.submitted.count, Total: summary.byStatus.submitted.total },
    { Category: "Paid", Count: summary.byStatus.paid.count, Total: summary.byStatus.paid.total },
    { Category: "", Count: "", Total: "" },
    { Category: "Grand Total", Count: summary.totalCount, Total: summary.grandTotal },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Monthly breakdown sheet
  const monthlyData = summary.byMonth.map((m) => ({
    Month: m.month,
    Count: m.count,
    Total: m.total,
  }));
  if (monthlyData.length > 0) {
    const monthlySheet = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, monthlySheet, "By Month");
  }

  // Generate blob
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function downloadExcel(blob: Blob, filename: string): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

