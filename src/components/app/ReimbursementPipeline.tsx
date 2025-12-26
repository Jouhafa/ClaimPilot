"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

interface ReimbursementPipelineProps {
  transactions: Transaction[];
}

export function ReimbursementPipeline({ transactions }: ReimbursementPipelineProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  
  const pipeline = useMemo(() => {
    const reimbursables = transactions.filter(t => t.tag === "reimbursable" && !t.parentId);
    
    const draft = reimbursables.filter(t => t.status === "draft");
    const submitted = reimbursables.filter(t => t.status === "submitted");
    const paid = reimbursables.filter(t => t.status === "paid");

    const draftTotal = draft.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const submittedTotal = submitted.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const paidTotal = paid.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const total = draftTotal + submittedTotal + paidTotal;

    return {
      draft: { count: draft.length, total: draftTotal, percentage: total > 0 ? (draftTotal / total) * 100 : 0 },
      submitted: { count: submitted.length, total: submittedTotal, percentage: total > 0 ? (submittedTotal / total) * 100 : 0 },
      paid: { count: paid.length, total: paidTotal, percentage: total > 0 ? (paidTotal / total) * 100 : 0 },
      total,
    };
  }, [transactions]);

  if (pipeline.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reimbursement Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No reimbursements tracked yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "backdrop-blur-sm",
      isDark ? "bg-white/10 border-white/20" : "bg-white/90 border-gray-200 shadow-lg"
    )}>
      <CardHeader>
        <CardTitle className={cn("text-base", isDark ? "text-white" : "text-gray-900")}>Reimbursement Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline Bar */}
        <div className="flex h-12 rounded-lg overflow-hidden border border-border">
          {pipeline.draft.total > 0 && (
            <div
              className="bg-amber-500 flex items-center justify-center text-xs font-medium text-white transition-all hover:opacity-90"
              style={{ width: `${pipeline.draft.percentage}%` }}
              title={`Draft: ${pipeline.draft.total.toFixed(0)} AED`}
            >
              {pipeline.draft.percentage > 10 && `${pipeline.draft.percentage.toFixed(0)}%`}
            </div>
          )}
          {pipeline.submitted.total > 0 && (
            <div
              className="bg-blue-500 flex items-center justify-center text-xs font-medium text-white transition-all hover:opacity-90"
              style={{ width: `${pipeline.submitted.percentage}%` }}
              title={`Submitted: ${pipeline.submitted.total.toFixed(0)} AED`}
            >
              {pipeline.submitted.percentage > 10 && `${pipeline.submitted.percentage.toFixed(0)}%`}
            </div>
          )}
          {pipeline.paid.total > 0 && (
            <div
              className="bg-green-500 flex items-center justify-center text-xs font-medium text-white transition-all hover:opacity-90"
              style={{ width: `${pipeline.paid.percentage}%` }}
              title={`Paid: ${pipeline.paid.total.toFixed(0)} AED`}
            >
              {pipeline.paid.percentage > 10 && `${pipeline.paid.percentage.toFixed(0)}%`}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="grid grid-cols-3 gap-3">
          <div className={cn(
            "text-center p-2 rounded-lg border",
            isDark 
              ? "bg-amber-500/20 border-amber-500/30" 
              : "bg-amber-50 border-amber-200"
          )}>
            <p className={cn("text-xs mb-1", isDark ? "text-white/80" : "text-amber-900")}>Draft</p>
            <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>{pipeline.draft.count}</p>
            <p className={cn("text-xs", isDark ? "text-white/70" : "text-gray-600")}>{pipeline.draft.total.toFixed(0)} AED</p>
          </div>
          <div className={cn(
            "text-center p-2 rounded-lg border",
            isDark 
              ? "bg-blue-500/20 border-blue-500/30" 
              : "bg-blue-50 border-blue-200"
          )}>
            <p className={cn("text-xs mb-1", isDark ? "text-white/80" : "text-blue-900")}>Submitted</p>
            <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>{pipeline.submitted.count}</p>
            <p className={cn("text-xs", isDark ? "text-white/70" : "text-gray-600")}>{pipeline.submitted.total.toFixed(0)} AED</p>
          </div>
          <div className={cn(
            "text-center p-2 rounded-lg border",
            isDark 
              ? "bg-green-500/20 border-green-500/30" 
              : "bg-green-50 border-green-200"
          )}>
            <p className={cn("text-xs mb-1", isDark ? "text-white/80" : "text-green-900")}>Paid</p>
            <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>{pipeline.paid.count}</p>
            <p className={cn("text-xs", isDark ? "text-white/70" : "text-gray-600")}>{pipeline.paid.total.toFixed(0)} AED</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

