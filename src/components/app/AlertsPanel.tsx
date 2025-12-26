"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/context";
import { findDuplicates } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AlertsPanelProps {
  onNavigate: (tab: string) => void;
}

interface AlertAction {
  label: string;
  variant: "default" | "destructive" | "outline" | "ghost";
  onClick: () => void;
  resolvesAlert?: boolean;
}

type AlertStatus = "open" | "snoozed" | "resolved";

interface Alert {
  id: string;
  severity: "high" | "medium" | "low";
  type: "warning" | "info" | "success" | "urgent";
  title: string;
  description: string;
  actions: AlertAction[];
  dismissible?: boolean;
}

interface AlertWithStatus extends Alert {
  status: AlertStatus;
}

export function AlertsPanel({ onNavigate }: AlertsPanelProps) {
  const { transactions, goals, cardSafety, updateTransaction } = useApp();
  const [alertStatuses, setAlertStatuses] = useState<Record<string, AlertStatus>>({});
  const [showResolved, setShowResolved] = useState(false);

  // Update alert status
  const updateAlertStatus = (alertId: string, status: AlertStatus) => {
    setAlertStatuses(prev => ({ ...prev, [alertId]: status }));
    
    // Auto-unsnooze after 24 hours
    if (status === "snoozed") {
      setTimeout(() => {
        setAlertStatuses(prev => {
          if (prev[alertId] === "snoozed") {
            return { ...prev, [alertId]: "open" };
          }
          return prev;
        });
      }, 24 * 60 * 60 * 1000);
    }
  };

  // Function to generate email template
  const generateReminderEmail = (total: number, count: number) => {
    const subject = encodeURIComponent(`Reimbursement Follow-up - ${total.toLocaleString()} AED pending`);
    const body = encodeURIComponent(`Hi,

I wanted to follow up on my pending reimbursement claims.

Summary:
- Total amount: ${total.toLocaleString()} AED
- Number of claims: ${count}
- Submitted over 14 days ago

Could you please provide an update on when I can expect these to be processed?

Thank you!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // Function to mark reimbursements as chased
  const markAsChased = (transactionIds: string[], alertId: string) => {
    transactionIds.forEach(id => {
      const tx = transactions.find(t => t.id === id);
      if (tx) {
        updateTransaction(id, { 
          note: `${tx.note || ''} [Chased ${new Date().toLocaleDateString()}]`.trim() 
        });
      }
    });
    updateAlertStatus(alertId, "resolved");
  };

  const alerts = useMemo((): AlertWithStatus[] => {
    const alertsList: Alert[] = [];
    const today = new Date();

    // 1. Card payment due soon (HIGH severity)
    if (cardSafety?.dueDate) {
      const dueDate = new Date(cardSafety.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const remaining = cardSafety.statementBalance - (cardSafety.paymentsMade || 0);

      if (daysUntilDue <= 0 && remaining > 0) {
        alertsList.push({
          id: "card-overdue",
          severity: "high",
          type: "urgent",
          title: "Card payment overdue!",
          description: `Pay ${remaining.toLocaleString()} AED immediately to avoid interest charges`,
          actions: [
            { label: "Pay now", variant: "destructive", onClick: () => onNavigate("card-safety"), resolvesAlert: true },
          ],
        });
      } else if (daysUntilDue <= 5 && daysUntilDue > 0 && remaining > 0) {
        alertsList.push({
          id: "card-due-soon",
          severity: "high",
          type: "urgent",
          title: `Card due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
          description: `Pay ${remaining.toLocaleString()} AED by ${dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
          actions: [
            { label: "Pay now", variant: "destructive", onClick: () => onNavigate("card-safety"), resolvesAlert: true },
            { label: "Snooze 1 day", variant: "ghost", onClick: () => updateAlertStatus("card-due-soon", "snoozed") },
          ],
        });
      } else if (daysUntilDue <= 10 && daysUntilDue > 5 && remaining > 0) {
        alertsList.push({
          id: "card-reminder",
          severity: "medium",
          type: "warning",
          title: "Card payment reminder",
          description: `${remaining.toLocaleString()} AED due in ${daysUntilDue} days`,
          actions: [
            { label: "Schedule payment", variant: "outline", onClick: () => onNavigate("card-safety") },
          ],
          dismissible: true,
        });
      }
    }

    // 2. Stale reimbursements (MEDIUM severity)
    const staleReimbursements = transactions.filter(t => {
      if (t.tag !== "reimbursable" || t.status !== "submitted") return false;
      const submittedDate = new Date(t.createdAt);
      const daysSinceSubmitted = Math.floor((today.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceSubmitted > 14;
    });

    if (staleReimbursements.length > 0) {
      const total = staleReimbursements.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const oldestDays = Math.max(...staleReimbursements.map(t => 
        Math.floor((today.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      ));
      alertsList.push({
        id: "stale-reimbursements",
        severity: "medium",
        type: "warning",
        title: "Reimbursements awaiting payment",
        description: `${staleReimbursements.length} claims (${total.toLocaleString()} AED) submitted ${oldestDays} days ago`,
        actions: [
          { label: "Send reminder", variant: "outline", onClick: () => generateReminderEmail(total, staleReimbursements.length) },
          { label: "Mark as chased", variant: "ghost", onClick: () => markAsChased(staleReimbursements.map(t => t.id), "stale-reimbursements"), resolvesAlert: true },
        ],
        dismissible: true,
      });
    }

    // 3. Multiple subscriptions (LOW severity)
    const recurringTransactions = transactions.filter(t => t.isRecurring);
    const subscriptionMerchants = new Set(
      recurringTransactions
        .filter(t => t.category === "subscriptions")
        .map(t => t.merchant)
    );
    const totalSubscriptionCost = recurringTransactions
      .filter(t => t.category === "subscriptions")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (subscriptionMerchants.size > 3) {
      alertsList.push({
        id: "subscriptions-review",
        severity: "low",
        type: "info",
        title: "Subscription review suggested",
        description: `${subscriptionMerchants.size} active subscriptions totaling ~${totalSubscriptionCost.toLocaleString()} AED/mo`,
        actions: [
          { label: "Review now", variant: "outline", onClick: () => onNavigate("recurring") },
        ],
        dismissible: true,
      });
    }

    // 4. Potential duplicates (MEDIUM severity)
    const duplicates = findDuplicates(transactions);
    if (duplicates.size > 0) {
      const duplicateCount = Array.from(duplicates.values()).reduce((sum, arr) => sum + arr.length - 1, 0);
      alertsList.push({
        id: "duplicates",
        severity: "medium",
        type: "warning",
        title: "Potential duplicates found",
        description: `${duplicateCount} transactions might be duplicates`,
        actions: [
          { label: "Review", variant: "outline", onClick: () => onNavigate("review") },
        ],
        dismissible: true,
      });
    }

    // 5. Goal milestones (LOW severity - positive)
    goals.forEach(goal => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      if (progress >= 90 && progress < 100) {
        const remaining = goal.targetAmount - goal.currentAmount;
        alertsList.push({
          id: `goal-close-${goal.id}`,
          severity: "low",
          type: "success",
          title: `Almost there! ${goal.name}`,
          description: `Just ${remaining.toLocaleString()} AED to go (${Math.round(progress)}% complete)`,
          actions: [
            { label: "Add contribution", variant: "outline", onClick: () => onNavigate("goals") },
          ],
          dismissible: true,
        });
      } else if (progress >= 100) {
        alertsList.push({
          id: `goal-done-${goal.id}`,
          severity: "low",
          type: "success",
          title: `🎉 Goal achieved: ${goal.name}`,
          description: `Congratulations! You've reached your goal.`,
          actions: [
            { label: "Set next goal", variant: "outline", onClick: () => onNavigate("goals") },
          ],
          dismissible: true,
        });
      }
    });

    // 6. Large untagged expense (MEDIUM severity)
    const recentLargeExpenses = transactions.filter(t => {
      if (t.amount >= 0) return false;
      const txDate = new Date(t.date);
      const daysSince = Math.floor((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince <= 7 && Math.abs(t.amount) > 2000 && !t.tag;
    });

    if (recentLargeExpenses.length > 0) {
      const largest = recentLargeExpenses.sort((a, b) => a.amount - b.amount)[0];
      alertsList.push({
        id: "large-expense",
        severity: "medium",
        type: "info",
        title: "Large expense needs review",
        description: `${largest.merchant} - ${Math.abs(largest.amount).toLocaleString()} AED`,
        actions: [
          { label: "Tag as work", variant: "outline", onClick: () => {
            updateTransaction(largest.id, { tag: "reimbursable" });
            updateAlertStatus("large-expense", "resolved");
          }, resolvesAlert: true },
          { label: "Tag as personal", variant: "ghost", onClick: () => {
            updateTransaction(largest.id, { tag: "personal" });
            updateAlertStatus("large-expense", "resolved");
          }, resolvesAlert: true },
        ],
        dismissible: true,
      });
    }

    // Add status to each alert
    return alertsList.map(alert => ({
      ...alert,
      status: alertStatuses[alert.id] || "open"
    }));
  }, [transactions, goals, cardSafety, alertStatuses]);

  // Separate alerts by status
  const openAlerts = alerts.filter(a => a.status === "open");
  const snoozedAlerts = alerts.filter(a => a.status === "snoozed");
  const resolvedAlerts = alerts.filter(a => a.status === "resolved");

  const getSeverityBadge = (severity: Alert["severity"], status: AlertStatus) => {
    if (status === "resolved") {
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-0">DONE</Badge>;
    }
    if (status === "snoozed") {
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-700 dark:text-blue-300 border-0">SNOOZED</Badge>;
    }
    switch (severity) {
      case "high":
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">HIGH</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0">MED</Badge>;
      case "low":
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-700 dark:text-green-300 border-0">LOW</Badge>;
    }
  };

  const getAlertStyles = (type: Alert["type"], status: AlertStatus) => {
    if (status === "resolved") return "border-muted bg-muted/30 opacity-60";
    if (status === "snoozed") return "border-blue-500/30 bg-blue-500/5";
    
    switch (type) {
      case "urgent":
        return "border-red-500/30 bg-red-500/5";
      case "warning":
        return "border-amber-500/30 bg-amber-500/5";
      case "success":
        return "border-green-500/30 bg-green-500/5";
      default:
        return "border-blue-500/30 bg-blue-500/5";
    }
  };

  const getAlertIcon = (type: Alert["type"], status: AlertStatus) => {
    const iconClass = "w-5 h-5";
    
    if (status === "resolved") {
      return (
        <div className="p-2 rounded-lg bg-muted text-muted-foreground">
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    
    if (status === "snoozed") {
      return (
        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }
    
    switch (type) {
      case "urgent":
        return (
          <div className="p-2 rounded-lg bg-red-500/20 text-red-500">
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "success":
        return (
          <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const renderAlert = (alert: AlertWithStatus) => (
    <Card
      key={alert.id}
      className={cn("transition-all", getAlertStyles(alert.type, alert.status))}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          {getAlertIcon(alert.type, alert.status)}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {getSeverityBadge(alert.severity, alert.status)}
              <span className={cn(
                "font-medium text-sm",
                alert.status === "resolved" && "line-through text-muted-foreground"
              )}>
                {alert.title}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {alert.description}
            </p>
            
            {/* Actions - only show for open alerts */}
            {alert.status === "open" && (
              <div className="flex items-center gap-2 mt-2">
                {alert.actions.map((action, i) => (
                  <Button 
                    key={i}
                    size="sm" 
                    variant={action.variant}
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Snoozed message */}
            {alert.status === "snoozed" && (
              <p className="text-xs text-blue-500 mt-2">
                Snoozed · Will reappear in 24h
              </p>
            )}
          </div>
          
          {/* Dismiss / Reopen */}
          <div className="flex items-center gap-1">
            {alert.status === "resolved" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateAlertStatus(alert.id, "open");
                }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs"
                title="Reopen"
              >
                Reopen
              </button>
            )}
            {alert.status === "open" && alert.dismissible && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateAlertStatus(alert.id, "resolved");
                }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Mark as resolved"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (openAlerts.length === 0 && snoozedAlerts.length === 0 && resolvedAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Alerts</h2>
        {resolvedAlerts.length > 0 && (
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showResolved ? "Hide" : "Show"} resolved ({resolvedAlerts.length})
          </button>
        )}
      </div>
      
      {/* Open Alerts */}
      {openAlerts.length > 0 && (
        <div className="space-y-2">
          {openAlerts.map(renderAlert)}
        </div>
      )}

      {/* Snoozed Alerts */}
      {snoozedAlerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">Snoozed</p>
          {snoozedAlerts.map(renderAlert)}
        </div>
      )}

      {/* Resolved Alerts */}
      {showResolved && resolvedAlerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">Resolved</p>
          {resolvedAlerts.map(renderAlert)}
        </div>
      )}

      {/* All clear message */}
      {openAlerts.length === 0 && snoozedAlerts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">✓ All clear! No active alerts.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
