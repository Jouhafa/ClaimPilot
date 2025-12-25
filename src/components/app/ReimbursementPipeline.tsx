"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

interface ReimbursementPipelineProps {
  transactions: Transaction[];
}

export function ReimbursementPipeline({ transactions }: ReimbursementPipelineProps) {
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
    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base text-white">Reimbursement Pipeline</CardTitle>
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
          <div className="text-center p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
            <p className="text-xs text-white/80 mb-1">Draft</p>
            <p className="text-sm font-semibold text-white">{pipeline.draft.count}</p>
            <p className="text-xs text-white/70">{pipeline.draft.total.toFixed(0)} AED</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <p className="text-xs text-white/80 mb-1">Submitted</p>
            <p className="text-sm font-semibold text-white">{pipeline.submitted.count}</p>
            <p className="text-xs text-white/70">{pipeline.submitted.total.toFixed(0)} AED</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/20 border border-green-500/30">
            <p className="text-xs text-white/80 mb-1">Paid</p>
            <p className="text-sm font-semibold text-white">{pipeline.paid.count}</p>
            <p className="text-xs text-white/70">{pipeline.paid.total.toFixed(0)} AED</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

