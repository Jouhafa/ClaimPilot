"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useApp } from "@/lib/context";
import { saveCardSafety, loadCardSafety } from "@/lib/storage";

export function CardSafetyTab() {
  const { transactions } = useApp();
  const [statementBalance, setStatementBalance] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [paymentsMade, setPaymentsMade] = useState<string>("");
  const [isCalculated, setIsCalculated] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    loadCardSafety().then((data) => {
      if (data) {
        setStatementBalance(data.statementBalance.toString());
        setDueDate(data.dueDate);
        setPaymentsMade(data.paymentsMade.toString());
        setIsCalculated(true);
      }
    });
  }, []);

  // Calculate reimbursement totals
  const reimbursementStats = useMemo(() => {
    const reimbursables = transactions.filter((t) => t.tag === "reimbursable");
    
    const draft = reimbursables
      .filter((t) => !t.status || t.status === "draft")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const submitted = reimbursables
      .filter((t) => t.status === "submitted")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const paid = reimbursables
      .filter((t) => t.status === "paid")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return { draft, submitted, paid, total: draft + submitted };
  }, [transactions]);

  // Calculate amounts
  const calculations = useMemo(() => {
    const balance = parseFloat(statementBalance) || 0;
    const payments = parseFloat(paymentsMade) || 0;
    const remaining = balance - payments;
    const personalPortion = remaining - reimbursementStats.total;
    
    // Days until due
    const today = new Date();
    const due = dueDate ? new Date(dueDate) : null;
    const daysUntilDue = due ? Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return {
      statementBalance: balance,
      paymentsMade: payments,
      remaining,
      pendingReimbursements: reimbursementStats.total,
      personalPortion: Math.max(0, personalPortion),
      daysUntilDue,
      isOverdue: daysUntilDue !== null && daysUntilDue < 0,
    };
  }, [statementBalance, paymentsMade, dueDate, reimbursementStats]);

  const handleCalculate = async () => {
    const balance = parseFloat(statementBalance) || 0;
    const payments = parseFloat(paymentsMade) || 0;
    
    await saveCardSafety({
      statementBalance: balance,
      dueDate,
      paymentsMade: payments,
    });
    
    setIsCalculated(true);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Not set";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Card Safety</h1>
        <p className="text-muted-foreground mt-2">
          Calculate what to pay to avoid interest charges on your credit card
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statement Details</CardTitle>
            <CardDescription>
              Enter the values from your latest credit card statement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="statementBalance">Statement Balance (AED)</Label>
              <Input
                id="statementBalance"
                type="number"
                placeholder="e.g., 5000.00"
                className="font-mono"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Total amount shown on your statement
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Payment Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Date by which you must pay to avoid interest
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="paymentsMade">Payments Made Since Statement (AED)</Label>
              <Input
                id="paymentsMade"
                type="number"
                placeholder="e.g., 2000.00"
                className="font-mono"
                value={paymentsMade}
                onChange={(e) => setPaymentsMade(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Total payments you&apos;ve already made this cycle
              </p>
            </div>

            <div className="space-y-2">
              <Label>Pending Reimbursements (AED)</Label>
              <div className="p-3 rounded-lg bg-muted font-mono text-lg">
                {reimbursementStats.total.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-calculated from draft + submitted reimbursements
              </p>
            </div>

            <Button className="w-full" onClick={handleCalculate}>
              Calculate
            </Button>
          </CardContent>
        </Card>

        {/* Results Card */}
        <div className="space-y-6">
          {isCalculated && calculations.remaining > 0 ? (
            <>
              <Card className={`border-2 ${calculations.isOverdue ? "border-destructive bg-destructive/5" : "border-primary bg-primary/5"}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {calculations.isOverdue ? (
                      <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )}
                    {calculations.isOverdue ? "Payment Overdue!" : "Amount to Pay"}
                  </CardTitle>
                  <CardDescription>
                    {calculations.isOverdue 
                      ? "Your payment is past due - pay immediately to minimize charges"
                      : `Pay by ${formatDate(dueDate)} to avoid interest`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className={`text-5xl font-bold ${calculations.isOverdue ? "text-destructive" : "text-primary"}`}>
                      {calculations.remaining.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">AED</p>
                    {calculations.daysUntilDue !== null && !calculations.isOverdue && (
                      <p className="text-sm mt-2">
                        <span className={calculations.daysUntilDue <= 3 ? "text-yellow-500 font-semibold" : "text-muted-foreground"}>
                          {calculations.daysUntilDue} days remaining
                        </span>
                      </p>
                    )}
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Statement balance</span>
                      <span className="font-mono">{calculations.statementBalance.toFixed(2)} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payments made</span>
                      <span className="font-mono text-green-500">-{calculations.paymentsMade.toFixed(2)} AED</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Remaining to pay</span>
                      <span className="font-mono">{calculations.remaining.toFixed(2)} AED</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                      <span>Pending reimbursements (draft + submitted)</span>
                      <span className="font-mono font-semibold text-blue-500">
                        {calculations.pendingReimbursements.toFixed(2)} AED
                      </span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                      <span>Your personal portion</span>
                      <span className="font-mono font-semibold">
                        {calculations.personalPortion.toFixed(2)} AED
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Action Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        calculations.isOverdue ? "bg-destructive/10" : "bg-primary/10"
                      }`}>
                        <span className={`text-xs font-bold ${calculations.isOverdue ? "text-destructive" : "text-primary"}`}>1</span>
                      </div>
                      <div>
                        <p className="font-medium">
                          Pay {calculations.remaining.toFixed(2)} AED {calculations.isOverdue ? "immediately" : `by ${formatDate(dueDate)}`}
                        </p>
                        <p className="text-sm text-muted-foreground">To avoid interest charges</p>
                      </div>
                    </li>
                    {reimbursementStats.draft > 0 && (
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-yellow-500">2</span>
                        </div>
                        <div>
                          <p className="font-medium">Submit pending reimbursements</p>
                          <p className="text-sm text-muted-foreground">
                            {reimbursementStats.draft.toFixed(2)} AED in draft status
                          </p>
                        </div>
                      </li>
                    )}
                    {reimbursementStats.submitted > 0 && (
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-500">{reimbursementStats.draft > 0 ? "3" : "2"}</span>
                        </div>
                        <div>
                          <p className="font-medium">Follow up on submitted claims</p>
                          <p className="text-sm text-muted-foreground">
                            {reimbursementStats.submitted.toFixed(2)} AED awaiting payment
                          </p>
                        </div>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Enter your statement details</h3>
                <p className="text-muted-foreground text-sm">
                  Fill in the form on the left and click Calculate
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
