import type { Transaction } from "./types";

export type ExportPreset = "simple" | "concur" | "expensify";

export interface PresetConfig {
  name: string;
  description: string;
  columns: string[];
  mapRow: (tx: Transaction) => Record<string, string | number>;
}

export const EXPORT_PRESETS: Record<ExportPreset, PresetConfig> = {
  simple: {
    name: "Simple Finance CSV",
    description: "Basic format for most finance teams",
    columns: ["Date", "Merchant", "Description", "Amount", "Currency", "Status"],
    mapRow: (tx) => ({
      Date: tx.date,
      Merchant: tx.merchant,
      Description: tx.description,
      Amount: Math.abs(tx.amount).toFixed(2),
      Currency: tx.currency,
      Status: tx.status || "draft",
    }),
  },
  concur: {
    name: "Concur-Style CSV",
    description: "Compatible with SAP Concur format",
    columns: [
      "Report Date",
      "Expense Type",
      "Vendor",
      "Transaction Date",
      "Amount",
      "Currency",
      "Receipt Status",
      "Comment",
    ],
    mapRow: (tx) => ({
      "Report Date": new Date().toISOString().split("T")[0],
      "Expense Type": "Business Expense",
      Vendor: tx.merchant,
      "Transaction Date": tx.date,
      Amount: Math.abs(tx.amount).toFixed(2),
      Currency: tx.currency,
      "Receipt Status": "Receipt Required",
      Comment: tx.description,
    }),
  },
  expensify: {
    name: "Expensify-Style CSV",
    description: "Compatible with Expensify format",
    columns: [
      "Merchant",
      "Created",
      "Amount",
      "Category",
      "Tag",
      "Comment",
      "Reimbursable",
    ],
    mapRow: (tx) => ({
      Merchant: tx.merchant,
      Created: tx.date,
      Amount: Math.abs(tx.amount).toFixed(2),
      Category: "Travel & Business",
      Tag: tx.status || "draft",
      Comment: tx.description,
      Reimbursable: "yes",
    }),
  },
};

export function exportToPresetCSV(transactions: Transaction[], preset: ExportPreset): string {
  const config = EXPORT_PRESETS[preset];
  const reimbursables = transactions.filter((t) => t.tag === "reimbursable");
  
  if (reimbursables.length === 0) return "";

  // Header row
  const header = config.columns.join(",");
  
  // Data rows
  const rows = reimbursables.map((tx) => {
    const mapped = config.mapRow(tx);
    return config.columns.map((col) => {
      const value = mapped[col];
      // Escape commas and quotes
      if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(",");
  });

  // Add summary section
  const total = reimbursables.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const summary = [
    "",
    `Total Items,${reimbursables.length}`,
    `Total Amount,${total.toFixed(2)}`,
    `Export Date,${new Date().toISOString().split("T")[0]}`,
    `Format,${config.name}`,
  ];

  return [header, ...rows, ...summary].join("\n");
}

export function downloadPresetCSV(content: string, preset: ExportPreset): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `reimbursements-${preset}-${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

