"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/context";
import { formatCurrency } from "@/lib/utils";
import { 
  getMonthlyROI, 
  recalculateCurrentMonthROI,
  createCancelledSubscription 
} from "@/lib/roiTracker";
import { 
  loadROITrackerData, 
  updateROITrackerData, 
  saveROITrackerData 
} from "@/lib/storage";
import type { ROITrackerData, ROIMonthlyMetrics, CancelledSubscription } from "@/lib/types";

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function ROITrackerTab() {
  const { transactions, cardSafety, recurring, profile } = useApp();
  const [roiData, setRoiData] = useState<ROITrackerData | null>(null);
  const [estimatedSavings, setEstimatedSavings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(new Date()));

  const currency = profile?.currency || "AED";

  // Load ROI data
  useEffect(() => {
    loadROITrackerData().then((data) => {
      setRoiData(data);
      setIsLoading(false);
    });
  }, []);

  // Calculate current month ROI
  const currentMonthMetrics = useMemo(() => {
    if (!roiData) return null;
    return getMonthlyROI(
      selectedMonth,
      transactions,
      cardSafety,
      roiData,
      estimatedSavings
    );
  }, [selectedMonth, transactions, cardSafety, roiData, estimatedSavings]);

  // Get historical months (last 6 months)
  const historicalMonths = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(getMonthKey(date));
    }
    return months;
  }, []);

  const handleSaveEstimatedSavings = async () => {
    if (!roiData) {
      const newData: ROITrackerData = {
        monthlyMetrics: {},
        cancelledSubscriptions: [],
        lastUpdated: new Date().toISOString(),
      };
      const currentMonthKey = getMonthKey(new Date());
      const metrics = recalculateCurrentMonthROI(
        transactions,
        cardSafety,
        null,
        estimatedSavings
      );
      newData.monthlyMetrics[currentMonthKey] = metrics;
      await saveROITrackerData(newData);
      setRoiData(newData);
    } else {
      const currentMonthKey = getMonthKey(new Date());
      const metrics = recalculateCurrentMonthROI(
        transactions,
        cardSafety,
        roiData,
        estimatedSavings
      );
      await updateROITrackerData({
        monthlyMetrics: {
          ...roiData.monthlyMetrics,
          [currentMonthKey]: metrics,
        },
      });
      setRoiData({
        ...roiData,
        monthlyMetrics: {
          ...roiData.monthlyMetrics,
          [currentMonthKey]: metrics,
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading ROI data...</p>
        </div>
      </div>
    );
  }

  const subscriptionPrice = 54; // Lifetime access price in USD/AED

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-[34px] font-bold tracking-tight" style={{ fontWeight: 700, lineHeight: 1.35 }}>
          ROI Tracker
        </h1>
        <p className="text-[15px] text-muted-foreground mt-2" style={{ lineHeight: 1.6 }}>
          Track the value you've recovered and savings you've achieved
        </p>
      </div>

      {/* Current Month Net Benefit - Prominent */}
      {currentMonthMetrics && (
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>
              Net Benefit This Month
            </CardTitle>
            <CardDescription>Total value recovered and saved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-[48px] font-bold text-primary" style={{ fontWeight: 700 }}>
                  +{formatCurrency(currentMonthMetrics.totalBenefit, currency, 0)}
                </span>
                {currentMonthMetrics.totalBenefit > 0 && (
                  <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 text-sm">
                    {Math.round((currentMonthMetrics.totalBenefit / subscriptionPrice) * 100)}% ROI
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Reimbursements</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(currentMonthMetrics.reimbursementsRecovered, currency, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Interest Avoided</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(currentMonthMetrics.interestAvoided, currency, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Subscriptions</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(currentMonthMetrics.subscriptionsCancelled, currency, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estimated Savings</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(currentMonthMetrics.estimatedSavings, currency, 0)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estimated Savings Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>
            Estimated Savings
          </CardTitle>
          <CardDescription>
            Add any additional savings from budget cuts or optimizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="estimatedSavings" className="sr-only">Estimated Savings</Label>
              <Input
                id="estimatedSavings"
                type="number"
                placeholder="0"
                value={estimatedSavings || ""}
                onChange={(e) => setEstimatedSavings(parseFloat(e.target.value) || 0)}
                className="text-lg"
              />
            </div>
            <Button onClick={handleSaveEstimatedSavings}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historical Metrics */}
      {roiData && Object.keys(roiData.monthlyMetrics).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>
              Historical Performance
            </CardTitle>
            <CardDescription>Monthly breakdown of recovered value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historicalMonths.map((monthKey) => {
                const metrics = roiData.monthlyMetrics[monthKey];
                if (!metrics || metrics.totalBenefit === 0) return null;

                return (
                  <div
                    key={monthKey}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{formatMonthKey(monthKey)}</p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Reimbursements: {formatCurrency(metrics.reimbursementsRecovered, currency, 0)}</span>
                        <span>Interest: {formatCurrency(metrics.interestAvoided, currency, 0)}</span>
                        {metrics.subscriptionsCancelled > 0 && (
                          <span>Subscriptions: {formatCurrency(metrics.subscriptionsCancelled, currency, 0)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        +{formatCurrency(metrics.totalBenefit, currency, 0)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancelled Subscriptions */}
      {roiData && roiData.cancelledSubscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[18px]" style={{ fontWeight: 600 }}>
              Cancelled Subscriptions
            </CardTitle>
            <CardDescription>Subscriptions you've cancelled to save money</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {roiData.cancelledSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="text-sm font-medium">{sub.merchant}</p>
                    <p className="text-xs text-muted-foreground">
                      Cancelled {new Date(sub.cancelledDate).toLocaleDateString("en-US", { 
                        month: "short", 
                        day: "numeric", 
                        year: "numeric" 
                      })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    +{formatCurrency(sub.amount, currency, 0)}/mo
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

