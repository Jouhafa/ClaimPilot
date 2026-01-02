import { v4 as uuidv4 } from "uuid";
import type { Notification } from "@/components/app/NotificationPanel";

export function createNotification(
  type: Notification["type"],
  title: string,
  message: string,
  options?: {
    actionLabel?: string;
    actionTab?: string;
    onAction?: () => void;
    autoDismiss?: number;
  }
): Notification {
  return {
    id: uuidv4(),
    type,
    title,
    message,
    actionLabel: options?.actionLabel,
    actionTab: options?.actionTab,
    onAction: options?.onAction,
    autoDismiss: options?.autoDismiss ?? 7000,
  };
}

export function createTransactionAddedNotification(onNavigate?: (tab: string) => void): Notification {
  return createNotification(
    "success",
    "Transaction Added",
    "Your transaction has been added successfully.",
    {
      actionLabel: "Review Transactions",
      actionTab: "review",
      autoDismiss: 8000,
    }
  );
}

export function createImportSuccessNotification(count: number, onNavigate?: (tab: string) => void): Notification {
  return createNotification(
    "success",
    "Import Successful",
    `Successfully imported ${count} transaction${count !== 1 ? "s" : ""}.`,
    {
      actionLabel: "View Transactions",
      actionTab: "transactions",
      autoDismiss: 8000,
    }
  );
}

export function createTaggedNotification(onNavigate?: (tab: string) => void): Notification {
  return createNotification(
    "info",
    "Transactions Tagged",
    "Your transactions have been tagged. View insights in Analytics.",
    {
      actionLabel: "View Analytics",
      actionTab: "analytics",
      autoDismiss: 8000,
    }
  );
}

export function createGoalMilestoneNotification(goalName: string, percentage: number, onNavigate?: (tab: string) => void): Notification {
  return createNotification(
    "action",
    "Goal Milestone",
    `You're ${percentage}% to your "${goalName}" goal! Keep it up!`,
    {
      actionLabel: "View Goals",
      actionTab: "goals",
      autoDismiss: 10000,
    }
  );
}


