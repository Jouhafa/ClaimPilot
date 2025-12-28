"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useApp } from "@/lib/context";
import { getMonthlyROI, recalculateCurrentMonthROI } from "@/lib/roiTracker";
import { loadROITrackerData } from "@/lib/storage";
import type { ROITrackerData } from "@/lib/types";

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

interface ROICardProps {
  onNavigate: (tab: string) => void;
}

export function ROICard({ onNavigate }: ROICardProps) {
  const { transactions, cardSafety, profile } = useApp();
  const [roiData, setRoiData] = useState<ROITrackerData | null>(null);

  const currency = profile?.currency || "AED";
  const currentMonthKey = getMonthKey(new Date());

  useEffect(() => {
    loadROITrackerData().then(setRoiData);
  }, []);

  const currentMetrics = useMemo(() => {
    if (!roiData) {
      return recalculateCurrentMonthROI(transactions, cardSafety, null, 0);
    }
    return getMonthlyROI(currentMonthKey, transactions, cardSafety, roiData, 0);
  }, [currentMonthKey, transactions, cardSafety, roiData]);

  if (currentMetrics.totalBenefit === 0) {
    return null; // Don't show card if no ROI yet
  }

  return (
    <Card className="border border-border/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-medium" style={{ fontWeight: 500 }}>Net Benefit This Month</p>
              <p className="text-[13px] text-muted-foreground">
                +{formatCurrency(currentMetrics.totalBenefit, currency, 0)} recovered
              </p>
            </div>
          </div>
          <Button
            onClick={() => onNavigate("roi-tracker")}
            size="sm"
            className="h-9 px-4"
            variant="outline"
          >
            View details →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

