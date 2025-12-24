"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/context";
import { getAutoTagStats, findSimilarTransactions } from "@/lib/autoTagger";
import type { Transaction, TransactionTag } from "@/lib/types";

export function ReviewTab() {
  const { transactions, updateTransaction, updateTransactions } = useApp();
  const [showApplySimilarToast, setShowApplySimilarToast] = useState<{
    tx: Transaction;
    similar: Transaction[];
    tag: TransactionTag;
  } | null>(null);

  // Get auto-tag statistics
  const stats = useMemo(() => getAutoTagStats(transactions), [transactions]);

  // Group transactions by confidence
  const { highConfidence, needsReview, completed } = useMemo(() => {
    const high: Transaction[] = [];
    const review: Transaction[] = [];
    const done: Transaction[] = [];

    transactions.forEach((tx) => {
      if (tx.parentId) return; // Skip split children
      
      // If manually tagged (not auto-tagged), it's done
      if (tx.tag && !tx.isAutoTagged) {
        done.push(tx);
        return;
      }

      // High confidence auto-tagged
      if (tx.isAutoTagged && tx.tagConfidence === "high") {
        high.push(tx);
        return;
      }

      // Needs review: medium/low confidence or untagged
      if (!tx.tag || tx.tagConfidence === "medium" || tx.tagConfidence === "low") {
        review.push(tx);
        return;
      }

      // Auto-tagged with high confidence but not yet approved
      high.push(tx);
    });

    return { highConfidence: high, needsReview: review, completed: done };
  }, [transactions]);

  // Calculate progress
  const totalTaggable = highConfidence.length + needsReview.length + completed.length;
  const taggedCount = completed.length;
  const progressPercent = totalTaggable > 0 ? (taggedCount / totalTaggable) * 100 : 0;

  // Approve all high confidence suggestions
  const handleApproveAllHigh = async () => {
    const ids = highConfidence.map((tx) => tx.id);
    // Mark as manually confirmed (remove isAutoTagged flag)
    await updateTransactions(ids, { isAutoTagged: false });
  };

  // Tag a single transaction
  const handleTag = async (tx: Transaction, tag: TransactionTag) => {
    await updateTransaction(tx.id, {
      tag,
      isAutoTagged: false,
      status: tag === "reimbursable" ? "draft" : undefined,
    });

    // Check for similar transactions
    const similar = findSimilarTransactions(tx, transactions).filter(
      (s) => s.isAutoTagged || !s.tag
    );

    if (similar.length > 0) {
      setShowApplySimilarToast({ tx, similar, tag });
    }
  };

  // Apply tag to similar transactions
  const handleApplyToSimilar = async () => {
    if (!showApplySimilarToast) return;

    const { similar, tag } = showApplySimilarToast;
    const ids = similar.map((tx) => tx.id);

    await updateTransactions(ids, {
      tag,
      isAutoTagged: false,
      status: tag === "reimbursable" ? "draft" : undefined,
    });

    setShowApplySimilarToast(null);
  };

  const dismissSimilarToast = () => {
    setShowApplySimilarToast(null);
  };

  // Tag badge colors
  const getTagColor = (tag: TransactionTag) => {
    switch (tag) {
      case "reimbursable":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "personal":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "ignore":
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
      default:
        return "";
    }
  };

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence) {
      case "high":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-orange-500";
      default:
        return "text-muted-foreground";
    }
  };

  // Empty state
  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Suggestions</h1>
          <p className="text-muted-foreground mt-2">
            Import a statement to see smart tagging suggestions
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
              Import a statement to get started with smart auto-tagging
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All done state
  if (needsReview.length === 0 && highConfidence.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Complete!</h1>
          <p className="text-muted-foreground mt-2">
            All transactions have been tagged
          </p>
        </div>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-500 mb-2">All Done!</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {completed.length} transactions tagged and ready for export
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => window.location.hash = "#reimbursements"}>
                View Reimbursements
              </Button>
              <Button onClick={() => window.location.hash = "#export"}>
                Export Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Suggestions</h1>
          <p className="text-muted-foreground mt-2">
            Approve or adjust smart tagging suggestions
          </p>
        </div>
        {progressPercent === 100 && (
          <Button onClick={() => window.location.hash = "#export"}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Done - Export Now
          </Button>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {taggedCount} of {totalTaggable} tagged
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{stats.autoTaggedCount} auto-suggested</span>
            <span>{stats.needsReviewCount} need review</span>
          </div>
        </CardContent>
      </Card>

      {/* High Confidence Section */}
      {highConfidence.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-lg">High Confidence ({highConfidence.length})</CardTitle>
                  <CardDescription>These look correct - approve all at once</CardDescription>
                </div>
              </div>
              <Button onClick={handleApproveAllHigh} className="bg-green-500 hover:bg-green-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approve All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highConfidence.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{tx.merchant}</span>
                      <span className="text-xs text-muted-foreground">
                        {tx.tagReason}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">{tx.date}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">
                      {Math.abs(tx.amount).toFixed(2)} {tx.currency}
                    </span>
                    <Badge className={getTagColor(tx.tag)}>
                      {tx.tag === "reimbursable" ? "R" : tx.tag === "personal" ? "P" : "I"}
                    </Badge>
                  </div>
                </div>
              ))}
              {highConfidence.length > 5 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  +{highConfidence.length - 5} more transactions
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Needs Review Section */}
      {needsReview.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg">Needs Review ({needsReview.length})</CardTitle>
                <CardDescription>Click a tag to apply it</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {needsReview.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{tx.merchant}</span>
                      {tx.tagReason && (
                        <span className={`text-xs ${getConfidenceColor(tx.tagConfidence)}`}>
                          {tx.tagReason}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tx.date} • {tx.description.substring(0, 40)}{tx.description.length > 40 ? "..." : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm mr-2">
                      {Math.abs(tx.amount).toFixed(2)} {tx.currency}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={tx.tag === "reimbursable" ? "default" : "outline"}
                        className={tx.tag === "reimbursable" ? "bg-green-500 hover:bg-green-600" : "hover:bg-green-500/10 hover:text-green-500"}
                        onClick={() => handleTag(tx, "reimbursable")}
                      >
                        R
                      </Button>
                      <Button
                        size="sm"
                        variant={tx.tag === "personal" ? "default" : "outline"}
                        className={tx.tag === "personal" ? "bg-blue-500 hover:bg-blue-600" : "hover:bg-blue-500/10 hover:text-blue-500"}
                        onClick={() => handleTag(tx, "personal")}
                      >
                        P
                      </Button>
                      <Button
                        size="sm"
                        variant={tx.tag === "ignore" ? "default" : "outline"}
                        className={tx.tag === "ignore" ? "bg-gray-500 hover:bg-gray-600" : "hover:bg-gray-500/10 hover:text-gray-500"}
                        onClick={() => handleTag(tx, "ignore")}
                      >
                        I
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground justify-center">
        <span className="px-2 py-1 rounded bg-muted">
          <kbd className="font-mono">R</kbd> Reimbursable
        </span>
        <span className="px-2 py-1 rounded bg-muted">
          <kbd className="font-mono">P</kbd> Personal
        </span>
        <span className="px-2 py-1 rounded bg-muted">
          <kbd className="font-mono">I</kbd> Ignore
        </span>
      </div>

      {/* Apply to Similar Toast */}
      {showApplySimilarToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <Card className="border-primary shadow-lg">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium">
                    Tag all {showApplySimilarToast.similar.length + 1} "{showApplySimilarToast.tx.merchant.split(" ")[0]}" transactions?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    As {showApplySimilarToast.tag}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={dismissSimilarToast}>
                    No
                  </Button>
                  <Button size="sm" onClick={handleApplyToSimilar}>
                    Yes, tag all
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

