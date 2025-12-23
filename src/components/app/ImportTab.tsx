"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import { parseFile } from "@/lib/parsers";

export function ImportTab() {
  const { addTransactions, rules, transactions, deleteAllTransactions } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setSuccessCount(null);

    try {
      const parsed = await parseFile(file, rules);
      if (parsed.length === 0) {
        setError("No transactions found in the file. Please check the format.");
        return;
      }
      await addTransactions(parsed);
      setSuccessCount(parsed.length);
    } catch (err) {
      console.error("Parse error:", err);
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsProcessing(false);
    }
  }, [addTransactions, rules]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ""; // Reset input
  }, [handleFile]);

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to delete all transactions? This cannot be undone.")) {
      await deleteAllTransactions();
      setSuccessCount(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Statement</h1>
          <p className="text-muted-foreground mt-2">
            Upload your credit card statement to get started
          </p>
        </div>
        {transactions.length > 0 && (
          <Button variant="outline" onClick={handleClearAll} className="text-destructive">
            Clear All Data
          </Button>
        )}
      </div>

      {/* Stats */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Untagged</p>
              <p className="text-2xl font-bold text-yellow-500">
                {transactions.filter((t) => !t.tag).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Reimbursable</p>
              <p className="text-2xl font-bold text-green-500">
                {transactions.filter((t) => t.tag === "reimbursable").length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Card */}
      <Card className={`border-dashed transition-colors ${isDragging ? "border-primary bg-primary/5" : ""}`}>
        <CardContent className="pt-6">
          <div
            className="flex flex-col items-center justify-center py-12 text-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
              isDragging ? "bg-primary/20" : "bg-primary/10"
            }`}>
              {isProcessing ? (
                <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
            </div>
            
            <h3 className="text-lg font-semibold mb-2">
              {isProcessing ? "Processing..." : "Upload Statement"}
            </h3>
            
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              {isDragging
                ? "Drop the file here"
                : "Drag and drop your credit card statement here, or click to browse"}
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {successCount !== null && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
                Successfully imported {successCount} transactions!
              </div>
            )}

            <label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleFileInput}
                className="hidden"
                disabled={isProcessing}
              />
              <Button asChild disabled={isProcessing}>
                <span>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Select File
                </span>
              </Button>
            </label>
            
            <p className="text-xs text-muted-foreground mt-4">
              Supported: CSV, Excel (.xlsx), PDF
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to export your statement</CardTitle>
          <CardDescription>
            Follow these steps to download your credit card statement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
              <span>Log in to your bank&apos;s online banking or mobile app</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
              <span>Navigate to your credit card account and select &quot;Statements&quot;</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
              <span>Choose the statement period and click &quot;Download&quot; or &quot;Export&quot;</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">4</span>
              <span>Download as CSV, Excel, or PDF and save to your device</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
