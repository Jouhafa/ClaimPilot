"use client";

import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, TransactionCategory, TransactionStatus } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";
import { reconcilePendingTransactions, mergeTransaction } from "@/lib/reconciliation";
import { extractImageTextWithOCR, type OCRProgress } from "@/lib/pdfOCR";
import { parseScreenshotWithAI } from "@/lib/api";
import { autoTagTransactions } from "@/lib/autoTagger";
import { toast } from "sonner";

interface ExtractedTransaction {
  date: string;
  description: string;
  merchant: string;
  amount: number;
  currency: string;
  category?: TransactionCategory;
  tag?: Transaction["tag"];
  note?: string;
}

export function ManualTransactionTab() {
  const { transactions, accounts, selectedAccountId, profile, addTransactions, updateTransaction, rules, categoryRules } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split("T")[0],
    merchant: "",
    description: "",
    amount: 0,
    currency: profile?.currency || "AED",
    category: undefined,
    tag: null,
    note: "",
    transactionStatus: "pending" as TransactionStatus,
    isManual: true,
    accountId: selectedAccountId || undefined,
  });

  // Screenshot upload state
  const [isProcessingScreenshots, setIsProcessingScreenshots] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
  const [extractedTransactions, setExtractedTransactions] = useState<ExtractedTransaction[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currency = profile?.currency || "AED";

  // Get pending transactions
  const pendingTransactions = useMemo(() => {
    return transactions.filter(
      (tx) => tx.transactionStatus === "pending" || (tx.isManual && !tx.transactionStatus)
    );
  }, [transactions]);

  // Get confirmed transactions (for reconciliation check)
  const confirmedTransactions = useMemo(() => {
    return transactions.filter(
      (tx) => tx.transactionStatus === "confirmed" || (!tx.isManual && !tx.transactionStatus)
    );
  }, [transactions]);

  // Reconcile pending with confirmed
  const reconciliation = useMemo(() => {
    return reconcilePendingTransactions(pendingTransactions, confirmedTransactions);
  }, [pendingTransactions, confirmedTransactions]);

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      merchant: "",
      description: "",
      amount: 0,
      currency: currency,
      category: undefined,
      tag: null,
      note: "",
      transactionStatus: "pending" as TransactionStatus,
      isManual: true,
      accountId: selectedAccountId || undefined,
    });
  };

  const handleSave = async () => {
    if (!formData.merchant?.trim() || !formData.amount || formData.amount === 0) {
      alert("Please enter a merchant name and amount");
      return;
    }

    const transaction: Transaction = {
      id: uuidv4(),
      date: formData.date || new Date().toISOString().split("T")[0],
      merchant: formData.merchant.trim(),
      description: formData.description?.trim() || formData.merchant.trim(),
      amount: formData.amount || 0,
      currency: formData.currency || currency,
      category: formData.category,
      tag: formData.tag || null,
      note: formData.note?.trim(),
      transactionStatus: "pending" as TransactionStatus,
      isManual: true,
      accountId: formData.accountId,
      kind: formData.amount > 0 ? "income" : "spend",
      createdAt: new Date().toISOString(),
    };

    await addTransactions([transaction]);
    toast.success("Transaction Added", {
      description: "Your transaction has been added successfully.",
      action: {
        label: "Review Transactions",
        onClick: () => {
          // Navigate to review tab if onNavigate is available
          window.location.hash = "#review";
        },
      },
    });
    setIsAdding(false);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      merchant: "",
      description: "",
      amount: 0,
      currency: currency,
      category: undefined,
      tag: null,
      note: "",
      transactionStatus: "pending" as TransactionStatus,
      isManual: true,
      accountId: selectedAccountId || undefined,
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      merchant: "",
      description: "",
      amount: 0,
      currency: currency,
      category: undefined,
      tag: null,
      note: "",
      transactionStatus: "pending" as TransactionStatus,
      isManual: true,
      accountId: selectedAccountId || undefined,
    });
  };

  const handleMarkConfirmed = async (id: string) => {
    await updateTransaction(id, { transactionStatus: "confirmed" });
  };

  const handleReconcile = async () => {
    if (reconciliation.matched.length === 0) {
      alert("No pending transactions matched with imported transactions");
      return;
    }

    if (
      !confirm(
        `Found ${reconciliation.matched.length} matching transaction(s). This will merge pending transactions with imported ones. Continue?`
      )
    ) {
      return;
    }

    for (const { pending, imported } of reconciliation.matched) {
      const merged = mergeTransaction(pending, imported);
      // Update the imported transaction with merged data
      await updateTransaction(imported.id, merged);
      // Delete the pending transaction
      await updateTransaction(pending.id, { transactionStatus: "confirmed", isManual: false });
    }

    alert(`Reconciled ${reconciliation.matched.length} transaction(s)`);
  };

  // Handle screenshot upload
  const handleScreenshotUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessingScreenshots(true);
    setProcessingError(null);
    setOcrProgress(null);
    const allExtracted: ExtractedTransaction[] = [];

    try {
      // Process each image
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith("image/")) {
          setProcessingError(`File ${file.name} is not an image. Skipping.`);
          continue;
        }

        setOcrProgress({
          page: i + 1,
          totalPages: files.length,
          progress: (i / files.length) * 0.5, // 0-50% for OCR
          status: `Processing ${file.name}...`,
        });

        // Extract text with OCR
        const ocrText = await extractImageTextWithOCR(
          file,
          (progress) => {
            setOcrProgress({
              page: i + 1,
              totalPages: files.length,
              progress: (i / files.length) * 0.5 + (progress.progress * 0.3), // 50-80% range
              status: progress.status,
            });
          }
        );

        if (!ocrText || ocrText.trim().length < 10) {
          setProcessingError(`Could not extract text from ${file.name}. The image may be too blurry or contain no text.`);
          continue;
        }

        setOcrProgress({
          page: i + 1,
          totalPages: files.length,
          progress: 0.8,
          status: `Parsing transactions from ${file.name}...`,
        });

        // Parse with AI
        try {
          const parseResult = await parseScreenshotWithAI(ocrText);
          
          if (parseResult.success && parseResult.transactions.length > 0) {
            // Convert to ExtractedTransaction format with today's date
            const today = new Date().toISOString().split("T")[0];
            const extracted = parseResult.transactions.map((tx) => ({
              date: today, // Always use today's date for screenshots
              description: tx.description || tx.merchant || "",
              merchant: tx.merchant || "Unknown",
              amount: tx.amount || 0,
              currency: tx.currency || currency,
              category: undefined,
              tag: null,
              note: `Extracted from screenshot: ${file.name}`,
            }));
            
            // Auto-tag and auto-categorize immediately
            const tempTransactions: Transaction[] = extracted.map((ext) => ({
              id: uuidv4(),
              date: ext.date,
              merchant: ext.merchant,
              description: ext.description,
              amount: ext.amount,
              currency: ext.currency,
              category: ext.category,
              tag: ext.tag || null,
              note: ext.note,
              transactionStatus: "pending" as TransactionStatus,
              isManual: true,
              accountId: selectedAccountId || undefined,
              createdAt: new Date().toISOString(),
            }));
            
            const autoTagged = autoTagTransactions(tempTransactions, rules, categoryRules);
            
            // Map back to ExtractedTransaction format with auto-tagged data
            const enriched = extracted.map((ext, idx) => ({
              ...ext,
              category: autoTagged[idx].category,
              tag: autoTagged[idx].tag || undefined,
            }));
            
            allExtracted.push(...enriched);
          } else {
            setProcessingError(`No transactions found in ${file.name}. Please check if the screenshot contains transaction details.`);
          }
        } catch (parseError) {
          console.error("AI parsing failed:", parseError);
          setProcessingError(`Failed to parse transactions from ${file.name}. You can still add transactions manually.`);
        }
      }

      setOcrProgress({
        page: files.length,
        totalPages: files.length,
        progress: 1.0,
        status: "Complete",
      });

      if (allExtracted.length > 0) {
        setExtractedTransactions(allExtracted);
        setCurrentTransactionIndex(0);
        setShowSummary(false);
        setShowReviewModal(true);
      } else {
        alert("No transactions were extracted from the screenshots. Please try again or add transactions manually.");
      }
    } catch (error) {
      console.error("Screenshot processing failed:", error);
      setProcessingError(error instanceof Error ? error.message : "Failed to process screenshots");
    } finally {
      setIsProcessingScreenshots(false);
      setOcrProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleScreenshotUpload(e.target.files);
  };

  // Confirm and add extracted transactions
  const handleConfirmExtracted = async () => {
    if (extractedTransactions.length === 0) return;

    const transactionsToAdd: Transaction[] = extractedTransactions.map((extracted) => ({
      id: uuidv4(),
      date: extracted.date,
      merchant: extracted.merchant,
      description: extracted.description,
      amount: extracted.amount,
      currency: extracted.currency,
      category: extracted.category,
      tag: extracted.tag || null,
      note: extracted.note,
      transactionStatus: "pending" as TransactionStatus,
      isManual: true,
      accountId: selectedAccountId || undefined,
      createdAt: new Date().toISOString(),
    }));

    // Transactions are already auto-tagged and categorized, just add them
    await addTransactions(transactionsToAdd);
    toast.success("Transactions Added", {
      description: `Successfully added ${transactionsToAdd.length} transaction${transactionsToAdd.length !== 1 ? "s" : ""}.`,
      action: {
        label: "Review Transactions",
        onClick: () => {
          window.location.hash = "#review";
        },
      },
    });
    setShowReviewModal(false);
    setExtractedTransactions([]);
    setCurrentTransactionIndex(0);
    setShowSummary(false);
    setProcessingError(null);
  };

  // Update extracted transaction
  const handleUpdateExtracted = (index: number, updates: Partial<ExtractedTransaction>) => {
    const updated = [...extractedTransactions];
    updated[index] = { ...updated[index], ...updates };
    setExtractedTransactions(updated);
  };

  // Remove extracted transaction
  const handleRemoveExtracted = (index: number) => {
    const updated = extractedTransactions.filter((_, i) => i !== index);
    setExtractedTransactions(updated);
  };

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingTransactions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Waiting for statement import
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ready to Reconcile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{reconciliation.matched.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Matched with imported transactions
            </p>
            {reconciliation.matched.length > 0 && (
              <Button
                size="sm"
                className="mt-2 w-full"
                onClick={handleReconcile}
              >
                Reconcile Now
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{reconciliation.alerts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pending for 30+ days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Add Manual Transaction</CardTitle>
            <CardDescription>
              Add a transaction that hasn't appeared on your statement yet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Date *</label>
                <Input
                  type="date"
                  value={formData.date || ""}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Merchant *</label>
                <Input
                  value={formData.merchant || ""}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  placeholder="e.g., Starbucks"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Amount *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use negative for expenses, positive for income
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select
                  value={formData.category || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: (e.target.value || undefined) as TransactionCategory | undefined,
                    })
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">No category</option>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tag</label>
                <select
                  value={formData.tag || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tag: (e.target.value || null) as Transaction["tag"],
                    })
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">None</option>
                  <option value="reimbursable">Reimbursable</option>
                  <option value="personal">Personal</option>
                  <option value="ignore">Ignore</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Input
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">Note</label>
                <Input
                  value={formData.note || ""}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Optional note"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>Add Transaction</Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden file input for screenshots */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Screenshot Processing Status */}
      {(isProcessingScreenshots || processingError || ocrProgress) && (
        <Card className={processingError ? "border-destructive" : ""}>
          <CardContent className="pt-6">
            {isProcessingScreenshots && ocrProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{ocrProgress.status}</span>
                  <span className="text-muted-foreground">{ocrProgress.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${ocrProgress.progress}%` }}
                  />
                </div>
              </div>
            )}
            {processingError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {processingError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Transactions List */}
      <div className="space-y-4">
        {!isAdding && (
          <div className="flex justify-between items-center gap-2">
            <h2 className="text-xl font-semibold">Pending Transactions</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingScreenshots}
              >
                {isProcessingScreenshots ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Choose Screenshots
                  </>
                )}
              </Button>
              <Button onClick={handleAdd}>+ Add Transaction</Button>
            </div>
          </div>
        )}

        {pendingTransactions.length === 0 && !isAdding ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No pending transactions</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add transactions manually to track them before they appear on your statement
              </p>
              <Button onClick={handleAdd}>Add Transaction</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingTransactions.map((tx) => {
              const isMatched = reconciliation.matched.some((m) => m.pending.id === tx.id);
              const alert = reconciliation.alerts.find((a) => a.pending.id === tx.id);
              const daysSince = Math.floor(
                (new Date().getTime() - new Date(tx.date).getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <Card
                  key={tx.id}
                  className={cn(
                    "relative transition-all",
                    isMatched && "border-green-500 bg-green-50/50 dark:bg-green-950/20",
                    alert && "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{tx.merchant}</h3>
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                          {isMatched && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              Matched
                            </Badge>
                          )}
                          {alert && (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                              {alert.reason}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {new Date(tx.date).toLocaleDateString()} • {daysSince} day{daysSince !== 1 ? "s" : ""} ago
                        </p>
                        {tx.description && (
                          <p className="text-sm text-muted-foreground">{tx.description}</p>
                        )}
                        {tx.category && (
                          <div className="flex items-center gap-2 mt-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: CATEGORY_CONFIG[tx.category]?.color || "#6b7280",
                              }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {CATEGORY_CONFIG[tx.category]?.label}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-lg font-bold",
                            tx.amount < 0 ? "text-red-600" : "text-green-600"
                          )}
                        >
                          {tx.currency} {Math.abs(tx.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkConfirmed(tx.id)}
                          >
                            Mark Confirmed
                          </Button>
                        </div>
                      </div>
                    </div>
                    {tx.note && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                        <span className="text-muted-foreground">Note: </span>
                        {tx.note}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Extracted Transactions Modal */}
      {showReviewModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowReviewModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Review Transactions</CardTitle>
                    <CardDescription className="mt-1">
                      {showSummary 
                        ? "Review summary before adding"
                        : `Transaction ${currentTransactionIndex + 1} of ${extractedTransactions.length}`
                      }
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowReviewModal(false)}
                    className="h-8 w-8"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {showSummary ? (
                  // Summary View
                  <div className="space-y-6">
                    <div className="text-center py-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Ready to Add {extractedTransactions.length} Transaction{extractedTransactions.length !== 1 ? "s" : ""}</h3>
                      <p className="text-sm text-muted-foreground">Review the summary below</p>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {extractedTransactions.map((tx, index) => {
                        const categoryConfig = tx.category ? CATEGORY_CONFIG[tx.category] : null;
                        const tagColors = {
                          reimbursable: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                          personal: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
                          ignore: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
                        };
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold truncate">{tx.merchant}</p>
                                {categoryConfig && (
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {categoryConfig.label}
                                  </Badge>
                                )}
                                {tx.tag && (
                                  <Badge className={cn("text-xs shrink-0", tagColors[tx.tag])}>
                                    {tx.tag}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{tx.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={cn(
                                "font-semibold",
                                tx.amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                              )}>
                                {tx.currency} {Math.abs(tx.amount).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">{tx.date}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setShowSummary(false)}
                        className="flex-1"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Edit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowReviewModal(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleConfirmExtracted}
                        className="flex-1 bg-primary hover:bg-primary/90"
                      >
                        Add All
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                ) : extractedTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No transactions to review
                  </p>
                ) : (
                  // Transaction Detail View
                  <>
                    {extractedTransactions[currentTransactionIndex] && (() => {
                      const tx = extractedTransactions[currentTransactionIndex];
                      const categoryConfig = tx.category ? CATEGORY_CONFIG[tx.category] : null;
                      const tagColors = {
                        reimbursable: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                        personal: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
                        ignore: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
                      };
                      return (
                        <div className="space-y-6">
                          {/* Transaction Card */}
                          <div className="relative p-6 rounded-xl border-2 bg-gradient-to-br from-card to-muted/20">
                            <div className="absolute top-4 right-4">
                              <Badge variant="secondary" className="text-xs">
                                {currentTransactionIndex + 1} / {extractedTransactions.length}
                              </Badge>
                            </div>
                            
                            <div className="space-y-4">
                              {/* Merchant & Amount Header */}
                              <div className="flex items-start justify-between gap-4 pb-4 border-b">
                                <div className="flex-1 min-w-0">
                                  <Input
                                    value={tx.merchant}
                                    onChange={(e) =>
                                      handleUpdateExtracted(currentTransactionIndex, { merchant: e.target.value })
                                    }
                                    className="text-lg font-semibold border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                                    placeholder="Merchant name"
                                  />
                                  <Input
                                    value={tx.description}
                                    onChange={(e) =>
                                      handleUpdateExtracted(currentTransactionIndex, { description: e.target.value })
                                    }
                                    className="text-sm text-muted-foreground border-0 bg-transparent p-0 mt-1 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                                    placeholder="Description"
                                  />
                                </div>
                                <div className="text-right shrink-0">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={tx.amount}
                                    onChange={(e) =>
                                      handleUpdateExtracted(currentTransactionIndex, {
                                        amount: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className={cn(
                                      "text-2xl font-bold border-0 bg-transparent p-0 h-auto text-right focus-visible:ring-0 focus-visible:ring-offset-0",
                                      tx.amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                                    )}
                                  />
                                  <p className="text-xs text-muted-foreground">{tx.currency}</p>
                                </div>
                              </div>

                              {/* Fields Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">
                                    Date
                                  </label>
                                  <Input
                                    type="date"
                                    value={tx.date}
                                    onChange={(e) =>
                                      handleUpdateExtracted(currentTransactionIndex, { date: e.target.value })
                                    }
                                    className="h-11"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">
                                    Category
                                  </label>
                                  <select
                                    value={tx.category || ""}
                                    onChange={(e) =>
                                      handleUpdateExtracted(currentTransactionIndex, {
                                        category: (e.target.value || undefined) as TransactionCategory | undefined,
                                      })
                                    }
                                    className="w-full h-11 px-3 rounded-md border border-input bg-background"
                                  >
                                    <option value="">No category</option>
                                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                      <option key={key} value={key}>
                                        {config.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">
                                    Tag
                                  </label>
                                  <select
                                    value={tx.tag || ""}
                                    onChange={(e) =>
                                      handleUpdateExtracted(currentTransactionIndex, {
                                        tag: (e.target.value || null) as Transaction["tag"],
                                      })
                                    }
                                    className="w-full h-11 px-3 rounded-md border border-input bg-background"
                                  >
                                    <option value="">None</option>
                                    <option value="reimbursable">Reimbursable</option>
                                    <option value="personal">Personal</option>
                                    <option value="ignore">Ignore</option>
                                  </select>
                                </div>
                              </div>

                              {/* Auto-tagged indicators */}
                              {(tx.category || tx.tag) && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {tx.category && categoryConfig && (
                                    <Badge variant="outline" className="text-xs">
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Auto-categorized: {categoryConfig.label}
                                    </Badge>
                                  )}
                                  {tx.tag && (
                                    <Badge className={cn("text-xs", tagColors[tx.tag])}>
                                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Auto-tagged: {tx.tag}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Remove button */}
                              <div className="flex justify-end pt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    handleRemoveExtracted(currentTransactionIndex);
                                    if (currentTransactionIndex >= extractedTransactions.length - 1) {
                                      setCurrentTransactionIndex(Math.max(0, currentTransactionIndex - 1));
                                    }
                                  }}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Navigation */}
                          <div className="flex items-center justify-between gap-4">
                            <Button
                              variant="outline"
                              onClick={() => {
                                if (currentTransactionIndex > 0) {
                                  setCurrentTransactionIndex(currentTransactionIndex - 1);
                                }
                              }}
                              disabled={currentTransactionIndex === 0}
                              className="flex-1"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                              Previous
                            </Button>
                            
                            <div className="flex gap-1.5">
                              {extractedTransactions.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setCurrentTransactionIndex(idx)}
                                  className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    idx === currentTransactionIndex ? "bg-primary w-6" : "bg-muted hover:bg-muted-foreground/50"
                                  )}
                                  aria-label={`Go to transaction ${idx + 1}`}
                                />
                              ))}
                            </div>

                            {currentTransactionIndex < extractedTransactions.length - 1 ? (
                              <Button
                                onClick={() => setCurrentTransactionIndex(currentTransactionIndex + 1)}
                                className="flex-1 bg-primary hover:bg-primary/90"
                              >
                                Next
                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </Button>
                            ) : (
                              <Button
                                onClick={() => setShowSummary(true)}
                                className="flex-1 bg-primary hover:bg-primary/90"
                              >
                                Review Summary
                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

