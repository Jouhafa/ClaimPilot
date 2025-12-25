"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CardSafetyData } from "@/lib/types";

interface CardSafetyMeterProps {
  cardSafety: CardSafetyData | null;
  pendingReimbursements: number;
}

export function CardSafetyMeter({ cardSafety, pendingReimbursements }: CardSafetyMeterProps) {
  const meterData = useMemo(() => {
    if (!cardSafety?.dueDate) return null;

    const dueDate = new Date(cardSafety.dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const statementBalance = cardSafety.statementBalance || 0;
    const paymentsMade = cardSafety.paymentsMade || 0;
    const remaining = statementBalance - paymentsMade;
    
    // Minimum to pay to avoid interest (usually statement balance, but account for reimbursements)
    const minToPay = Math.max(0, remaining - pendingReimbursements);
    
    // Progress: how much of the required payment has been made
    const progress = remaining > 0 ? ((paymentsMade / remaining) * 100) : 100;
    
    return {
      daysUntilDue,
      statementBalance,
      paymentsMade,
      remaining,
      minToPay,
      progress: Math.min(100, Math.max(0, progress)),
      dueDate: dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      isUrgent: daysUntilDue <= 3,
    };
  }, [cardSafety, pendingReimbursements]);

  if (!meterData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Card Safety</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Set up card safety to track payments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "bg-white/10 border-white/20 backdrop-blur-sm",
      meterData.isUrgent && "border-amber-500/50"
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white">Card Safety</CardTitle>
          {meterData.isUrgent && (
            <Badge variant="destructive" className="text-xs">Urgent</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Meter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/80">Pay at least</span>
            <span className="font-semibold text-white">{meterData.minToPay.toFixed(0)} AED</span>
          </div>
          <Progress value={meterData.progress} className="h-3" />
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>Paid: {meterData.paymentsMade.toFixed(0)} AED</span>
            <span>Due: {meterData.dueDate} ({meterData.daysUntilDue} days)</span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 p-3 bg-white/10 rounded-lg border border-white/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/80">Statement balance</span>
            <span className="font-semibold text-white">{meterData.statementBalance.toFixed(0)} AED</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/80">Payments made</span>
            <span className="font-semibold text-green-300">{meterData.paymentsMade.toFixed(0)} AED</span>
          </div>
          {pendingReimbursements > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">Pending reimbursements</span>
              <span className="font-semibold text-amber-300">{pendingReimbursements.toFixed(0)} AED</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-white/20">
            <span className="text-white">Remaining to pay</span>
            <span className={cn(
              meterData.remaining > 0 && meterData.isUrgent ? "text-red-300" : "text-white"
            )}>
              {meterData.remaining.toFixed(0)} AED
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

