"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { findDuplicates } from "@/lib/types";

interface DuplicateDetectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DuplicateDetector({ isOpen, onClose }: DuplicateDetectorProps) {
  const { transactions, deleteTransaction } = useApp();

  const duplicateGroups = useMemo(() => {
    return findDuplicates(transactions);
  }, [transactions]);

  const handleDeleteDuplicate = async (id: string) => {
    if (confirm("Delete this duplicate transaction?")) {
      await deleteTransaction(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Duplicate Detection
              </CardTitle>
              <CardDescription>
                Found {duplicateGroups.size} potential duplicate groups
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 flex-1 overflow-auto">
          {duplicateGroups.size === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-500">No Duplicates Found</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your transactions look clean!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                These transactions have the same date, amount, and similar merchant. Review and delete any duplicates.
              </p>
              {Array.from(duplicateGroups.entries()).map(([key, txs]) => (
                <div key={key} className="p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-yellow-500/10 text-yellow-500">
                      {txs.length} matches
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {txs[0].date} • {Math.abs(txs[0].amount).toFixed(2)} {txs[0].currency}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {txs.map((tx, index) => (
                      <div 
                        key={tx.id} 
                        className={`flex items-center justify-between p-2 rounded ${
                          index === 0 ? "bg-card" : "bg-muted/50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tx.merchant}</p>
                          <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {tx.tag && (
                            <Badge variant="outline" className="text-xs">
                              {tx.tag}
                            </Badge>
                          )}
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDuplicate(tx.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          )}
                          {index === 0 && (
                            <span className="text-xs text-muted-foreground px-2">Keep</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

